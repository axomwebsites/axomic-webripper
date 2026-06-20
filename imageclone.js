(function(){
  function escapehtml(str){
    return str.replace(/[&<>]/g, m=>m==='&'?'&amp;':m==='<'?'&lt;':'&gt;');
  }
  function getaveragecolor(ctx, x, y, w, h){
    let imgdata = ctx.getImageData(x, y, w, h);
    let data = imgdata.data;
    let r=0,g=0,b=0,count=0;
    for(let i=0;i<data.length;i+=4){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++; }
    if(count===0) return 'rgb(128,128,128)';
    return `rgb(${Math.floor(r/count)},${Math.floor(g/count)},${Math.floor(b/count)})`;
  }
  function quadtreeblocks(ctx, width, height, maxdepth, variancethr){
    let blocks = [];
    function split(x, y, w, h, depth){
      if(w<=12 || h<=12 || depth>=maxdepth){
        let avgcol = getaveragecolor(ctx, x, y, w, h);
        blocks.push({x:x/width, y:y/height, w:w/width, h:h/height, color:avgcol});
        return;
      }
      let regiondata = ctx.getImageData(x, y, w, h);
      let data = regiondata.data;
      let rsum=0,gsum=0,bsum=0,n=0;
      for(let i=0;i<data.length;i+=4){ rsum+=data[i]; gsum+=data[i+1]; bsum+=data[i+2]; n++; }
      let rmean=rsum/n, gmean=gsum/n, bmean=bsum/n;
      let variance=0;
      for(let i=0;i<data.length;i+=4){
        let dr=data[i]-rmean, dg=data[i+1]-gmean, db=data[i+2]-bmean;
        variance+=dr*dr+dg*dg+db*db;
      }
      variance = variance/(n*3);
      if(variance < variancethr){
        let avgcol = `rgb(${Math.floor(rmean)},${Math.floor(gmean)},${Math.floor(bsum/n)})`;
        blocks.push({x:x/width, y:y/height, w:w/width, h:h/height, color:avgcol});
        return;
      }
      let halfw = Math.floor(w/2), halfh = Math.floor(h/2);
      if(halfw>0 && halfh>0) split(x, y, halfw, halfh, depth+1);
      if(w-halfw>0 && halfh>0) split(x+halfw, y, w-halfw, halfh, depth+1);
      if(halfw>0 && h-halfh>0) split(x, y+halfh, halfw, h-halfh, depth+1);
      if(w-halfw>0 && h-halfh>0) split(x+halfw, y+halfh, w-halfw, h-halfh, depth+1);
    }
    split(0, 0, width, height, 0);
    return blocks;
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
        let maxdim = 1400;
        if(width>maxdim){ height = height*maxdim/width; width = maxdim; }
        if(height>maxdim){ width = width*maxdim/height; height = maxdim; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        let blocks = quadtreeblocks(ctx, width, height, 6, 600);
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
        let textgroups = [];
        for(let w of words){
          if(w.bbox && w.text && w.confidence>30){
            let x0 = w.bbox.x0 / width, y0 = w.bbox.y0 / height;
            let x1 = w.bbox.x1 / width, y1 = w.bbox.y1 / height;
            let boxw = x1 - x0, boxh = y1 - y0;
            if(boxw>0.002 && boxh>0.002){
              let avgcol = getaveragecolor(ctx, Math.floor(w.bbox.x0), Math.floor(w.bbox.y0),
                Math.max(1, Math.ceil(w.bbox.x1-w.bbox.x0)), Math.max(1, Math.ceil(w.bbox.y1-w.bbox.y0)));
              let match = avgcol.match(/rgb\((\d+),(\d+),(\d+)\)/);
              let bright = match ? (parseInt(match[1])+parseInt(match[2])+parseInt(match[3]))/3 : 128;
              textgroups.push({
                text: w.text,
                left: x0*100, top: y0*100,
                width: boxw*100, height: boxh*100,
                color: bright < 128 ? '#ffffff' : '#000000',
                fontsize: Math.max(10, Math.min(32, boxh*70))
              });
            }
          }
        }
        let blockhtml = blocks.map(b =>
          `<div style="position:absolute; left:${b.x*100}%; top:${b.y*100}%; width:${b.w*100}%; height:${b.h*100}%; background:${b.color}; border:0.3px solid rgba(0,0,0,0.05); box-sizing:border-box;"></div>`
        ).join('');
        let texthtml = textgroups.map(t =>
          `<div style="position:absolute; left:${t.left}%; top:${t.top}%; width:${t.width}%; height:${t.height}%; color:${t.color}; font-family:system-ui; font-size:${t.fontsize}px; font-weight:500; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; white-space:pre-wrap; word-break:break-word; text-shadow:0 0 1px rgba(0,0,0,0.3); z-index:10;">${escapehtml(t.text)}</div>`
        ).join('');
        let final = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>reconstructed website</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { position:relative; width:100%; min-height:100vh; background:#f0f2f5; }
.container { position:relative; width:100%; min-height:100vh; overflow:hidden; }
</style>
</head><body><div class="container">${blockhtml}${texthtml}</div></body></html>`;
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
