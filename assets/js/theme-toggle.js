(function(){
  const btn = document.getElementById('theme-toggle');
  if(!btn) return;
  const label = document.getElementById('theme-toggle-label');

  function isLight(){
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function sync(){
    const light = isLight();
    btn.setAttribute('aria-pressed', String(light));
    label.textContent = light ? 'light' : 'dark';
  }

  btn.addEventListener('click', function(){
    const goingLight = !isLight();
    if(goingLight) document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    try{ localStorage.setItem('mmr-theme', goingLight ? 'light' : 'dark'); }catch(e){}
    sync();
  });

  sync();
})();
