(function(){
  let db = null;
  const DBNAME = 'axomiccache';
  const STORE = 'requests';
  function opendb(){
    return new Promise((resolve, reject) => {
      let req = indexedDB.open(DBNAME, 1);
      req.onupgradeneeded = (e)=>{
        let d = e.target.result;
        if(!d.objectStoreNames.contains(STORE)){
          d.createObjectStore(STORE, {keyPath:'url'});
        }
      };
      req.onsuccess = (e)=>{ db = e.target.result; resolve(db); };
      req.onerror = (e)=>reject(e.target.error);
    });
  }
  async function getcached(url){
    if(!db) await opendb();
    return new Promise((resolve, reject) => {
      let tx = db.transaction(STORE, 'readonly');
      let store = tx.objectStore(STORE);
      let req = store.get(url);
      req.onsuccess = ()=>resolve(req.result ? req.result.data : null);
      req.onerror = ()=>resolve(null);
    });
  }
  async function setcache(url, data){
    if(!db) await opendb();
    return new Promise((resolve, reject) => {
      let tx = db.transaction(STORE, 'readwrite');
      let store = tx.objectStore(STORE);
      store.put({url, data, timestamp: Date.now()});
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  }
  async function clearcache(){
    if(!db) await opendb();
    return new Promise((resolve, reject) => {
      let tx = db.transaction(STORE, 'readwrite');
      let store = tx.objectStore(STORE);
      store.clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  }
  window.cache = { getcached, setcache, clearcache };
})();
