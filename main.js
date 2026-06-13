(function(){
  function init(){
    let currentmode = 'link';
    let currenthtml = '';
    let currentview = 'preview';

    let linkmodebtn = document.getElementById('linkmodebtn');
    let imagemodebtn = document.getElementById('imagemodebtn');
    let linkpanel = document.getElementById('linkpanel');
    let imagepanel = document.getElementById('imagepanel');
    let outputzone = document.getElementById('outputzone');
    let executelinkcopy = document.getElementById('executelinkcopy');
    let executeimageextract = document.getElementById('executeimageextract');
    let copyoutputbtn = document.getElementById('copyoutputbtn');
    let previewoutputbtn = document.getElementById('previewoutputbtn');
    let previewviewbtn = document.getElementById('previewviewbtn');
    let codeviewbtn = document.getElementById('codeviewbtn');

    function setmode(mode){
      currentmode = mode;
      if(mode === 'link'){
        linkmodebtn.classList.add('active');
        imagemodebtn.classList.remove('active');
        linkpanel.style.display = 'flex';
        imagepanel.style.display = 'none';
      } else {
        imagemodebtn.classList.add('active');
        linkmodebtn.classList.remove('active');
        linkpanel.style.display = 'none';
        imagepanel.style.display = 'flex';
      }
      outputzone.innerHTML = '<div class="infomessage">ready for ' + mode + ' mode</div>';
      currenthtml = '';
      currentview = 'preview';
      previewviewbtn.classList.add('activeview');
      codeviewbtn.classList.remove('activeview');
    }

    linkmodebtn.addEventListener('click', () => setmode('link'));
    imagemodebtn.addEventListener('click', () => setmode('images'));

    function showerror(msg){
      outputzone.innerHTML = '<div class="infomessage" style="color:#b91c1c;">error: ' + msg + '</div>';
      currenthtml = '';
    }

    function showloading(){
      outputzone.innerHTML = '<div class="infomessage">processing, please wait...</div>';
    }

    function rendercurrentview(){
      if(!currenthtml){
        outputzone.innerHTML = '<div class="infomessage">no content available, run copy first</div>';
        return;
      }
      if(currentview === 'preview'){
        let iframeraw = document.createElement('iframe');
        iframeraw.srcdoc = currenthtml;
        iframeraw.style.width = '100%';
        iframeraw.style.height = '520px';
        iframeraw.style.border = 'none';
        iframeraw.style.borderRadius = '0.8rem';
        outputzone.innerHTML = '';
        outputzone.appendChild(iframeraw);
      } else {
        let codeblock = document.createElement('pre');
        codeblock.className = 'codeblock';
        codeblock.textContent = currenthtml;
        outputzone.innerHTML = '';
        outputzone.appendChild(codeblock);
      }
    }

    function setview(view){
      currentview = view;
      if(view === 'preview'){
        previewviewbtn.classList.add('activeview');
        codeviewbtn.classList.remove('activeview');
      } else {
        codeviewbtn.classList.add('activeview');
        previewviewbtn.classList.remove('activeview');
      }
      if(currenthtml){
        rendercurrentview();
      }
    }

    function copyoutput(){
      if(!currenthtml){
        showerror('nothing to copy, run copy operation first');
        return;
      }
      navigator.clipboard.writeText(currenthtml).then(() => {
        let msg = document.createElement('div');
        msg.style.position = 'fixed';
        msg.style.bottom = '20px';
        msg.style.right = '20px';
        msg.style.backgroundColor = '#1e3a5f';
        msg.style.color = 'white';
        msg.style.padding = '10px 18px';
        msg.style.borderRadius = '40px';
        msg.style.fontSize = '0.85rem';
        msg.innerText = 'copied to clipboard';
        document.body.appendChild(msg);
        setTimeout(()=>msg.remove(), 2000);
      }).catch(()=>showerror('copy failed'));
    }

    function previewoutput(){
      if(!currenthtml){
        showerror('no content to preview');
        return;
      }
      let win = window.open();
      if(win){
        win.document.write(currenthtml);
        win.document.close();
      } else {
        showerror('popup blocked, allow popups for preview');
      }
    }

    window.app = {
      setcurrenthtml: function(html){
        currenthtml = html;
        rendercurrentview();
      },
      showerror: showerror,
      showloading: showloading
    };

    executelinkcopy.addEventListener('click', () => { if(currentmode === 'link') window.linkcloneprocess(); });
    executeimageextract.addEventListener('click', () => { if(currentmode === 'images') window.imagecloneprocess(); });
    copyoutputbtn.addEventListener('click', copyoutput);
    previewoutputbtn.addEventListener('click', previewoutput);
    previewviewbtn.addEventListener('click', () => setview('preview'));
    codeviewbtn.addEventListener('click', () => setview('code'));

    setmode('link');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
