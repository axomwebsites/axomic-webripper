(function(){
  function minifycode(html){
    return html.replace(/\s{2,}/g,' ').replace(/\n/g,'').replace(/<!--[\s\S]*?-->/g,'');
  }
  function beautifycode(html){
    try{
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, 'text/html');
      let serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch(e){ return html; }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    let minifybtn = document.getElementById('minifybtn');
    let beautifybtn = document.getElementById('beautifybtn');
    let editor = document.getElementById('codeeditor');
    if(minifybtn){
      minifybtn.addEventListener('click', ()=>{
        let val = editor.value;
        editor.value = minifycode(val);
        window.app.setcurrenthtml(editor.value, null);
      });
    }
    if(beautifybtn){
      beautifybtn.addEventListener('click', ()=>{
        let val = editor.value;
        editor.value = beautifycode(val);
        window.app.setcurrenthtml(editor.value, null);
      });
    }
  });
})();
