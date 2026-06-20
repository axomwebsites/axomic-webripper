(function(){
  let currentmode = 'link';
  let currenthtml = '';
  let currentview = 'preview';
  const elements = {
    linkmodebtn: document.getElementById('linkmodebtn'),
    imagemodebtn: document.getElementById('imagemodebtn'),
    linkpanel: document.getElementById('linkpanel'),
    imagepanel: document.getElementById('imagepanel'),
    outputzone: document.getElementById('outputzone'),
    executelinkcopy: document.getElementById('executelinkcopy'),
    executeimageextract: document.getElementById('executeimageextract'),
    copyoutputbtn: document.getElementById('copyoutputbtn'),
    previewoutputbtn: document.getElementById('previewoutputbtn'),
    previewviewbtn: document.getElementById('previewviewbtn'),
    codeviewbtn: document.getElementById('codeviewbtn'),
    editorviewbtn: document.getElementById('editorviewbtn'),
    sharezone: document.getElementById('sharezone'),
    sharelinkinput: document.getElementById('sharelinkinput'),
    copysharebtn: document.getElementById('copysharebtn'),
    darkmodebtn: document.getElementById('darkmodebtn'),
    historytogglebtn: document.getElementById('historytogglebtn'),
    settingstogglebtn: document.getElementById('settingstogglebtn'),
    historypanel: document.getElementById('historypanel'),
    closehistorybtn: document.getElementById('closehistorybtn'),
    advancedoptions: document.getElementById('advancedoptions'),
    proxyinput: document.getElementById('proxyinput'),
    headersinput: document.getElementById('headersinput'),
    cookiesinput: document.getElementById('cookiesinput'),
    saveadvancedbtn: document.getElementById('saveadvancedbtn'),
    exportbtn: document.getElementById('exportbtn'),
    deploybtn: document.getElementById('deploybtn'),
    historylist: document.getElementById('historylist'),
    clearhistorybtn: document.getElementById('clearhistorybtn'),
    codeeditor: document.getElementById('codeeditor'),
    minifybtn: document.getElementById('minifybtn'),
    beautifybtn: document.getElementById('beautifybtn'),
    linecount: document.getElementById('linecount'),
    rippermode: document.getElementById('rippermode'),
    exportmodal: document.getElementById('exportmodal'),
    closemodalbtn: document.getElementById('closemodalbtn'),
    confirmexportbtn: document.getElementById('confirmexportbtn'),
    cancelexportbtn: document.getElementById('cancelexportbtn')
  };
  function setmode(mode){
    currentmode = mode;
    if(mode==='link'){
      elements.linkmodebtn.classList.add('active');
      elements.imagemodebtn.classList.remove('active');
      elements.linkpanel.style.display = 'flex';
      elements.imagepanel.style.display = 'none';
    } else {
      elements.imagemodebtn.classList.add('active');
      elements.linkmodebtn.classList.remove('active');
      elements.linkpanel.style.display = 'none';
      elements.imagepanel.style.display = 'flex';
    }
    elements.outputzone.innerHTML = '<div class="infomessage">ready for '+mode+' mode</div>';
    currenthtml = '';
    currentview = 'preview';
    setview('preview');
  }
  elements.linkmodebtn.addEventListener('click', ()=>setmode('link'));
  elements.imagemodebtn.addEventListener('click', ()=>setmode('images'));
  function showerror(msg){
    elements.outputzone.innerHTML = '<div class="infomessage" style="color:#b91c1c;">error: '+msg+'</div>';
    currenthtml = '';
    elements.sharezone.style.display = 'none';
  }
  function showloading(){
    elements.outputzone.innerHTML = '<div class="infomessage">processing...</div>';
    elements.sharezone.style.display = 'none';
  }
  function setview(view){
    currentview = view;
    document.querySelectorAll('.togglebtn').forEach(b=>b.classList.remove('activeview'));
    if(view==='preview'){
      elements.previewviewbtn.classList.add('activeview');
      elements.outputzone.style.display = 'block';
      document.getElementById('editorcontainer').style.display = 'none';
    } else if(view==='code'){
      elements.codeviewbtn.classList.add('activeview');
      elements.outputzone.style.display = 'block';
      document.getElementById('editorcontainer').style.display = 'none';
    } else if(view==='editor'){
      elements.editorviewbtn.classList.add('activeview');
      elements.outputzone.style.display = 'none';
      document.getElementById('editorcontainer').style.display = 'block';
      if(currenthtml){
        elements.codeeditor.value = currenthtml;
        updateeditor();
      }
    }
    if(currenthtml && view!=='editor') rendercurrentview();
  }
  function rendercurrentview(){
    if(!currenthtml){
      elements.outputzone.innerHTML = '<div class="infomessage">no content</div>';
      return;
    }
    if(currentview==='preview'){
      let iframe = document.createElement('iframe');
      iframe.srcdoc = currenthtml;
      iframe.style.width = '100%';
      iframe.style.height = '520px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '0.8rem';
      elements.outputzone.innerHTML = '';
      elements.outputzone.appendChild(iframe);
    } else if(currentview==='code'){
      let codeblock = document.createElement('pre');
      codeblock.className = 'codeblock';
      codeblock.textContent = currenthtml;
      elements.outputzone.innerHTML = '';
      elements.outputzone.appendChild(codeblock);
    }
  }
  function updateeditor(){
    let val = elements.codeeditor.value;
    let lines = val.split('\n').length;
    elements.linecount.textContent = 'lines: '+lines;
  }
  elements.previewviewbtn.addEventListener('click', ()=>setview('preview'));
  elements.codeviewbtn.addEventListener('click', ()=>setview('code'));
  elements.editorviewbtn.addEventListener('click', ()=>setview('editor'));
  elements.codeeditor.addEventListener('input', updateeditor);
  window.app = {
    setcurrenthtml: function(html, sourceurl){
      currenthtml = html;
      if(currentview!=='editor') rendercurrentview();
      if(currentview==='editor'){
        elements.codeeditor.value = html;
        updateeditor();
      }
      if(sourceurl && sourceurl.trim()!==''){
        let baseurl = window.location.href.split('#')[0];
        let shareurl = baseurl + '#' + encodeURIComponent(sourceurl);
        elements.sharelinkinput.value = shareurl;
        elements.sharezone.style.display = 'flex';
        window.history.add(sourceurl, html);
      } else {
        elements.sharezone.style.display = 'none';
      }
    },
    showerror: showerror,
    showloading: showloading,
    getcurrenthtml: function(){ return currenthtml; }
  };
  elements.copyoutputbtn.addEventListener('click', ()=>{
    if(!currenthtml){ showerror('nothing to copy'); return; }
    navigator.clipboard.writeText(currenthtml).then(()=>{ alert('copied'); });
  });
  elements.previewoutputbtn.addEventListener('click', ()=>{
    if(!currenthtml){ showerror('no content'); return; }
    let win = window.open();
    if(win){ win.document.write(currenthtml); win.document.close(); }
    else showerror('popup blocked');
  });
  elements.executelinkcopy.addEventListener('click', ()=>{
    if(currentmode==='link') {
      if(elements.rippermode.value==='direct') window.linkcloneprocess();
      else window.multiripper.link();
    }
  });
  elements.executeimageextract.addEventListener('click', ()=>{
    if(currentmode==='images') {
      if(elements.rippermode.value==='direct') window.imagecloneprocess();
      else window.multiripper.image();
    }
  });
  let darkmode = localStorage.getItem('darkmode')==='true';
  function applytheme(){ document.body.classList.toggle('dark', darkmode); }
  elements.darkmodebtn.addEventListener('click', ()=>{
    darkmode = !darkmode;
    localStorage.setItem('darkmode', darkmode);
    applytheme();
  });
  applytheme();
  elements.historytogglebtn.addEventListener('click', ()=>{
    let panel = elements.historypanel;
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
    if(panel.style.display==='block') window.history.render(elements.historylist);
  });
  elements.closehistorybtn.addEventListener('click', ()=>{
    elements.historypanel.style.display = 'none';
  });
  elements.clearhistorybtn.addEventListener('click', ()=>{
    window.history.clear();
    elements.historypanel.style.display = 'none';
  });
  elements.settingstogglebtn.addEventListener('click', ()=>{
    let adv = elements.advancedoptions;
    adv.style.display = adv.style.display==='none' ? 'block' : 'none';
  });
  elements.saveadvancedbtn.addEventListener('click', ()=>{
    let proxy = elements.proxyinput.value.trim();
    let headers = {};
    let cookies = {};
    try{ headers = JSON.parse(elements.headersinput.value || '{}'); } catch(e){}
    try{ cookies = JSON.parse(elements.cookiesinput.value || '{}'); } catch(e){}
    window.settings.save({proxy, headers, cookies});
    alert('settings saved');
  });
  elements.exportbtn.addEventListener('click', ()=>{
    if(!currenthtml){ showerror('nothing to export'); return; }
    elements.exportmodal.style.display = 'flex';
  });
  elements.closemodalbtn.addEventListener('click', ()=>{
    elements.exportmodal.style.display = 'none';
  });
  elements.cancelexportbtn.addEventListener('click', ()=>{
    elements.exportmodal.style.display = 'none';
  });
  elements.confirmexportbtn.addEventListener('click', ()=>{
    let opt = document.querySelector('input[name="exportopt"]:checked');
    if(!opt) return;
    let val = opt.value;
    if(val==='html'){
      let blob = new Blob([currenthtml], {type:'text/html'});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'clone.html';
      a.click();
    } else if(val==='zip'){
      alert('zip export not fully implemented; use html and compress manually');
    } else if(val==='copy'){
      navigator.clipboard.writeText(currenthtml).then(()=>alert('copied'));
    } else if(val==='save'){
      let url = document.getElementById('websiteurl').value || 'unknown';
      window.history.add(url, currenthtml);
      alert('saved to history');
    }
    elements.exportmodal.style.display = 'none';
  });
  elements.deploybtn.addEventListener('click', ()=>{
    alert('deploy via netlify/vercel api not implemented');
  });
  document.addEventListener('DOMContentLoaded', ()=>{
    if(window.history) window.history.init();
  });
  if(window.settings) window.settings.load();
  setmode('link');
})();

