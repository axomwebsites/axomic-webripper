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

  async function fetchwithproxy(url, settings){
    let finalurl = url;
    if(settings.proxy && settings.proxy.trim()!==''){
      finalurl = settings.proxy + encodeURIComponent(url);
    }
    let headers = settings.headers || {};
    let resp = await fetch(finalurl, { headers });
    if(window.scanner) window.scanner.addrequest(url, resp.status);
    if(!resp.ok) throw new Error('fetch failed for '+url);
    let content = await resp.text();
    return content;
  }

  async function fetchwithfallback(url, settings){
    if(settings.proxy && settings.proxy.trim()!==''){
      return await fetchwithproxy(url, settings);
    }
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

  async function fetchblob(url, settings){
    let finalurl = url;
    if(settings.proxy && settings.proxy.trim()!==''){
      finalurl = settings.proxy + encodeURIComponent(url);
    }
    let headers = settings.headers || {};
    let resp = await fetch(finalurl, { headers });
    if(window.scanner) window.scanner.addrequest(url, resp.status);
    if(!resp.ok) throw new Error('fetch blob failed');
    return await resp.blob();
  }

  function getbase64(blob){
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = ()=>resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function clonefullsite(url, settings){
    let html = await fetchwithfallback(url, settings);
    let doc = new DOMParser().parseFromString(html, 'text/html');
    let base = doc.createElement('base');
    base.setAttribute('href', url);
    doc.head.prepend(base);
    let imgs = doc.querySelectorAll('img');
    for(let img of imgs){
      if(img.src && !img.src.startsWith('data:')){
        try{
          let absurl = new URL(img.src, url).href;
          let blob = await fetchblob(absurl, settings);
          let b64 = await getbase64(blob);
          img.src = b64;
        } catch(e){}
      }
    }
    let styles = doc.querySelectorAll('link[rel="stylesheet"]');
    for(let link of styles){
      if(link.href){
        try{
          let absurl = new URL(link.href, url).href;
          let css = await fetchwithfallback(absurl, settings);
          let style = doc.createElement('style');
          style.textContent = css;
          link.replaceWith(style);
        } catch(e){}
      }
    }
    let scripts = doc.querySelectorAll('script[src]');
    for(let scr of scripts){
      if(scr.src){
        try{
          let absurl = new URL(scr.src, url).href;
          let js = await fetchwithfallback(absurl, settings);
          let newscr = doc.createElement('script');
          newscr.textContent = js;
          scr.replaceWith(newscr);
        } catch(e){}
      }
    }
    let fontlinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"]');
    for(let link of fontlinks){
      try{
        let absurl = new URL(link.href, url).href;
        let css = await fetchwithfallback(absurl, settings);
        let style = doc.createElement('style');
        style.textContent = css;
        link.replaceWith(style);
      } catch(e){}
    }
    let allstyles = doc.querySelectorAll('[style]');
    for(let el of allstyles){
      let style = el.getAttribute('style');
      let urls = style.match(/url\(['"]?([^'"()]+)['"]?\)/g);
      if(urls){
        for(let u of urls){
          let match = u.match(/url\(['"]?([^'"()]+)['"]?\)/);
          if(match){
            let rawurl = match[1];
            try{
              let absurl = new URL(rawurl, url).href;
              let blob = await fetchblob(absurl, settings);
              let b64 = await getbase64(blob);
              style = style.replace(rawurl, b64);
            } catch(e){}
          }
        }
        el.setAttribute('style', style);
      }
    }
    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  window.assetclone = { clonefullsite };
})();
