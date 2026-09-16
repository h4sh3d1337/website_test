(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const typedEl = document.getElementById('typed');
  const cur1 = document.getElementById('cur1');
  const listing = document.getElementById('listing');
  const line2 = document.getElementById('line2');
  const cmd = 'ls -la ./';

  function reveal(){
    listing.hidden = false;
    line2.hidden = false;
    cur1.style.display = 'none';
  }

  if(reduceMotion){
    typedEl.textContent = cmd;
    reveal();
  } else {
    let i = 0;
    (function type(){
      if(i < cmd.length){
        typedEl.textContent += cmd[i];
        i++;
        setTimeout(type, 28);
      } else {
        setTimeout(reveal, 200);
      }
    })();
  }
})();
