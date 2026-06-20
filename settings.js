(function(){
  let settings = {
    proxy: '',
    headers: {},
    cookies: {}
  };
  function load(){
    let stored = localStorage.getItem('axomicsettings');
    if(stored){
      try{
        let parsed = JSON.parse(stored);
        settings = Object.assign(settings, parsed);
      } catch(e){}
    }
    let proxyinput = document.getElementById('proxyinput');
    let headersinput = document.getElementById('headersinput');
    let cookiesinput = document.getElementById('cookiesinput');
    if(proxyinput) proxyinput.value = settings.proxy || '';
    if(headersinput) headersinput.value = JSON.stringify(settings.headers || {}, null, 2);
    if(cookiesinput) cookiesinput.value = JSON.stringify(settings.cookies || {}, null, 2);
  }
  function save(newsettings){
    settings = Object.assign(settings, newsettings);
    localStorage.setItem('axomicsettings', JSON.stringify(settings));
  }
  function get(){ return settings; }
  window.settings = { load, save, get };
})();
