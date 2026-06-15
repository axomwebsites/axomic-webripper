(function(){
  function getaveragecolor(ctx, x, y, w, h){
    let imgdata = ctx.getImageData(x, y, w, h);
    let data = imgdata.data;
    let r=0,g=0,b=0,count=0;
    for(let i=0;i<data.length;i+=4){
      r+=data[i];
      g+=data[i+1];
      b+=data[i+2];
      count++;
    }
    if(count===0) return 'rgb(128,128,128)';
    return `rgb(${Math.floor(r/count)},${Math.floor(g/count)},${Math.floor(b/count)})`;
  }

  function detectgradient(ctx, w, h){
    let left = ctx.getImageData(0, h/2, 1, 1).data;
    let right = ctx.getImageData(w-1, h/2, 1, 1).data;
    let top = ctx.getImageData(w/2, 0, 1, 1).data;
    let bottom = ctx.getImageData(w/2, h-1, 1, 1).data;
    let horizdiff = Math.abs(left[0]-right[0])+Math.abs(left[1]-right[1])+Math.abs(left[2]-right[2]);
    let vertdiff = Math.abs(top[0]-bottom[0])+Math.abs(top[1]-bottom[1])+Math.abs(top[2]-bottom[2]);
    if(horizdiff>50) return `linear-gradient(90deg, rgb(${left[0]},${left[1]},${left[2]}), rgb(${right[0]},${right[1]},${right[2]}))`;
    if(vertdiff>50) return `linear-gradient(0deg, rgb(${top[0]},${top[1]},${top[2]}), rgb(${bottom[0]},${bottom[1]},${bottom[2]}))`;
    return null;
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
      for(let i=0;i<data.length;i+=4){
        rsum+=data[i]; gsum+=data[i+1]; bsum+=data[i+2]; n++;
      }
      let rmean=rsum/n, gmean=gsum/n, bmean=bsum/n;
      let variance=0;
      for(let i=0;i<data.length;i+=4){
        let dr=data[i]-rmean;
        let dg=data[i+1]-gmean;
        let db=data[i+2]-bmean;
        variance+=dr*dr+dg*dg+db*db;
      }
      variance = variance/(n*3);
      if(variance < variancethr){
        let avgcol = `rgb(${Math.floor(rmean)},${Math.floor(gmean)},${Math.floor(bsum/n)})`;
        blocks.push({x:x/width, y:y/height, w:w/width, h:h/height, color:avgcol});
        return;
      }
      let halfw = Math.floor(w/2);
      let halfh = Math.floor(h/2);
      if(halfw>0 && halfh>0) split(x, y, halfw, halfh, depth+1);
      if(w-halfw>0 && halfh>0) split(x+halfw, y, w-halfw, halfh, depth+1);
      if(halfw>0 && h-halfh>0) split(x, y+halfh, halfw, h-halfh, depth+1);
      if(w-halfw>0 && h-halfh>0) split(x+halfw, y+halfh, w-halfw, h-halfh, depth+1);
    }
    split(0, 0, width, height, 0);
    return blocks;
  }

  function escapehtml(str){
    return str.replace(/[&<>]/g, function(m){
      if(m==='&') return '&amp;';
      if(m==='<') return '&lt;';
      if(m==='>') return '&gt;';
      return m;
    });
  }

  async function reconstructfromimage(file){
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = async () => {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let width = img.width;
        let height = img.height;
        let maxdim = 1400;
        if(width>maxdim){
          height = (height*maxdim)/width;
          width = maxdim;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        let gradient = detectgradient(ctx, width, height);
        let backgroundcolor = getaveragecolor(ctx, 0, 0, width, height);
        let blocks = quadtreeblocks(ctx, width, height, 7, 550);
        let worker = await Tesseract.createWorker('eng');
        let ocrresult = await worker.recognize(canvas);
        await worker.terminate();
        let words = ocrresult.data.words || [];
        let textitems = [];
        for(let w of words){
          if(w.bbox && w.text && w.confidence>35){
            let x0 = w.bbox.x0 / width;
            let y0 = w.bbox.y0 / height;
            let x1 = w.bbox.x1 / width;
            let y1 = w.bbox.y1 / height;
            let boxw = x1 - x0;
            let boxh = y1 - y0;
            if(boxw>0.005 && boxh>0.005){
              let wordcolor = '#000000';
              try{
                let wordx = Math.floor(w.bbox.x0);
                let wordy = Math.floor(w.bbox.y0);
                let wordw = Math.max(2, Math.ceil(w.bbox.x1 - w.bbox.x0));
                let wordh = Math.max(2, Math.ceil(w.bbox.y1 - w.bbox.y0));
                if(wordx>=0 && wordy>=0 && wordx+wordw<=width && wordy+wordh<=height){
                  let avgcol = getaveragecolor(ctx, wordx, wordy, wordw, wordh);
                  let match = avgcol.match(/rgb\((\d+),(\d+),(\d+)\)/);
                  if(match){
                    let bright = (parseInt(match[1])+parseInt(match[2])+parseInt(match[3]))/3;
                    wordcolor = bright < 128 ? '#ffffff' : '#000000';
                  }
                }
              } catch(e){}
              textitems.push({
                text: w.text,
                left: x0*100,
                top: y0*100,
                width: boxw*100,
                height: boxh*100,
                color: wordcolor,
                fontsize: Math.max(10, Math.min(34, boxh*70))
              });
            }
          }
        }
        let blockshtml = '';
        for(let b of blocks){
          blockshtml += `<div style="position:absolute; left:${b.x*100}%; top:${b.y*100}%; width:${b.w*100}%; height:${b.h*100}%; background:${b.color}; border:0.5px solid rgba(0,0,0,0.05); box-sizing:border-box;"></div>`;
        }
        let texthtml = '';
        for(let t of textitems){
          texthtml += `<div style="position:absolute; left:${t.left}%; top:${t.top}%; width:${t.width}%; height:${t.height}%; color:${t.color}; font-family:system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif; font-size:${t.fontsize}px; font-weight:normal; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; white-space:pre-wrap; word-break:break-word; text-shadow:0 0 1px rgba(0,0,0,0.2); z-index:10;">${escapehtml(t.text)}</div>`;
        }
        let bgstyle = gradient ? `background: ${gradient};` : `background: ${backgroundcolor};`;
        let final = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>reconstructed website</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { ${bgstyle} width:100%; min-height:100vh; position:relative; margin:0; }
.blockslayer { position:relative; width:100%; min-height:100vh; }
.textlayer { position:absolute; top:0; left:0; width:100%; min-height:100vh; pointer-events:none; }
</style>
</head>
<body>
<div class="blockslayer">
${blockshtml}
</div>
<div class="textlayer">
${texthtml}
</div>
</body>
</html>`;
        resolve(final);
      };
      img.onerror = () => reject(new Error('image load error'));
      img.src = URL.createObjectURL(file);
    });
  }

  window.imagecloneprocess = async function(){
    let fileinput = document.getElementById('imagefileinput');
    let file = fileinput.files[0];
    if(!file){
      window.app.showerror('please select one screenshot image');
      return;
    }
    window.app.showloading();
    try{
      let generated = await reconstructfromimage(file);
      window.app.setcurrenthtml(generated, null);
    } catch(err){
      console.error(err);
      window.app.showerror('clone failed: ' + err.message);
    }
  };
})();
