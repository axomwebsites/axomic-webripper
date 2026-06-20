(function(){
  window.linkcloneprocess = async function(){
    let url = document.getElementById('websiteurl').value.trim();
    if(!url){
      window.app.showerror('enter a valid website link');
      return;
    }
    if(!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    let method = document.getElementById('methodselect').value;
    window.app.showloading();
    let settings = window.settings ? window.settings.get() : { proxy: '', headers: {}, cookies: {} };
    try{
      let html = await window.assetclone.clonefullsite(url, settings, method);
      window.app.setcurrenthtml(html, url);
    } catch(err){
      window.app.showerror('clone failed: ' + err.message);
    }
  };
})();
