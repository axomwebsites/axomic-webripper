(function(){
  function minifycode(html){
    try{
      return htmlMinifier.minify(html, { collapseWhitespace: true, removeComments: true });
    } catch(e){ return html; }
  }
  function beautifycode(html){
    try{
      return html_beautify(html, { indent_size: 2 });
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
