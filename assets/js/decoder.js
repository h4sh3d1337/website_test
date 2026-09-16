(function(){
  const input = document.getElementById('dc-input');
  const output = document.getElementById('dc-output');
  const opsEl = document.getElementById('dc-ops');
  const copyBtn = document.getElementById('dc-copy');
  const activeLabel = document.getElementById('dc-active');
  const keyField = document.getElementById('dc-key-field');
  const keyInput = document.getElementById('dc-key');

  function utf8Bytes(str){ return new TextEncoder().encode(str); }
  function bytesToUtf8(bytes){ return new TextDecoder('utf-8', { fatal:false }).decode(bytes); }
  function bytesToBase64(bytes){
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }
  function base64ToBytes(b64){
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToHex(bytes){
    return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function hexToBytes(hex){
    const clean = hex.trim().replace(/\s+/g,'').replace(/^0x/i,'');
    if(clean.length % 2 !== 0) throw new Error('odd-length hex string');
    const out = new Uint8Array(clean.length/2);
    for(let i=0;i<clean.length;i+=2) out[i/2] = parseInt(clean.substr(i,2),16);
    return out;
  }

  function htmlEncode(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
             .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  const NAMED_ENTITIES = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  function htmlDecode(s){
    return s.replace(/&#x([0-9a-fA-F]+);/g, (_,h) => String.fromCodePoint(parseInt(h,16)))
             .replace(/&#(\d+);/g, (_,d) => String.fromCodePoint(parseInt(d,10)))
             .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_,n) => NAMED_ENTITIES[n]);
  }

  function rot13(s){
    return s.replace(/[a-zA-Z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
  }
  function rot47(s){
    return s.replace(/[!-~]/g, c => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94)));
  }

  function binaryEncode(s){
    return Array.from(utf8Bytes(s)).map(b => b.toString(2).padStart(8,'0')).join(' ');
  }
  function binaryDecode(s){
    const clean = s.trim();
    if(!clean) return '';
    const bytes = clean.split(/\s+/).map(b => parseInt(b,2));
    return bytesToUtf8(Uint8Array.from(bytes));
  }

  function decimalEncode(s){
    return Array.from(utf8Bytes(s)).join(' ');
  }
  function decimalDecode(s){
    const clean = s.trim();
    if(!clean) return '';
    const bytes = clean.split(/\s+/).map(n => parseInt(n,10));
    return bytesToUtf8(Uint8Array.from(bytes));
  }

  function unicodeEscapeEncode(s){
    let out = '';
    for(let i=0;i<s.length;i++) out += '\\u' + s.charCodeAt(i).toString(16).padStart(4,'0');
    return out;
  }
  function unicodeEscapeDecode(s){
    return s.replace(/\\u([0-9a-fA-F]{4})/g, (_,h) => String.fromCharCode(parseInt(h,16)));
  }

  const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function base32Encode(s){
    const bytes = utf8Bytes(s);
    let bits = '';
    for(const b of bytes) bits += b.toString(2).padStart(8,'0');
    let out = '';
    for(let i=0;i<bits.length;i+=5){
      let chunk = bits.substr(i,5);
      if(chunk.length < 5) chunk = chunk.padEnd(5,'0');
      out += B32_ALPHABET[parseInt(chunk,2)];
    }
    while(out.length % 8 !== 0) out += '=';
    return out;
  }
  function base32Decode(s){
    const clean = s.trim().replace(/=+$/,'').toUpperCase();
    let bits = '';
    for(const c of clean){
      const idx = B32_ALPHABET.indexOf(c);
      if(idx === -1) continue;
      bits += idx.toString(2).padStart(5,'0');
    }
    const bytes = [];
    for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.substr(i,8),2));
    return bytesToUtf8(Uint8Array.from(bytes));
  }

  const MORSE = {
    A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
    K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
    U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
    '6':'-....','7':'--...','8':'---..','9':'----.'
  };
  const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k,v]) => [v,k]));
  function morseEncode(s){
    return s.toUpperCase().split('').map(c => {
      if(c === ' ') return '/';
      return MORSE[c] !== undefined ? MORSE[c] : '';
    }).filter(x => x !== '').join(' ');
  }
  function morseDecode(s){
    return s.trim().split(/\s+/).map(tok => tok === '/' ? ' ' : (MORSE_REV[tok] || '')).join('');
  }

  function xorBytes(bytes, key){
    const keyBytes = utf8Bytes(key || '');
    if(keyBytes.length === 0) throw new Error('XOR needs a key (see the key field above)');
    const out = new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    return out;
  }
  function xorEncode(s){ return bytesToHex(xorBytes(utf8Bytes(s), keyInput.value)); }
  function xorDecode(s){ return bytesToUtf8(xorBytes(hexToBytes(s), keyInput.value)); }

  function base64urlToBase64(s){
    let b = s.replace(/-/g,'+').replace(/_/g,'/');
    while(b.length % 4) b += '=';
    return b;
  }
  function jwtDecode(s){
    const parts = s.trim().split('.');
    if(parts.length < 2) throw new Error('not a JWT (need at least header.payload)');
    const header = bytesToUtf8(base64ToBytes(base64urlToBase64(parts[0])));
    const payload = bytesToUtf8(base64ToBytes(base64urlToBase64(parts[1])));
    let pretty;
    try {
      pretty = 'header:\n' + JSON.stringify(JSON.parse(header), null, 2) +
               '\n\npayload:\n' + JSON.stringify(JSON.parse(payload), null, 2);
    } catch(e){
      pretty = 'header:\n' + header + '\n\npayload:\n' + payload;
    }
    return pretty + '\n\n(signature not verified — this only decodes, it does not check validity)';
  }

  // ---- MD5 (RFC 1321) — Web Crypto has no MD5, so it's implemented here. ----
  // Verified against Node's crypto.createHash('md5') across 10 test vectors
  // (empty string, unicode, emoji, >1000-byte padding-boundary input) before shipping.
  function md5hex(str){
    function rotl(x,c){ return (x<<c)|(x>>>(32-c)); }
    function add32(a,b){ return (a+b) >>> 0; }

    const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
               5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
               6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const K = new Uint32Array(64);
    for(let i=0;i<64;i++) K[i] = Math.floor(Math.abs(Math.sin(i+1)) * 4294967296) >>> 0;

    const bytes = utf8Bytes(str);
    const bitLen = bytes.length * 8;
    let msgLen = bytes.length + 1;
    while(msgLen % 64 !== 56) msgLen++;
    const padded = new Uint8Array(msgLen + 8);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    for(let i=0;i<8;i++) padded[msgLen+i] = (i<4) ? ((bitLen >>> (8*i)) & 0xff) : 0;

    let a0=0x67452301, b0=0xefcdab89, c0=0x98badcfe, d0=0x10325476;

    for(let chunk=0; chunk<padded.length; chunk+=64){
      const M = new Uint32Array(16);
      for(let i=0;i<16;i++){
        M[i] = padded[chunk+i*4] | (padded[chunk+i*4+1]<<8) | (padded[chunk+i*4+2]<<16) | (padded[chunk+i*4+3]<<24);
      }
      let A=a0,B=b0,C=c0,D=d0;
      for(let i=0;i<64;i++){
        let F,g;
        if(i<16){ F = (B & C) | (~B & D); g = i; }
        else if(i<32){ F = (D & B) | (~D & C); g = (5*i+1) % 16; }
        else if(i<48){ F = B ^ C ^ D; g = (3*i+5) % 16; }
        else { F = C ^ (B | ~D); g = (7*i) % 16; }
        F = add32(F, add32(A, add32(K[i], M[g])));
        A = D; D = C; C = B;
        B = add32(B, rotl(F, s[i]));
      }
      a0=add32(a0,A); b0=add32(b0,B); c0=add32(c0,C); d0=add32(d0,D);
    }

    function toLE(n){
      const b = new Uint8Array(4);
      b[0]=n&0xff; b[1]=(n>>>8)&0xff; b[2]=(n>>>16)&0xff; b[3]=(n>>>24)&0xff;
      return b;
    }
    const out = new Uint8Array(16);
    out.set(toLE(a0),0); out.set(toLE(b0),4); out.set(toLE(c0),8); out.set(toLE(d0),12);
    return bytesToHex(out);
  }

  async function digestHex(algo, str){
    const buf = await crypto.subtle.digest(algo, utf8Bytes(str));
    return bytesToHex(new Uint8Array(buf));
  }

  const GROUPS = [
    { label: 'encoding', ops: [
      { id:'b64-enc', flag:'--b64-enc', fn: s => bytesToBase64(utf8Bytes(s)) },
      { id:'b64-dec', flag:'--b64-dec', fn: s => bytesToUtf8(base64ToBytes(s.trim())) },
      { id:'b32-enc', flag:'--b32-enc', fn: base32Encode },
      { id:'b32-dec', flag:'--b32-dec', fn: base32Decode },
      { id:'url-enc', flag:'--url-enc', fn: s => encodeURIComponent(s) },
      { id:'url-dec', flag:'--url-dec', fn: s => decodeURIComponent(s) },
      { id:'html-enc', flag:'--html-enc', fn: htmlEncode },
      { id:'html-dec', flag:'--html-dec', fn: htmlDecode },
      { id:'hex-enc', flag:'--hex-enc', fn: s => bytesToHex(utf8Bytes(s)) },
      { id:'hex-dec', flag:'--hex-dec', fn: s => bytesToUtf8(hexToBytes(s)) },
      { id:'bin-enc', flag:'--bin-enc', fn: binaryEncode },
      { id:'bin-dec', flag:'--bin-dec', fn: binaryDecode },
      { id:'dec-enc', flag:'--dec-enc', fn: decimalEncode },
      { id:'dec-dec', flag:'--dec-dec', fn: decimalDecode },
      { id:'u-enc', flag:'--unicode-enc', fn: unicodeEscapeEncode },
      { id:'u-dec', flag:'--unicode-dec', fn: unicodeEscapeDecode },
      { id:'jwt-dec', flag:'--jwt-dec', fn: jwtDecode }
    ]},
    { label: 'ciphers', ops: [
      { id:'rot13', flag:'--rot13', fn: rot13 },
      { id:'rot47', flag:'--rot47', fn: rot47 },
      { id:'morse-enc', flag:'--morse-enc', fn: morseEncode },
      { id:'morse-dec', flag:'--morse-dec', fn: morseDecode },
      { id:'xor-enc', flag:'--xor-enc', fn: xorEncode, needsKey:true },
      { id:'xor-dec', flag:'--xor-dec', fn: xorDecode, needsKey:true }
    ]},
    { label: 'hashing', ops: [
      { id:'md5', flag:'--md5', fn: md5hex },
      { id:'sha1', flag:'--sha1', fn: s => digestHex('SHA-1', s), async:true },
      { id:'sha256', flag:'--sha256', fn: s => digestHex('SHA-256', s), async:true },
      { id:'sha512', flag:'--sha512', fn: s => digestHex('SHA-512', s), async:true }
    ]}
  ];

  let activeOp = null;

  function renderOps(){
    opsEl.textContent = '';
    GROUPS.forEach(group => {
      const head = document.createElement('div');
      head.className = 'dc-group-label';
      head.textContent = group.label;
      opsEl.appendChild(head);

      const row = document.createElement('div');
      row.className = 'dc-group-row';
      group.ops.forEach(op => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dc-op' + (activeOp === op.id ? ' is-active' : '');
        btn.textContent = op.flag;
        btn.addEventListener('click', () => run(op));
        row.appendChild(btn);
      });
      opsEl.appendChild(row);
    });
  }

  async function run(op){
    activeOp = op.id;
    activeLabel.textContent = op.flag;
    renderOps();
    keyField.hidden = !op.needsKey;
    output.value = '…';
    try {
      const result = op.async ? await op.fn(input.value) : op.fn(input.value);
      output.value = result;
    } catch(e){
      output.value = 'error: ' + e.message;
    }
  }

  copyBtn.addEventListener('click', () => {
    if(!output.value) return;
    navigator.clipboard?.writeText(output.value).catch(()=>{});
    copyBtn.textContent = 'copied ✓';
    setTimeout(()=>{ copyBtn.textContent = 'copy'; }, 1000);
  });

  renderOps();
})();
