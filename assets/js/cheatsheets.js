(function(){
  const tracksEl = document.getElementById('cs-tracks');
  const introEl = document.getElementById('cs-intro');
  const catlistEl = document.getElementById('cs-catlist');
  const clearEl = document.getElementById('cs-clear');
  const cardsEl = document.getElementById('cs-cards');
  const pageEl = document.getElementById('cs-pagination');
  const searchEl = document.getElementById('cs-search');
  const countEl = document.getElementById('cs-count');
  const PAGE_SIZE = 24;
  let currentPage = 1;
  const catHeadEl = document.getElementById('cs-cat-head');
  const decoderBtn = document.getElementById('cs-decoder-btn');
  const browserView = document.getElementById('cs-browser');
  const decoderView = document.getElementById('cs-decoder');
  const ptVarsEl = document.getElementById('pt-vars');
  const bbVarsEl = document.getElementById('bb-vars');

  let activeTrack = 'bugbounty';
  const activeCats = new Set();

  // ---------- shared target variables (IP / Domain / DC / User / Pass / Hash) ----------
  // Only IP starts with a default — everything else stays blank until you fill it
  // in, and an unfilled {TOKEN} is left visible in the command rather than
  // silently vanishing, so it's obvious what still needs a real value.
  const VARS = { IP: '10.10.10.10', DOMAIN: '', DC: '', USER: '', PASS: '', HASH: '' };
  function substituteVars(code){
    return code.replace(/\{(IP|DOMAIN|DC|USER|PASS|HASH)\}/g, (_, k) => VARS[k] || ('{' + k + '}'));
  }
  [ptVarsEl, bbVarsEl].forEach(container => {
    container.querySelectorAll('input[data-var]').forEach(input => {
      const key = input.dataset.var;
      input.value = VARS[key];
      input.addEventListener('input', () => {
        VARS[key] = input.value;
        // keep every field showing this var in sync (DOMAIN is shared across both bars)
        document.querySelectorAll(`input[data-var="${key}"]`).forEach(i => { if(i !== input) i.value = input.value; });
        renderCards();
      });
    });
  });

  function showBrowser(){
    decoderView.hidden = true;
    browserView.hidden = false;
    catHeadEl.hidden = false;
    catlistEl.hidden = false;
    decoderBtn.classList.remove('is-active');
    renderTracks();
  }

  function showDecoder(){
    browserView.hidden = true;
    decoderView.hidden = false;
    catHeadEl.hidden = true;
    catlistEl.hidden = true;
    ptVarsEl.hidden = true;
    bbVarsEl.hidden = true;
    decoderBtn.classList.add('is-active');
    tracksEl.querySelectorAll('.cs-track').forEach(b => b.classList.remove('is-active'));
  }

  decoderBtn.addEventListener('click', showDecoder);

  function cardsInTrack(track){
    return CS_CARDS.filter(c => c.track === track);
  }

  function renderTracks(){
    tracksEl.textContent = '';
    Object.keys(CS_TRACKS).forEach(key=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cs-track' + (key === activeTrack ? ' is-active' : '');
      btn.textContent = CS_TRACKS[key].label + ' (' + cardsInTrack(key).length + ')';
      btn.addEventListener('click', ()=>{
        const trackChanged = activeTrack !== key;
        activeTrack = key;
        showBrowser();
        if(trackChanged){
          activeCats.clear();
          searchEl.value = '';
          currentPage = 1;
          renderCategories();
        }
        renderCards();
      });
      tracksEl.appendChild(btn);
    });
    introEl.textContent = CS_TRACKS[activeTrack].intro;
    ptVarsEl.hidden = activeTrack !== 'pentesting';
    bbVarsEl.hidden = activeTrack !== 'bugbounty';
  }

  function renderCategories(){
    catlistEl.textContent = '';
    const inTrack = cardsInTrack(activeTrack);
    CS_TRACKS[activeTrack].categories.forEach(cat=>{
      const n = inTrack.filter(c => c.cat === cat.id).length;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cs-cat-item' + (activeCats.has(cat.id) ? ' is-active' : '');
      const label = document.createElement('span');
      label.textContent = cat.label;
      const cnt = document.createElement('span');
      cnt.className = 'cnt';
      cnt.textContent = n;
      item.append(label, cnt);
      item.addEventListener('click', ()=>{
        if(activeCats.has(cat.id)) activeCats.delete(cat.id);
        else activeCats.add(cat.id);
        currentPage = 1;
        renderCategories();
        renderCards();
      });
      catlistEl.appendChild(item);
    });
    clearEl.hidden = activeCats.size === 0;
  }

  clearEl.addEventListener('click', ()=>{
    activeCats.clear();
    currentPage = 1;
    renderCategories();
    renderCards();
  });

  function matchesSearch(card, q){
    if(!q) return true;
    const hay = (card.title + ' ' + card.code + ' ' + card.note).toLowerCase();
    return hay.includes(q);
  }

  function catLabel(id){
    const found = CS_TRACKS[activeTrack].categories.find(c => c.id === id);
    return found ? found.label : id;
  }

  function buildCard(card){
    const el = document.createElement('article');
    el.className = 'card';

    const head = document.createElement('div');
    head.className = 'card-head';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = catLabel(card.cat);
    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = card.title;
    head.append(badge, title);

    const resolvedCode = substituteVars(card.code);

    const codeRow = document.createElement('div');
    codeRow.className = 'card-code-row';
    const codeEl = document.createElement('code');
    codeEl.textContent = resolvedCode;
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'copy';
    copyBtn.addEventListener('click', ()=>{
      navigator.clipboard?.writeText(resolvedCode).catch(()=>{});
      copyBtn.textContent = 'copied ✓';
      copyBtn.classList.add('is-copied');
      setTimeout(()=>{ copyBtn.textContent = 'copy'; copyBtn.classList.remove('is-copied'); }, 1000);
    });
    codeRow.append(codeEl, copyBtn);

    const note = document.createElement('p');
    note.className = 'card-note';
    note.textContent = card.note;

    el.append(head, codeRow, note);
    return el;
  }

  function renderPagination(total){
    pageEl.textContent = '';
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if(pageCount <= 1) return;

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'cs-page-btn';
    prev.textContent = '‹ prev';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', ()=>{ currentPage--; renderCards(); cardsEl.scrollIntoView({block:'start'}); });

    const status = document.createElement('span');
    status.className = 'cs-page-status';
    status.textContent = 'page ' + currentPage + ' / ' + pageCount;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'cs-page-btn';
    next.textContent = 'next ›';
    next.disabled = currentPage >= pageCount;
    next.addEventListener('click', ()=>{ currentPage++; renderCards(); cardsEl.scrollIntoView({block:'start'}); });

    pageEl.append(prev, status, next);
  }

  function renderCards(){
    const q = searchEl.value.trim().toLowerCase();
    const list = cardsInTrack(activeTrack).filter(c =>
      (activeCats.size === 0 || activeCats.has(c.cat)) &&
      matchesSearch(c, q)
    );

    const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if(currentPage > pageCount) currentPage = pageCount;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    cardsEl.textContent = '';
    if(list.length === 0){
      const empty = document.createElement('p');
      empty.className = 'cs-empty';
      empty.textContent = 'no payloads match that filter.';
      cardsEl.appendChild(empty);
    } else {
      pageItems.forEach(c => cardsEl.appendChild(buildCard(c)));
    }
    countEl.textContent = list.length + ' result' + (list.length === 1 ? '' : 's');
    renderPagination(list.length);
  }

  searchEl.addEventListener('input', ()=>{
    currentPage = 1;
    renderCards();
  });

  // ---------- deep link from the home search (?track=...&cat=...&q=...) ----------
  const params = new URLSearchParams(location.search);
  const linkedTrack = params.get('track');
  if(linkedTrack && CS_TRACKS[linkedTrack]) activeTrack = linkedTrack;
  const linkedCat = params.get('cat');
  if(linkedCat) activeCats.add(linkedCat);
  const linkedQuery = params.get('q');
  if(linkedQuery) searchEl.value = linkedQuery;

  renderTracks();
  renderCategories();
  renderCards();
})();
