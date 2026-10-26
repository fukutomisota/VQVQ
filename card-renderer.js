/* Three compositions. Chrome and foil use a light-positioned material approximation. */
(() => {
  'use strict';
  const T=window.TACTILE_TOKENS,C=window.CARD_CONFIG;
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ja',{granularity:'grapheme'}):null;
  const chars=value=>segmenter?Array.from(segmenter.segment(value),item=>item.segment):Array.from(value);
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
  const size=T.material?.markSize||384;
  const brandFont=T.fonts.brand||'Arial, Helvetica, sans-serif';
  const materialCache=new Map();

  function brandGlyph(ctx,text,x,y,fontSize,color,{align='left'}={}) {
    ctx.save();ctx.font=`700 ${fontSize}px ${brandFont}`;ctx.textBaseline='alphabetic';ctx.fillStyle=color;
    const gap=-fontSize*.08;
    const first=ctx.measureText('P').width,second=ctx.measureText('*').width,total=first+second+gap;
    const start=align==='center'?x-total/2:x;
    ctx.fillText('P',start,y);ctx.fillText('*',start+first+gap,y);ctx.restore();
  }

  // A chamfer distance field gives the type its rounded metal relief and bevel normals.
  function makeMarkGeometry() {
    const mask=document.createElement('canvas');mask.width=mask.height=size;
    const ctx=mask.getContext('2d');
    brandGlyph(ctx,'P*',size/2,size*.81,size*.92,'#fff',{align:'center'});
    const alpha=ctx.getImageData(0,0,size,size).data;
    const distance=new Float32Array(size*size),height=new Float32Array(size*size);
    for(let i=0;i<distance.length;i++)distance[i]=alpha[i*4+3]>100?size:0;
    const diagonal=Math.SQRT2;
    for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++) {
      const i=y*size+x;if(!distance[i])continue;
      distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-size]+1,distance[i-size-1]+diagonal,distance[i-size+1]+diagonal);
    }
    for(let y=size-2;y>0;y--)for(let x=size-2;x>0;x--) {
      const i=y*size+x;if(!distance[i])continue;
      distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+size]+1,distance[i+size+1]+diagonal,distance[i+size-1]+diagonal);
    }
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const i=y*size+x,d=distance[i];
      height[i]=18*(1-Math.exp(-d/8))+clamp(d/10)*5*Math.sin(x*.033+y*.019)*Math.cos(y*.028-x*.011);
    }
    // Smooth the sampled relief before differentiating it: a stepped normal map
    // would turn a polished surface into little faceted reflection stripes.
    const smooth=new Float32Array(height.length);
    for(let pass=0;pass<4;pass++) {
      for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++) {
        const i=y*size+x;smooth[i]=(height[i-2]+height[i-1]+height[i]+height[i+1]+height[i+2])/5;
      }
      for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++) {
        const i=y*size+x;height[i]=(smooth[i-size*2]+smooth[i-size]+smooth[i]+smooth[i+size]+smooth[i+size*2])/5;
      }
    }
    const normals=new Float32Array(size*size*3);
    for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++) {
      const i=y*size+x;
      let nx=-(height[i+1]-height[i-1])*.8,ny=-(height[i+size]-height[i-size])*.8,nz=1;
      const length=Math.hypot(nx,ny,nz);nx/=length;ny/=length;nz/=length;
      normals[i*3]=nx;normals[i*3+1]=ny;normals[i*3+2]=nz;
    }
    return {alpha,distance,normals};
  }
  const markGeometry=makeMarkGeometry();
  const foilWidth=Math.min(T.material?.foilWidth||320,320),foilHeight=Math.min(T.material?.foilHeight||200,200);
  const foilNormals=new Float32Array(foilWidth*foilHeight*3);
  for(let y=0;y<foilHeight;y++)for(let x=0;x<foilWidth;x++) {
    const i=(y*foilWidth+x)*3,u=x/foilWidth,v=y/foilHeight;
    const nx=.06*Math.sin(u*7+v*2),ny=.07*Math.cos(v*6-u*2),length=Math.sqrt(nx*nx+ny*ny+1);
    foilNormals[i]=nx/length;foilNormals[i+1]=ny/length;foilNormals[i+2]=1/length;
  }
  function lightPosition(value) {return {x:clamp(Number.isFinite(value?.x)?value.x:.3),y:clamp(Number.isFinite(value?.y)?value.y:.2)};}
  function material(kind,position) {
    const light=lightPosition(position),qx=Math.round(light.x*40)/40,qy=Math.round(light.y*40)/40;
    const key=`${kind}:${qx}:${qy}`;
    if(materialCache.has(key)) {const cached=materialCache.get(key);materialCache.delete(key);materialCache.set(key,cached);return cached;}
    const canvas=document.createElement('canvas');
    const w=kind==='chrome'?size:foilWidth,h=kind==='chrome'?size:foilHeight;
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(w,h),out=image.data;
    const z=T.material?.lightZ||1.25,power=T.material?.specularPower||80;
    // Project foil's light onto its actual plane, so the standard upper-left
    // position places the gloss core inside the card instead of above its edge.
    const lightX=(qx-.5)*(kind==='foil'?2:3),lightY=(qy-.5)*(kind==='foil'?1.4:2.25);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const i=y*w+x,j=i*4,u=x/w,v=y/h;
      let nx,ny,nz;
      if(kind==='chrome') {
        if(!markGeometry.alpha[j+3])continue;
        nx=markGeometry.normals[i*3];ny=markGeometry.normals[i*3+1];nz=markGeometry.normals[i*3+2];
      } else {
        nx=foilNormals[i*3];ny=foilNormals[i*3+1];nz=foilNormals[i*3+2];
      }
      let lx=lightX-(u-.5)*2,ly=lightY-(v-.5)*1.4,lz=z;
      const distanceSquared=lx*lx+ly*ly+lz*lz,lightLength=Math.sqrt(distanceSquared);lx/=lightLength;ly/=lightLength;lz/=lightLength;
      const diffuse=Math.max(0,nx*lx+ny*ly+nz*lz);
      const halfDot=Math.max(0,(diffuse+nz)/Math.sqrt(2+2*lz));
      const specular=Math.pow(halfDot,power)/(1+.18*distanceSquared);
      if(kind==='chrome') {
        // Reflected room softboxes, Fresnel edge response and a point-light specular lobe.
        const rx=2*nz*nx,ry=2*nz*ny;
        const softbox=Math.exp(-Math.pow(ry-.28,2)/.012)+.8*Math.exp(-Math.pow(ry+.48,2)/.018)+.6*Math.exp(-Math.pow(rx+.38,2)/.014);
        const base=23+softbox*148+diffuse*27+specular*220+Math.pow(1-nz,3)*52;
        const edge=markGeometry.distance[i]<1.3?45*diffuse:0;
        out[j]=clamp(base+edge,0,255);out[j+1]=clamp(base*1.025+edge+6,0,255);out[j+2]=clamp(base*1.08+edge+15,0,255);out[j+3]=markGeometry.alpha[j+3];
      } else {
        // Thin-film-inspired phase responds to both incidence and viewing angle.
        const phase=29*(1-diffuse)+13*(1-nz)+u*2.4+v*1.3;
        const sheen=Math.pow(halfDot,14);
        const base=198+diffuse*8;
        // A white clear-coat core and a broad roll-off sit above the colored
        // film response. Both follow the same surface normal and point light.
        const coat=clamp(specular*1.75+sheen*.08);
        const red=clamp(base+29*Math.cos(phase),176,255),green=clamp(base+28*Math.cos(phase+2.1),176,255),blue=clamp(base+30*Math.cos(phase+4.2)+5,176,255);
        out[j]=red+(255-red)*coat;out[j+1]=green+(255-green)*coat;out[j+2]=blue+(255-blue)*coat;out[j+3]=255;
      }
    }
    ctx.putImageData(image,0,0);materialCache.set(key,canvas);
    while(materialCache.size>(T.material?.cacheEntries||8))materialCache.delete(materialCache.keys().next().value);
    return canvas;
  }

  const noise=document.createElement('canvas');noise.width=noise.height=T.texture.tileSize;
  const noiseContext=noise.getContext('2d'),pixels=noiseContext.createImageData(noise.width,noise.height);let seed=T.texture.seed;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed>>>24;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}
  noiseContext.putImageData(pixels,0,0);
  const paperPatterns=new WeakMap();

  function helpers(ctx,p,v) {
    function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
    function line(x,y,x2,y2,color=p.stroke,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    function text(value,x,y,size=T.type.cardBody,color=p.ink,weight=500,font=T.fonts.sans,align='left') {ctx.font=`${weight} ${size}px ${font}`;ctx.textBaseline='top';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(value,x,y);}
    function wrap(value,width){const lines=[];let current='';for(const ch of chars(value)){if(current&&ctx.measureText(current+ch).width>width&&!/^[、。，．！？）］｝〉》」』】〕]/u.test(ch)){lines.push(current);current=ch;}else current+=ch;}if(current)lines.push(current);return lines.length?lines:[''];}
    function fit(value,area,{size=T.type.cardBody,min=20,maxLines=3,color=p.ink,weight=500,font=T.fonts.sans,leading=1.35,align='left'}={}) {
      let lines=[];
      for(;size>=min;size--){ctx.font=`${weight} ${size}px ${font}`;lines=wrap(value,area.w);if(lines.length<=maxLines&&lines.length*size*leading<=area.h&&lines.every(item=>ctx.measureText(item).width<=area.w))break;}
      size=Math.max(size,min);ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='top';ctx.textAlign=align;
      const x=align==='center'?area.x+area.w/2:area.x;
      lines.forEach((item,index)=>ctx.fillText(item,x,area.y+index*size*leading));return {size,lines:lines.length};
    }
    function name(area,options={}){return fit(v.name||'あなた',area,{size:T.type.cardName,min:T.type.cardNameMin,maxLines:2,weight:800,leading:1.06,...options});}
    function avatar(x,y,w,h,{radius=0,border=p.stroke,initial=false}={}) {
      ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.clip();rect(x,y,w,h,p.plate);
      if(v.avatar){const scale=Math.max(w/v.avatar.width,h/v.avatar.height)*v.zoom,iw=v.avatar.width*scale,ih=v.avatar.height*scale;ctx.drawImage(v.avatar,x+(w-iw)/2-(v.x/100)*(iw-w)/2,y+(h-ih)/2-(v.y/100)*(ih-h)/2,iw,ih);}
      else if(initial)text(chars(v.name||'P')[0],x+w/2,y+h*.2,Math.min(w,h)*.58,p.ink,700,T.fonts.sans,'center');
      ctx.restore();if(border){ctx.beginPath();ctx.roundRect(x+.5,y+.5,w-1,h-1,radius);ctx.strokeStyle=border;ctx.lineWidth=1;ctx.stroke();}
    }
    function box(x,y,w,h,color=p.plate){rect(x,y,w,h,color);ctx.strokeStyle=p.stroke;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
    function cropMarks(){const m=24,s=32;[[m,m,1,1],[1600-m,m,-1,1],[m,1000-m,1,-1],[1600-m,1000-m,-1,-1]].forEach(([x,y,dx,dy])=>{line(x-10*dx,y,x+s*dx,y);line(x,y-10*dy,x,y+s*dy);});}
    function barcode(x=1280,y=928,w=248,h=34){let n=71;for(let i=0;i<w;){n=(Math.imul(n,1103515245)+12345)>>>0;const bar=2+n%4;rect(x+i,y,bar,h-(i%7===0?6:0),p.ink);i+=bar+2+n%3;}}
    function header(){text('MODEL SHEET',64,47,22,p.muted,600,T.fonts.mono);text(C.communityEnglish,64,92,42,p.ink,700);text(v.issuedDate,1280,92,22,p.muted,500,T.fonts.mono);}
    return {rect,line,text,fit,name,avatar,box,cropMarks,barcode,header};
  }

  function drawMark(ctx,{x=0,y=0,width=400,height=width,light}={}) {
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(material('chrome',light),x,y,width,height);ctx.restore();
  }
  function liquid(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);
    h.text(C.communityEnglish,88,70,30,p.ink,600);
    // Brand sculpture occupies the upper-right; identity reads across an open lower field.
    drawMark(ctx,{x:892,y:40,width:638,height:638,light:v.light});
    if(v.avatar)h.avatar(88,229,270,270,{radius:135,border:p.secondary});
    h.name({x:88,y:598,w:1424,h:230});
    h.fit(v.message||'はじめまして。',{x:92,y:862,w:1270,h:100},{size:38,min:24,maxLines:3,color:p.ink,weight:400});
  }
  function idol(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);
    ctx.save();ctx.beginPath();ctx.roundRect(30,30,1540,940,42);ctx.clip();ctx.drawImage(material('foil',v.light),30,30,1540,940);ctx.restore();
    ctx.beginPath();ctx.roundRect(30.5,30.5,1539,939,42);ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.stroke();
    h.text(C.communityEnglish,800,74,30,p.ink,600,T.fonts.sans,'center');
    if(v.avatar){
      h.avatar(624,180,352,380,{radius:176,border:'#ffffff'});
      brandGlyph(ctx,'P*',1395,142,82,p.ink);
    } else brandGlyph(ctx,'P*',800,477,292,p.ink,{align:'center'});
    h.name({x:100,y:605,w:1400,h:228},{align:'center'});
    h.fit(v.message||'はじめまして。',{x:280,y:856,w:1040,h:102},{size:36,min:24,maxLines:3,color:p.ink,weight:400,align:'center'});
  }
  function setting(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.header();h.cropMarks();brandGlyph(ctx,'P*',1450,147,72,p.ink);
    h.box(64,210,1472,420);
    ctx.save();ctx.globalAlpha=.18;
    for(let x=88;x<1160;x+=64)h.line(x,250,x,610);
    for(let y=250;y<620;y+=64)h.line(88,y,1160,y);ctx.restore();
    h.text('CHARACTER NAME / 名前',88,230,24,p.muted,600,T.fonts.mono);
    h.name({x:88,y:286,w:1060,h:278},{font:T.fonts.mono});
    h.text('REFERENCE / 参考',1200,230,24,p.muted,600,T.fonts.mono);
    h.avatar(1260,282,210,210,{radius:0,initial:true});
    ['FRONT','SIDE','BACK'].forEach((label,i)=>{const x=1200+i*104;h.box(x,524,90,48,p.paper);h.line(x+45,530,x+45,566);h.line(x+15,548,x+75,548);h.text(label,x+7,580,20,p.muted,600,T.fonts.mono);});
    const columns=[{x:64,w:460,label:'01 / PROFILE',value:v.title||'—'},{x:554,w:460,label:'02 / LIKES',value:v.likes||'—'},{x:1044,w:492,label:'03 / NOTE',value:v.message||'はじめまして。'}];
    columns.forEach((column,i)=>{h.box(column.x,660,column.w,240);h.text(column.label,column.x+24,682,24,p.muted,600,T.fonts.mono);h.fit(column.value,{x:column.x+24,y:728,w:column.w-48,h:i===0?100:152},{size:i===0?31:28,min:24,maxLines:i===0?2:4,font:T.fonts.mono});});
    if(v.status)h.fit(v.status,{x:88,y:848,w:412,h:38},{size:28,min:22,maxLines:1,font:T.fonts.mono,color:p.muted});
    [p.ink,p.secondary,p.primary,p.paper,p.plate,p.stroke].forEach((color,i)=>h.box(942+i*35,606,27,20,color));
    h.barcode();
    ctx.save();ctx.globalAlpha=T.texture.sheetOpacity;
    if(!paperPatterns.has(ctx))paperPatterns.set(ctx,ctx.createPattern(noise,'repeat'));ctx.fillStyle=paperPatterns.get(ctx);ctx.fillRect(0,0,1600,1000);ctx.restore();
  }
  function draw(ctx,key,values) {
    const palette=T.styles[key];if(!palette)throw new Error('Unknown card style');
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.scale(ctx.canvas.width/T.card.width,ctx.canvas.height/T.card.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const h=helpers(ctx,palette,values);
    ({'y3k-liquid':liquid,'holo-idol':idol,'setting-sheet':setting})[key](ctx,h,palette,values);
    ctx.restore();
  }
  window.TACTILE_RENDERER=Object.freeze({draw,drawMark});
})();
