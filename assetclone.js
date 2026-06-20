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

  async function fetchwithfallback(url, settings){
    if(settings.proxy && settings.proxy.trim()!==''){
      let finalurl = settings.proxy + encodeURIComponent(url);
      let headers = settings.headers || {};
      let resp = await fetch(finalurl, { headers });
      if(window.scanner) window.scanner.addrequest(url, resp.status);
      if(!resp.ok) throw new Error('fetch failed for '+url);
      return await resp.text();
    }
    for(let i=0; i<proxylist.length; i++){
      try{
        let html = await proxylist[i](url);
        if(html && html.length > 100) return html;
      } catch(e){ continue; }
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

  function applymethod(html, method){
    if(method==='A') return html;
    if(method==='B') return html.replace(/<div/g,'<section').replace(/<\/div>/g,'</section>');
    if(method==='C') return html.replace(/<p/g,'<div').replace(/<\/p>/g,'</div>');
    if(method==='D') return html.replace(/class="([^"]*)"/g,'style="border:1px solid red;"');
    return html;
  }

  async function clonefullsite(url, settings, method){
    let html = await fetchwithfallback(url, settings);
    let doc = new DOMParser().parseFromString(html, 'text/html');
    let base = doc.createElement('base');
    base.setAttribute('href', url);
    doc.head.prepend(base);
    let imgs = Array.from(doc.querySelectorAll('img'));
    let styles = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    let scripts = Array.from(doc.querySelectorAll('script[src]'));
    let fontlinks = Array.from(doc.querySelectorAll('link[href*="fonts.googleapis.com"]'));
    let allstyles = Array.from(doc.querySelectorAll('[style]'));

    await Promise.all(imgs.map(async (img) => {
      if(img.src && !img.src.startsWith('data:')){
        try{
          let absurl = new URL(img.src, url).href;
          let blob = await fetchblob(absurl, settings);
          let b64 = await getbase64(blob);
          img.src = b64;
        } catch(e){}
      }
    }));

    await Promise.all(styles.map(async (link) => {
      if(link.href){
        try{
          let absurl = new URL(link.href, url).href;
          let css = await fetchwithfallback(absurl, settings);
          let style = doc.createElement('style');
          style.textContent = css;
          link.replaceWith(style);
        } catch(e){}
      }
    }));

    await Promise.all(scripts.map(async (scr) => {
      if(scr.src){
        try{
          let absurl = new URL(scr.src, url).href;
          let js = await fetchwithfallback(absurl, settings);
          let newscr = doc.createElement('script');
          newscr.textContent = js;
          scr.replaceWith(newscr);
        } catch(e){}
      }
    }));

    await Promise.all(fontlinks.map(async (link) => {
      try{
        let absurl = new URL(link.href, url).href;
        let css = await fetchwithfallback(absurl, settings);
        let style = doc.createElement('style');
        style.textContent = css;
        link.replaceWith(style);
      } catch(e){}
    }));

    await Promise.all(allstyles.map(async (el) => {
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
    }));

    let raw = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
    return applymethod(raw, method);
  }

  window.assetclone = { clonefullsite, applymethod };
})();
