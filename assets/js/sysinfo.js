(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#$%&01アカムン';

  // Decrypt-style reveal: characters flicker through the scramble set, then
  // lock in left-to-right, one at a time — classic terminal decode effect.
  function scrambleTo(el, finalText, charStepMs){
    charStepMs = charStepMs || 26;
    return new Promise(resolve=>{
      if(reduceMotion){ el.textContent = finalText; resolve(); return; }
      const len = finalText.length;
      const startTime = performance.now();
      const totalDuration = len * charStepMs + 90;
      el.classList.add('scramble-active');
      (function frame(now){
        const elapsed = now - startTime;
        const revealed = Math.floor(elapsed / charStepMs);
        let out = '';
        for(let i=0;i<len;i++){
          const ch = finalText[i];
          if(i < revealed || ch === ' '){
            out += ch;
          } else {
            out += SCRAMBLE_CHARS[(Math.random()*SCRAMBLE_CHARS.length)|0];
          }
        }
        el.textContent = out;
        if(elapsed < totalDuration){
          requestAnimationFrame(frame);
        } else {
          el.textContent = finalText;
          el.classList.remove('scramble-active');
          resolve();
        }
      })(performance.now());
    });
  }

  function setHandleFinal(el){
    el.textContent = '';
    el.appendChild(document.createTextNode('MM'));
    const r = document.createElement('span');
    r.className = 'mirror';
    r.textContent = 'R';
    el.appendChild(r);
  }

  // ---------- boot: type ./usr/bin/whoami, then decrypt-reveal the identity ----------
  const cmdEl = document.getElementById('si-cmd');
  const curEl = document.getElementById('si-cur');
  const outputEl = document.getElementById('si-output');
  const handleEl = document.getElementById('si-handle');
  const tagEl = document.getElementById('si-tag');
  const statusEl = document.getElementById('si-status');
  const ipEl = document.getElementById('si-ip');

  async function revealOutput(){
    if(!outputEl) return;
    outputEl.hidden = false;
    if(curEl) curEl.style.display = 'none';

    if(!handleEl) return;

    if(reduceMotion){
      setHandleFinal(handleEl);
      if(tagEl) tagEl.textContent = 'hacking enthusiast';
      if(statusEl) statusEl.textContent = 'SECURE_CONNECTION_ESTABLISHED';
      return;
    }

    await scrambleTo(handleEl, 'MMR', 34);
    setHandleFinal(handleEl);
    if(tagEl) await scrambleTo(tagEl, 'hacking enthusiast', 20);
    if(statusEl) await scrambleTo(statusEl, 'SECURE_CONNECTION_ESTABLISHED', 14);
  }

  if(cmdEl){
    const text = './usr/bin/whoami';
    if(reduceMotion){
      cmdEl.textContent = text;
      revealOutput();
    } else {
      let i = 0;
      (function step(){
        if(i < text.length){
          cmdEl.textContent += text[i];
          i++;
          setTimeout(step, 30);
        } else {
          setTimeout(revealOutput, 200);
        }
      })();
    }
  }

  // ---------- ip resolution — decrypt-reveals whenever it resolves ----------
  // Cloudflare exposes this same-origin on any site proxied through it — no
  // third-party request, no CORS, works fine under a strict CSP. Falls back
  // to a public IP-echo API if it's not available (e.g. not served through
  // Cloudflare).
  if(ipEl){
    function setIp(value){ scrambleTo(ipEl, value, 22); }
    fetch('/cdn-cgi/trace')
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(text => {
        const match = text.match(/^ip=(.+)$/m);
        if(match) setIp(match[1]); else throw new Error('no ip in trace');
      })
      .catch(() => {
        fetch('https://api.ipify.org?format=json')
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => setIp(data.ip || 'unavailable'))
          .catch(() => setIp('unavailable'));
      });
  }

  // ---------- whoami popup (temporary, triggered from the context menu) ----------
  const popEl = document.getElementById('whoami-pop');
  let popTimer = null;

  function runWhoami(){
    if(!popEl) return;
    clearTimeout(popTimer);
    popEl.hidden = false;
    void popEl.offsetWidth; // restart the transition if triggered again mid-animation
    popEl.classList.add('is-visible');
    popTimer = setTimeout(()=>{
      popEl.classList.remove('is-visible');
      setTimeout(()=>{ popEl.hidden = true; }, 300);
    }, 3200);
  }

  // ---------- custom context menu ----------
  let menu = null;

  function closeMenu(){
    if(menu){ menu.remove(); menu = null; }
    document.removeEventListener('click', closeMenu);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e){
    if(e.key === 'Escape') closeMenu();
  }

  function addItem(container, label, onClick){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      onClick();
      closeMenu();
    });
    container.appendChild(btn);
  }

  document.addEventListener('contextmenu', (e)=>{
    e.preventDefault();
    closeMenu();

    menu = document.createElement('div');
    menu.className = 'ctxmenu';

    const label = document.createElement('div');
    label.className = 'ctx-label';
    label.textContent = 'mmr://context';
    menu.appendChild(label);

    addItem(menu, 'run whoami', runWhoami);

    const hr = document.createElement('hr');
    menu.appendChild(hr);

    addItem(menu, 'reload', ()=> location.reload());

    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    menu.style.left = Math.max(8, Math.min(e.clientX, maxX)) + 'px';
    menu.style.top = Math.max(8, Math.min(e.clientY, maxY)) + 'px';

    setTimeout(()=>{
      document.addEventListener('click', closeMenu);
      document.addEventListener('keydown', onKey);
    }, 0);
  });
})();
