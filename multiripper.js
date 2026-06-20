(function(){
  function generateMethodA(html){ return html; }
  function generateMethodB(html){ return html.replace(/<div/g,'<section').replace(/<\/div>/g,'</section>'); }
  function generateMethodC(html){ return html.replace(/<p/g,'<div').replace(/<\/p>/g,'</div>'); }
  function generateMethodD(html){ return html.replace(/class="([^"]*)"/g,'style="border:1px solid red;"'); }
  function presentResults(results, type){
    let container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:1rem;';
    let labels = ['A','B','C','D'];
    for(let i=0; i<results.length; i++){
      let card = document.createElement('div');
      card.style.cssText = 'flex:1;min-width:200px;border:1px solid #ccc;padding:0.5rem;border-radius:0.5rem;cursor:pointer;background:#fafafa;';
      card.innerHTML = `<h4>method ${labels[i]}</h4><iframe srcdoc="${escapehtml(results[i])}" style="width:100%;height:200px;border:none;background:white;"></iframe>`;
      card.addEventListener('click', ()=>{
        window.app.setcurrenthtml(results[i], null);
        alert('selected method '+labels[i]);
      });
      container.appendChild(card);
    }
    let wrapper = document.createElement('div');
    wrapper.innerHTML = `<div style="padding:1rem;font-weight:bold;">click a card to use that version</div>`;
    wrapper.appendChild(container);
    return wrapper.innerHTML;
  }
  function escapehtml(str){ return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.multiripper = {
    link: async function(){
      window.app.showloading();
      let url = document.getElementById('websiteurl').value.trim();
      if(!url){ window.app.showerror('enter url'); return; }
      if(!url.startsWith('http')) url = 'https://'+url;
      let settings = window.settings ? window.settings.get() : { proxy:'', headers:{} };
      try{
        let base;
        if(window.assetclone && typeof window.assetclone.clonefullsite === 'function'){
          base = await window.assetclone.clonefullsite(url, settings);
        } else {
          window.app.showerror('assetclone not available');
          return;
        }
        let results = [
          generateMethodA(base),
          generateMethodB(base),
          generateMethodC(base),
          generateMethodD(base)
        ];
        let html = '<!doctype html><html><head><meta charset="utf-8"><title>multi results</title></head><body>'+presentResults(results,'link')+'</body></html>';
        window.app.setcurrenthtml(html, url);
      } catch(e){ window.app.showerror('multi link failed: '+e.message); }
    },
    image: async function(){
      window.app.showloading();
      let files = document.getElementById('imagefileinput').files;
      if(!files || files.length===0){ window.app.showerror('select images'); return; }
      try{
        let results = [];
        for(let f of files){
          let base = await window.imageclone.reconstructfromfile(f);
          results.push([
            generateMethodA(base),
            generateMethodB(base),
            generateMethodC(base),
            generateMethodD(base)
          ]);
        }
        let combined = results.map((arr, idx) => `<div><h3>image ${idx+1}</h3>${presentResults(arr,'image')}</div>`).join('');
        let html = '<!doctype html><html><head><meta charset="utf-8"><title>multi image results</title></head><body>'+combined+'</body></html>';
        window.app.setcurrenthtml(html, null);
      } catch(e){ window.app.showerror('multi image failed: '+e.message); }
    }
  };
})();
