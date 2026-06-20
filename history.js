(function(){
  let historydata = [];
  function init(){
    let stored = localStorage.getItem('axomichistory');
    if(stored) historydata = JSON.parse(stored);
  }
  function add(url, html){
    let entry = { url, html, timestamp: Date.now() };
    historydata.unshift(entry);
    if(historydata.length>50) historydata.pop();
    localStorage.setItem('axomichistory', JSON.stringify(historydata));
  }
  function clear(){
    historydata = [];
    localStorage.removeItem('axomichistory');
  }
  function render(listelement){
    listelement.innerHTML = '';
    for(let entry of historydata){
      let li = document.createElement('li');
      li.textContent = entry.url + ' ('+new Date(entry.timestamp).toLocaleString()+')';
      li.addEventListener('click', ()=>{
        window.app.setcurrenthtml(entry.html, entry.url);
        document.getElementById('historypanel').style.display = 'none';
      });
      listelement.appendChild(li);
    }
  }
  window.clonehistory = { init, add, clear, render };
})();
