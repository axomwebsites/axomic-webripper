(function(){
  let history = [];
  function init(){
    let stored = localStorage.getItem('axomichistory');
    if(stored) history = JSON.parse(stored);
  }
  function add(url, html){
    let entry = { url, html, timestamp: Date.now() };
    history.unshift(entry);
    if(history.length>50) history.pop();
    localStorage.setItem('axomichistory', JSON.stringify(history));
  }
  function clear(){
    history = [];
    localStorage.removeItem('axomichistory');
  }
  function render(listelement){
    listelement.innerHTML = '';
    for(let entry of history){
      let li = document.createElement('li');
      li.textContent = entry.url + ' ('+new Date(entry.timestamp).toLocaleString()+')';
      li.addEventListener('click', ()=>{
        window.app.setcurrenthtml(entry.html, entry.url);
        document.getElementById('historypanel').style.display = 'none';
      });
      listelement.appendChild(li);
    }
  }
  window.history = { init, add, clear, render };
})();
