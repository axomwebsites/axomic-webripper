(function(){
  function escapehtml(str){
    return str.replace(/[&<>]/g, m=>m==='&'?'&amp;':m==='<'?'&lt;':'&gt;');
  }
  function gettextcolor(ctx, x, y, w, h){
    try{
      if(x<0||y<0||x+w>ctx.canvas.width||y+h>ctx.canvas.height) return '#000000';
      let imgdata = ctx.getImageData(x, y, w, h);
      let data = imgdata.data;
      let r=0,g=0,b=0,count=0;
      for(let i=0;i<data.length;i+=4){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++; }
      if(count===0) return '#000000';
      let bright = (r/count + g/count + b/count) / 3;
      return bright < 128 ? '#ffffff' : '#000000';
    } catch(e){ return '#000000'; }
  }
  function preprocessforocr(canvas){
    let ctx = canvas.getContext('2d');
    let imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imgdata.data;
    for(let i=0;i<data.length;i+=4){
      let gray = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
      let contrast = gray > 128 ? 255 : 0;
      data[i] = contrast; data[i+1] = contrast; data[i+2] = contrast;
    }
    ctx.putImageData(imgdata, 0, 0);
    return canvas;
  }
  async function reconstructfromfile(file){
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = async () => {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let width = img.width, height = img.height;
        let maxdim = 2000;
        if(width>maxdim){ height = height*maxdim/width; width = maxdim; }
        if(height>maxdim){ width = width*maxdim/height; height = maxdim; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        let datastr = canvas.toDataURL('image/png');
        let proc = document.createElement('canvas');
        proc.width = width; proc.height = height;
        let pctx = proc.getContext('2d');
        pctx.drawImage(canvas, 0, 0);
        preprocessforocr(proc);
        let worker = await Tesseract.createWorker('eng');
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        let ocrresult = await worker.recognize(proc);
        await worker.terminate();
        let words = ocrresult.data.words || [];
        let textitems = [];
        for(let w of words){
          if(w.bbox && w.text && w.confidence>30){
            let x0 = w.bbox.x0 / width, y0 = w.bbox.y0 / height;
            let x1 = w.bbox.x1 / width, y1 = w.bbox.y1 / height;
            let boxw = x1 - x0, boxh = y1 - y0;
            if(boxw>0.002 && boxh>0.002){
              let wordcolor = gettextcolor(ctx, Math.floor(w.bbox.x0), Math.floor(w.bbox.y0),
                Math.max(1, Math.ceil(w.bbox.x1-w.bbox.x0)), Math.max(1, Math.ceil(w.bbox.y1-w.bbox.y0)));
              textitems.push({
                text: w.text,
                left: x0*100, top: y0*100,
                width: boxw*100, height: boxh*100,
                color: wordcolor,
                fontsize: Math.max(8, Math.min(36, boxh*80))
              });
            }
          }
        }
        let texthtml = '';
        for(let t of textitems){
          texthtml += `<div style="position:absolute; left:${t.left}%; top:${t.top}%; width:${t.width}%; height:${t.height}%; color:${t.color}; font-family:system-ui; font-size:${t.fontsize}px; font-weight:500; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; white-space:pre-wrap; word-break:break-word; text-shadow:0 0 2px rgba(0,0,0,0.4); pointer-events:none; z-index:10;">${escapehtml(t.text)}</div>`;
        }
        let final = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>pixel perfect</title>
<style>body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:1rem;}.container{position:relative;max-width:100%;max-height:100vh;box-shadow:0 8px 32px rgba(0,0,0,0.15);border-radius:0.8rem;overflow:hidden;background:white;}.container img{display:block;width:100%;height:auto;}.textlayer{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;}</style>
</head><body><div class="container"><img src="${datastr}"><div class="textlayer">${texthtml}</div></div></body></html>`;
        resolve(final);
      };
      img.onerror = ()=>reject(new Error('image load failed'));
      img.src = URL.createObjectURL(file);
    });
  }
  window.imagecloneprocess = async function(){
    let files = document.getElementById('imagefileinput').files;
    if(!files || files.length===0){
      window.app.showerror('select at least one image');
      return;
    }
    window.app.showloading();
    try{
      let results = [];
      for(let f of files){
        let html = await reconstructfromfile(f);
        results.push(html);
      }
      if(results.length===1){
        window.app.setcurrenthtml(results[0], null);
      } else {
        let combined = results.map((h,i)=>`<div style="margin-bottom:2rem;"><h3>image ${i+1}</h3>${h}</div>`).join('');
        let full = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>multiple images</title><style>body{background:#eef2f5;padding:1rem;}</style></head><body>${combined}</body></html>`;
        window.app.setcurrenthtml(full, null);
      }
    } catch(err){
      window.app.showerror('reconstruction failed: '+err.message);
    }
  };
})();
