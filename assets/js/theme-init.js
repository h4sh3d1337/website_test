(function(){
  try{
    if(localStorage.getItem('mmr-theme') === 'light'){
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }catch(e){}
})();
