(function(){
  const input = document.getElementById('home-search');
  const results = document.getElementById('home-results');
  if(!input || !results || typeof SITE_LINKS === 'undefined') return;

  // Flatten the compact grouped cheatsheets index into individual searchable
  // entries once, so the search loop below stays a simple flat filter.
  const index = SITE_LINKS.map(e => ({
    label: e.label, desc: e.desc, href: e.href, source: e.source, external: true
  }));
  (typeof SITE_CS_GROUPS !== 'undefined' ? SITE_CS_GROUPS : []).forEach(group => {
    group.titles.forEach(title => {
      index.push({
        label: title,
        desc: group.label,
        href: 'cheatsheets.html?track=' + group.track + '&cat=' + group.cat + '&q=' + encodeURIComponent(title),
        source: 'cheatsheets',
        external: false
      });
    });
    // also let the bare category name itself be a search hit
    index.push({
      label: group.label,
      desc: (group.track === 'bugbounty' ? 'Bug Bounty' : 'Pentesting') + ' category in ./cheatsheets',
      href: 'cheatsheets.html?track=' + group.track + '&cat=' + group.cat,
      source: 'cheatsheets',
      external: false
    });
  });

  function buildRow(entry){
    const a = document.createElement('a');
    a.className = 'row';
    a.href = entry.href;
    if(entry.external){
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }

    const tag = document.createElement('span');
    tag.className = 'perm';
    tag.textContent = '[' + entry.source + ']';

    const sep1 = document.createElement('span');
    sep1.className = 'sep2';

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.label;

    const sep2 = document.createElement('span');
    sep2.className = 'sep2';

    const desc = document.createElement('span');
    desc.className = 'desc';
    desc.textContent = '# ' + entry.desc;

    a.append(tag, sep1, name, sep2, desc);
    return a;
  }

  function render(){
    const q = input.value.trim().toLowerCase();
    results.textContent = '';
    if(!q) return;

    const matches = index.filter(e =>
      e.label.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)
    ).slice(0, 12);

    if(matches.length === 0){
      const p = document.createElement('p');
      p.className = 'total';
      p.textContent = 'no matches.';
      results.appendChild(p);
      return;
    }

    matches.forEach(e => results.appendChild(buildRow(e)));
  }

  input.addEventListener('input', render);
})();
