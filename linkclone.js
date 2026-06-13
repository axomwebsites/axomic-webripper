(function(){
  let proxylist = [
    async (url) => {
      let proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      let resp = await fetch(proxy);
      if(!resp.ok) throw new Error('allorigins failed');
      return await resp.text();
    },
    async (url) => {
      let proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
      let resp = await fetch(proxy);
      if(!resp.ok) throw new Error('corsproxy.io failed');
      return await resp.text();
    },
    async (url) => {
      let proxy = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url);
      let resp = await fetch(proxy);
      if(!resp.ok) throw new Error('codetabs failed');
      return await resp.text();
    },
    async (url) => {
      let proxy = 'https://thingproxy.freeboard.io/fetch/' + encodeURIComponent(url);
      let resp = await fetch(proxy);
      if(!resp.ok) throw new Error('thingproxy failed');
      return await resp.text();
    },
    async (url) => {
      let proxy = 'https://cors-anywhere.herokuapp.com/' + url;
      let resp = await fetch(proxy);
      if(!resp.ok) throw new Error('corsanywhere failed');
      return await resp.text();
    }
  ];

  async function fetchwithfallback(url){
    for(let i=0; i<proxylist.length; i++){
      try{
        let html = await proxylist[i](url);
        if(html && html.length > 100) return html;
      } catch(e){
        continue;
      }
    }
    throw new Error('all proxy methods failed');
  }

  function repairhtmlkeepjs(htmlstring, baseurl){
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlstring, 'text/html');
    let base = doc.createElement('base');
    base.setAttribute('href', baseurl);
    doc.head.prepend(base);
    let allimages = doc.querySelectorAll('img');
    for(let img of allimages){
      if(img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')){
        try{
          new URL(img.src);
        } catch(e){
          if(img.getAttribute('src')) img.src = new URL(img.getAttribute('src'), baseurl).href;
        }
      }
    }
    let stylelinks = doc.querySelectorAll('link[rel="stylesheet"]');
    for(let link of stylelinks){
      if(link.href){
        try{
          new URL(link.href);
        } catch(e){
          if(link.getAttribute('href')) link.href = new URL(link.getAttribute('href'), baseurl).href;
        }
      }
    }
    let allscripts = doc.querySelectorAll('script');
    for(let script of allscripts){
      if(script.src){
        try{
          new URL(script.src);
        } catch(e){
          if(script.getAttribute('src')) script.src = new URL(script.getAttribute('src'), baseurl).href;
        }
      }
    }
    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  window.linkcloneprocess = async function(){
    let url = document.getElementById('websiteurl').value.trim();
    if(!url){
      window.app.showerror('enter a valid website link');
      return;
    }
    if(!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    window.app.showloading();
    try{
      let rawhtml = await fetchwithfallback(url);
      let fixedhtml = repairhtmlkeepjs(rawhtml, url);
      window.app.setcurrenthtml(fixedhtml);
    } catch(err){
      window.app.showerror('copy failed after multiple attempts: ' + err.message);
    }
  };
})();