function showScan(){
  let panel = document.getElementById('scanpanel');
  let html = window.app.getcurrenthtml();
  if(!html){ alert('no content to scan'); return; }
  let threats = window.scanner.scanforthreats(html);
  if(threats.length===0){
    panel.innerHTML = '<div style="color:green;">no threats detected</div>';
  } else {
    panel.innerHTML = '<div style="color:red;">'+threats.map(t=>'• '+t).join('<br>')+'</div>';
  }
  panel.style.display = 'block';
  document.getElementById('assetspanel').style.display = 'none';
  document.getElementById('logpanel').style.display = 'none';
}

function showAssets(){
  let panel = document.getElementById('assetspanel');
  let html = window.app.getcurrenthtml();
  if(!html){ alert('no content to analyze'); return; }
  let counts = window.scanner.countassets(html);
  panel.innerHTML = '<div>images: '+counts.images+'</div><div>stylesheets: '+counts.styles+'</div><div>scripts: '+counts.scripts+'</div><div>fonts: '+counts.fonts+'</div>';
  panel.style.display = 'block';
  document.getElementById('scanpanel').style.display = 'none';
  document.getElementById('logpanel').style.display = 'none';
}

function showLog(){
  let panel = document.getElementById('logpanel');
  let log = window.scanner.getlog();
  if(log.length===0){ panel.innerHTML = 'no requests logged'; }
  else {
    panel.innerHTML = log.map(entry=>entry.time+' '+entry.url+' ('+entry.status+')').join('<br>');
  }
  panel.style.display = 'block';
  document.getElementById('scanpanel').style.display = 'none';
  document.getElementById('assetspanel').style.display = 'none';
}

document.getElementById('scanbtn').addEventListener('click', showScan);
document.getElementById('assetsbtn').addEventListener('click', showAssets);
document.getElementById('logbtn').addEventListener('click', showLog);
