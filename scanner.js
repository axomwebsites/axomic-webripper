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
    if(external.length) threats.push(external.length+' external resources');
    return threats;
  }
  function countassets(html){
    let images = html.match(/<img[^>]*src=["']/gi) || [];
    let styles = html.match(/<link[^>]*rel=["']stylesheet["']/gi) || [];
    let scripts = html.match(/<script[^>]*src=["']/gi) || [];
    let fonts = html.match(/@font-face/gi) || [];
    return { images: images.length, styles: styles.length, scripts: scripts.length, fonts: fonts.length };
  }
  let requestlog = [];
  function addrequest(url, status){
    requestlog.push({url, status, time: new Date().toLocaleString()});
    if(requestlog.length>100) requestlog.shift();
  }
  function getlog(){ return requestlog; }
  window.scanner = { scanforthreats, countassets, addrequest, getlog };
})();
