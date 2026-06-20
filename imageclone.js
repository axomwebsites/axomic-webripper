(function(){
  function escapehtml(str){
    return str.replace(/[&<>]/g, function(m){
      if(m==='&') return '&amp;';
      if(m==='<') return '&lt;';
      if(m==='>') return '&gt;';
      return m;
    });
  }

  function getaveragecolor(ctx, x, y, w, h){
    let imgdata = ctx.getImageData(x, y, w, h);
    let data = imgdata.data;
    let r=0,g=0,b=0,count=0;
    for(let i=0;i<data.length;i+=4){
      r+=data[i]; g+=data[i+1]; b+=data[i+2];
      count++;
    }
    if(count===0) return [128,128,128];
    return [Math.floor(r/count), Math.floor(g/count), Math.floor(b/count)];
  }

  function rgbtohex(r,g,b){
    return '#' + [r,g,b].map(c=>c.toString(16).padStart(2,'0')).join('');
  }

  function getdominantcolors(ctx, width, height, count){
    let colorthief = new ColorThief();
    let palette = colorthief.getPalette(ctx.getImageData(0,0,width,height), count);
    return palette.map(c=>rgbtohex(c[0],c[1],c[2]));
  }

  function getcontrastratio(color1, color2){
    function luminance(r,g,b){
      let [rs,gs,bs] = [r,g,b].map(c=>c/255);
      let [rl,gl,bl] = [rs,gs,bs].map(c=>c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4));
      return 0.2126*rl + 0.7152*gl + 0.0722*bl;
    }
    let l1 = luminance(color1[0],color1[1],color1[2]);
    let l2 = luminance(color2[0],color2[1],color2[2]);
    let light = Math.max(l1,l2);
    let dark = Math.min(l1,l2);
    return (light+0.05)/(dark+0.05);
  }

  function detectgradient(ctx, width, height){
    let left = ctx.getImageData(0, height/2, 1, 1).data;
    let right = ctx.getImageData(width-1, height/2, 1, 1).data;
    let top = ctx.getImageData(width/2, 0, 1, 1).data;
    let bottom = ctx.getImageData(width/2, height-1, 1, 1).data;
    let horizdiff = Math.abs(left[0]-right[0])+Math.abs(left[1]-right[1])+Math.abs(left[2]-right[2]);
    let vertdiff = Math.abs(top[0]-bottom[0])+Math.abs(top[1]-bottom[1])+Math.abs(top[2]-bottom[2]);
    if(horizdiff>50){
      let lcol = rgbtohex(left[0],left[1],left[2]);
      let rcol = rgbtohex(right[0],right[1],right[2]);
      return { type:'linear', angle:'90deg', stops:[lcol+' 0%', rcol+' 100%'] };
    }
    if(vertdiff>50){
      let tcol = rgbtohex(top[0],top[1],top[2]);
      let bcol = rgbtohex(bottom[0],bottom[1],bottom[2]);
      return { type:'linear', angle:'0deg', stops:[tcol+' 0%', bcol+' 100%'] };
    }
    return null;
  }

  function detectshadow(ctx, x, y, w, h){
    let edge = ctx.getImageData(x+Math.floor(w/2), y, 1, 1).data;
    let below = ctx.getImageData(x+Math.floor(w/2), y+Math.floor(h/2), 1, 1).data;
    let diff = Math.abs(edge[0]-below[0])+Math.abs(edge[1]-below[1])+Math.abs(edge[2]-below[2]);
    if(diff<30) return null;
    let blur = Math.max(1, Math.floor(h/10));
    let offsetx = Math.floor(w/10);
    let offsety = Math.floor(h/10);
    let color = rgbtohex(edge[0],edge[1],edge[2]);
    return { offsetx, offsety, blur, spread:0, color };
  }

  function detectborder(ctx, x, y, w, h){
    let topedge = ctx.getImageData(x+Math.floor(w/2), y, 1, 1).data;
    let inside = ctx.getImageData(x+Math.floor(w/2), y+Math.floor(h/10), 1, 1).data;
    let diff = Math.abs(topedge[0]-inside[0])+Math.abs(topedge[1]-inside[1])+Math.abs(topedge[2]-inside[2]);
    if(diff>30){
      let color = rgbtohex(topedge[0],topedge[1],topedge[2]);
      return { width:2, style:'solid', color };
    }
    return null;
  }

  function detectborderradius(ctx, x, y, w, h){
    let corner = ctx.getImageData(x, y, 1, 1).data;
    let inside = ctx.getImageData(x+Math.floor(w/20), y+Math.floor(h/20), 1, 1).data;
    let diff = Math.abs(corner[0]-inside[0])+Math.abs(corner[1]-inside[1])+Math.abs(corner[2]-inside[2]);
    if(diff>30){
      let radius = Math.min(w,h)/8;
      return radius;
    }
    return 0;
  }

  function detectfontsize(bbox){
    let h = bbox.y1 - bbox.y0;
    return Math.max(10, Math.min(72, h));
  }

  function detectlineheight(bbox, ctx){
    let h = bbox.y1 - bbox.y0;
    let y0 = bbox.y0;
    let y1 = bbox.y1;
    let sample = ctx.getImageData(bbox.x0, y0, bbox.x1-bbox.x0, h);
    let data = sample.data;
    let firstrow = data.slice(0, data.width*4);
    let lastrow = data.slice((data.height-1)*data.width*4);
    let avgfirst = 0, avglast = 0;
    for(let i=0;i<firstrow.length;i+=4){ avgfirst += firstrow[i]+firstrow[i+1]+firstrow[i+2]; }
    avgfirst /= firstrow.length;
    for(let i=0;i<lastrow.length;i+=4){ avglast += lastrow[i]+lastrow[i+1]+lastrow[i+2]; }
    avglast /= lastrow.length;
    if(avgfirst<128 && avglast<128) return h*1.2;
    return h*1.5;
  }

  function detectletterspacing(bbox, text){
    if(text.length<2) return 0;
    let totalw = bbox.x1 - bbox.x0;
    let avgcharwidth = totalw / text.length;
    return Math.max(0, avgcharwidth - 8);
  }

  function detectfontweight(ctx, bbox){
    let h = bbox.y1 - bbox.y0;
    let sample = ctx.getImageData(bbox.x0, bbox.y0, bbox.x1-bbox.x0, h);
    let data = sample.data;
    let darkpixels = 0;
    for(let i=0;i<data.length;i+=4){
      let bright = data[i]+data[i+1]+data[i+2];
      if(bright<128*3) darkpixels++;
    }
    let ratio = darkpixels / (data.length/4);
    if(ratio>0.7) return 700;
    if(ratio>0.5) return 500;
    return 300;
  }

  function quadtreeblocks(ctx, width, height, maxdepth, variancethr){
    let blocks = [];
    function split(x, y, w, h, depth){
      if(w<=12 || h<=12 || depth>=maxdepth){
        let avgcol = getaveragecolor(ctx, x, y, w, h);
        blocks.push({x:x/width, y:y/height, w:w/width, h:h/height, color:rgbtohex(avgcol[0],avgcol[1],avgcol[2])});
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
        let avgcol = [Math.floor(rmean), Math.floor(gmean), Math.floor(bsum/n)];
        blocks.push({x:x/width, y:y/height, w:w/width, h:h/height, color:rgbtohex(avgcol[0],avgcol[1],avgcol[2])});
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
        let palette = getdominantcolors(ctx, width, height, 6);
        let gradient = detectgradient(ctx, width, height);
        let bgcolor = getaveragecolor(ctx, 0, 0, width, height);
        let bghex = rgbtohex(bgcolor[0],bgcolor[1],bgcolor[2]);
        let contrast = getcontrastratio(bgcolor, [255,255,255]);
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
        let alltext = '';
        for(let w of words){
          if(w.bbox && w.text && w.confidence>30){
            let x0 = w.bbox.x0 / width, y0 = w.bbox.y0 / height;
            let x1 = w.bbox.x1 / width, y1 = w.bbox.y1 / height;
            let boxw = x1 - x0, boxh = y1 - y0;
            if(boxw>0.002 && boxh>0.002){
              let avgcol = getaveragecolor(ctx, Math.floor(w.bbox.x0), Math.floor(w.bbox.y0),
                Math.max(1, Math.ceil(w.bbox.x1-w.bbox.x0)), Math.max(1, Math.ceil(w.bbox.y1-w.bbox.y0)));
              let bright = (avgcol[0]+avgcol[1]+avgcol[2])/3;
              let textcolor = bright < 128 ? '#ffffff' : '#000000';
              let fontsize = detectfontsize(w.bbox);
              let lineheight = detectlineheight(w.bbox, ctx);
              let letterspacing = detectletterspacing(w.bbox, w.text);
              let fontweight = detectfontweight(ctx, w.bbox);
              textgroups.push({
                text: w.text,
                left: x0*100, top: y0*100,
                width: boxw*100, height: boxh*100,
                color: textcolor,
                fontsize: fontsize,
                lineheight: lineheight,
                letterspacing: letterspacing,
                fontweight: fontweight,
                bgcolor: rgbtohex(avgcol[0],avgcol[1],avgcol[2])
              });
              alltext += w.text + ' ';
            }
          }
        }
        let blockhtml = blocks.map(b =>
          `<div style="position:absolute; left:${b.x*100}%; top:${b.y*100}%; width:${b.w*100}%; height:${b.h*100}%; background:${b.color}; border:0.3px solid rgba(0,0,0,0.05); box-sizing:border-box;"></div>`
        ).join('');
        let texthtml = textgroups.map(t =>
          `<div style="position:absolute; left:${t.left}%; top:${t.top}%; width:${t.width}%; height:${t.height}%; color:${t.color}; font-family:system-ui, sans-serif; font-size:${t.fontsize}px; font-weight:${t.fontweight}; line-height:${t.lineheight}px; letter-spacing:${t.letterspacing}px; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; white-space:pre-wrap; word-break:break-word; text-shadow:0 0 1px rgba(0,0,0,0.3); z-index:10; background:rgba(0,0,0,0);">${escapehtml(t.text)}</div>`
        ).join('');
        let shadow = detectshadow(ctx, 10, 10, width-20, height-20);
        let border = detectborder(ctx, 0, 0, width, height);
        let borderradius = detectborderradius(ctx, 0, 0, width, height);
        let gradientcss = '';
        if(gradient){
          gradientcss = `background: linear-gradient(${gradient.angle}, ${gradient.stops.join(', ')});`;
        }
        let shadowcss = '';
        if(shadow){
          shadowcss = `box-shadow: ${shadow.offsetx}px ${shadow.offsety}px ${shadow.blur}px ${shadow.spread}px ${shadow.color};`;
        }
        let bordercss = '';
        if(border){
          bordercss = `border: ${border.width}px ${border.style} ${border.color};`;
        }
        let radiuscss = borderradius ? `border-radius: ${borderradius}px;` : '';
        let cssvars = `
          :root {
            --bg-color: ${bghex};
            --contrast-ratio: ${contrast.toFixed(2)};
            ${palette.map((c,i)=>`--color-${i+1}: ${c};`).join('\n')}
            ${gradient ? `--gradient: linear-gradient(${gradient.angle}, ${gradient.stops.join(', ')});` : ''}
            ${shadow ? `--shadow: ${shadow.offsetx}px ${shadow.offsety}px ${shadow.blur}px ${shadow.spread}px ${shadow.color};` : ''}
            ${border ? `--border: ${border.width}px ${border.style} ${border.color};` : ''}
            --border-radius: ${borderradius}px;
            --font-family: system-ui, sans-serif;
            --heading-size: 32px;
            --body-size: 16px;
            --link-color: ${palette[1] || '#0066cc'};
            --button-bg: ${palette[0] || '#0066cc'};
            --button-text: ${bghex};
            --button-hover: ${palette[2] || '#004d99'};
            --input-height: 40px;
            --input-border: 1px solid ${palette[3] || '#ccc'};
            --placeholder-color: ${palette[4] || '#999'};
            --logo-aspect: 1;
            --icon-size: 24px;
            --spacing: 8px;
            --grid-col-width: 100%;
            --container-max: 1200px;
            --margin: 0;
            --padding: 0;
            --image-aspect: ${width/height};
            --object-fit: cover;
            --overlay-opacity: 0.5;
            --blur: 0px;
            --brightness: 100%;
            --contrast: 100%;
            --text-shadow: 0 0 1px rgba(0,0,0,0.3);
          }
        `;
        let final = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>reconstructed website</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
${cssvars}
body { background:var(--bg-color); font-family:var(--font-family); min-height:100vh; position:relative; }
.container { position:relative; width:100%; min-height:100vh; overflow:hidden; ${gradientcss} ${shadowcss} ${bordercss} ${radiuscss} }
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
