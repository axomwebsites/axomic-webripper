(function(){
  function scanforthreats(html){
    let threats = [];
    let scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for(let s of scripts){
      if(s.match(/eval\s*\(/i)) threats.push('eval() usage detected');
      if(s.match(/document\.write\s*\(/i)) threats.push('document.write() usage');
      if(s.match(/innerHTML\s*=/i)) threats.push('innerHTML assignment');
      if(s.match(/src\s*=\s*['"]https?:\/\//i)) threats.push('external script source');
      if(s.match(/onerror\s*=/i)) threats.push('onerror handler');
      if(s.match(/onload\s*=/i)) threats.push('onload handler');
    }
    let external = html.match(/src\s*=\s*['"]https?:\/\/[^'"]+['"]/gi) || [];
    if(external.length) threats.push(external.length+' external resources found');
    return threats;
  }

  function getassets(html){
    let assets = [];
    let imgmatches = html.match(/<img[^>]*src=["']([^"']+)["']/gi) || [];
    for(let m of imgmatches){
      let src = m.match(/src=["']([^"']+)["']/);
      if(src) assets.push('image: '+src[1]);
    }
    let cssmatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi) || [];
    for(let m of cssmatches){
      let href = m.match(/href=["']([^"']+)["']/);
      if(href) assets.push('stylesheet: '+href[1]);
    }
    let scriptmatches = html.match(/<script[^>]*src=["']([^"']+)["']/gi) || [];
    for(let m of scriptmatches){
      let src = m.match(/src=["']([^"']+)["']/);
      if(src) assets.push('script: '+src[1]);
    }
    let fontmatches = html.match(/@font-face\s*{[^}]*}/gi) || [];
    for(let m of fontmatches){
      let url = m.match(/url\(["']?([^"')]+)["']?\)/);
      if(url) assets.push('font: '+url[1]);
    }
    return assets;
  }

  let requestlog = [];
  function addrequest(url, status){
    requestlog.push({url, status, time: new Date().toLocaleString()});
    if(requestlog.length>100) requestlog.shift();
  }
  function getlog(){ return requestlog; }
  window.scanner = { scanforthreats, getassets, addrequest, getlog };
})();
