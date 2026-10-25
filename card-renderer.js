/* Six card materials share typography, crop controls and locally rendered textures. */
(() => {
  'use strict';
  const T = window.TACTILE_TOKENS;
  const C = window.CARD_CONFIG;
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
  const chars = text => segmenter ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text);
  const noise = document.createElement('canvas');
  noise.width = noise.height = T.texture.tileSize;
  const nc = noise.getContext('2d'); const pixels = nc.createImageData(noise.width, noise.height);
  let seed = T.texture.seed;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = (seed >>> 24);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  nc.putImageData(pixels, 0, 0);

  function helpers(ctx, p) {
    function rect(x,y,w,h,color) { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); }
    function line(x,y,x2,y2,color=p.ink,width=T.layout.border) { ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); }
    function box(x,y,w,h,color=p.plate,border=p.stroke,width=T.layout.border) {rect(x,y,w,h,color);ctx.strokeStyle=border;ctx.lineWidth=width;ctx.strokeRect(x,y,w,h);}
    function text(text,x,y,size=T.type.cardBody,color=p.ink,weight=500,font=T.fonts.sans) {ctx.font=`${weight} ${size}px ${font}`;ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=color;ctx.fillText(text,x,y);}
    function wrap(text,width) {const lines=[];let current='';for(const ch of chars(text)){if(current&&ctx.measureText(current+ch).width>width&&!/^[、。，．！？）］｝〉》」』】〕]/u.test(ch)){lines.push(current);current=ch;}else current+=ch;}if(current)lines.push(current);return lines.length?lines:[''];}
    function fit(text,area,{size=T.type.cardBody,min=T.type.cardMin,maxLines=2,color=p.ink,weight=600,font=T.fonts.sans,leading=T.card.bodyLeading,offsetX=0,offsetY=0}={}) {
      let lines=[];
      for(;size>=min;size--){ctx.font=`${weight} ${size}px ${font}`;lines=wrap(text,area.w);if(lines.length<=maxLines&&lines.length*size*leading<=area.h&&lines.every(line=>ctx.measureText(line).width<=area.w))break;}
      size=Math.max(size,min);ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='top';
      lines.forEach((line,index)=>ctx.fillText(line,area.x+offsetX,area.y+offsetY+index*size*leading));
      return {size,lines:lines.length,height:lines.length*size*leading};
    }
    function name(text,area,options={}) {return fit(text||'あなた',area,{size:T.type.cardName,min:T.type.cardNameMin,leading:T.card.nameLeading,weight:900,...options});}
    function cropMarks(color=p.stroke) {const m=24,s=32,o=T.texture.offset;[[m,m,1,1],[1600-m,m,-1,1],[m,1000-m,1,-1],[1600-m,1000-m,-1,-1]].forEach(([x,y,dx,dy],i)=>{line(x-10*dx,y+o*(i%2),x+s*dx,y+o*(i%2),color,2);line(x,y-10*dy,x,y+s*dy,color,2);});}
    function barcode(x=1280,y=928,w=248,h=34,color=p.ink) {let n=71;for(let i=0;i<w;){n=(Math.imul(n,1103515245)+12345)>>>0;const bar=2+(n%4);rect(x+i,y,bar,h-(i%7===0?6:0),color);i+=bar+2+(n%3);}}
    function header({rule=true,color=p.ink}={}) {text('MEMBER CARD',T.card.margin,47,T.type.cardMeta,color,700,T.fonts.mono);fit(C.communityName,{x:T.card.margin,y:94,w:1120,h:68},{size:T.type.cardCommunity,min:T.type.cardMinLabel,maxLines:1,color,weight:800});text('ISSUED',1280,49,T.type.cardMeta,color,700,T.fonts.mono);text(values.issuedDate,1280,106,T.type.cardMeta,color,500,T.fonts.mono);if(rule)line(T.card.margin,185,(T.card.width-T.card.margin),185,color);}
    function footer(label=p.label) {text(label,T.card.margin,942,T.type.cardMeta,p.ink,700,T.fonts.mono);barcode();}
    function status(label,x=1230,y=588,w=300) {if(!label)return;box(x,y,w,54,p.plate,p.stroke,2);fit(label,{x:x+16,y:y+12,w:w-32,h:36},{size:T.type.cardStatus,min:T.type.cardMinSmall,maxLines:1,weight:700});}
    function fields({y=596,likesY=686,messageY=824,width=(T.card.width-2*T.card.margin),x=T.card.margin,showTitle=true}={}) {
      if(values.title&&showTitle)fit(values.title,{x,y,w:1080,h:52},{size:T.type.cardTitle,min:T.type.cardMinTitle,maxLines:1,weight:700});
      text('THINGS I LOVE / すきなもの',x,likesY-40,T.type.cardLabel,p.muted,600,T.fonts.mono);
      fit(values.likes||'雑談 / ゲーム / すきなこと',{x,y:likesY,w:width,h:88},{size:T.type.cardTitle,min:T.type.cardMinLabel,weight:600});
      line(x,messageY-16,x+width,messageY-16,p.stroke);
      text('SAY HELLO',x,messageY+6,T.type.cardLabel,p.muted,700,T.fonts.mono);
      fit(values.message||'はじめまして。よろしくね。',{x:x+250,y:messageY,w:width-250,h:86},{size:T.type.cardMessage,min:T.type.cardMinSmall,weight:500});
    }
    function shape(x,y,w,h,type='cut') {
      ctx.beginPath();
      if(type==='circle'){ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);return;}
      if(type==='rounded'){ctx.roundRect(x,y,w,h,Math.min(w,h)*.14);return;}
      const cut=type==='sticker'?18:32;
      const points=type==='sticker'?[[12,4],[w-18,0],[w,20],[w-4,h-12],[w-25,h],[0,h-20]]:[[cut,0],[w,0],[w,h-cut],[w-cut,h],[0,h],[0,cut]];
      points.forEach(([px,py],i)=>i?ctx.lineTo(x+px,y+py):ctx.moveTo(x+px,y+py));ctx.closePath();
    }
    function avatar(x,y,w,h,{type='cut',angle=-T.card.tilt,frame=p.plate,stroke=p.stroke,shadow=false}={}) {
      ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(angle*Math.PI/180);const left=-w/2,top=-h/2;
      if(shadow){ctx.shadowColor=T.texture.shadow;ctx.shadowBlur=12;ctx.shadowOffsetX=8;ctx.shadowOffsetY=10;}
      shape(left-10,top-10,w+20,h+20,type);ctx.fillStyle=frame;ctx.fill();ctx.shadowColor=T.colors.clear;
      ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();
      ctx.save();shape(left,top,w,h,type);ctx.clip();rect(left,top,w,h,p.plate);
      if(values.avatar){const image=values.avatar;const scale=Math.max(w/image.width,h/image.height)*values.zoom;const iw=image.width*scale,ih=image.height*scale;ctx.drawImage(image,left+(w-iw)/2-(values.x/100)*(iw-w)/2,top+(h-ih)/2-(values.y/100)*(ih-h)/2,iw,ih);}
      else {const initial=chars(values.name||'P')[0];ctx.font=`900 ${Math.min(w,h)*.66}px ${T.fonts.sans}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.ink;ctx.fillText(initial,0,0,Math.min(w,h)*.85);}
      ctx.restore();ctx.restore();
    }
    function halftone(x,y,w,h,color=p.secondary,alpha=.55,step=15,r=2.7) {ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;for(let row=0;row<h/step;row++)for(let col=0;col<w/step;col++){ctx.beginPath();ctx.arc(x+col*step+(row%2)*step/2,y+row*step,r,0,Math.PI*2);ctx.fill();}ctx.restore();}
    function rotated(x,y,angle,fn) {ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);fn();ctx.restore();}
    function star(x,y,r,color=p.primary) {ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8;const radius=i%2?r*.53:r;const px=Math.cos(a)*radius,py=Math.sin(a)*radius;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
    let values;
    return {rect,line,box,text,fit,name,cropMarks,barcode,header,footer,status,fields,shape,avatar,halftone,rotated,star,setValues:v=>{values=v;}};
  }

  function liquid(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);
    // Curved silhouettes and narrow specular bands create liquid metal without assets.
    const metal=ctx.createLinearGradient(1135,230,1510,565);
    p.metal.forEach((color,i)=>metal.addColorStop(i/(p.metal.length-1),color));
    ctx.save();ctx.shadowColor=p.secondary;ctx.shadowBlur=24;
    ctx.beginPath();ctx.moveTo(1258,237);
    ctx.bezierCurveTo(1330,213,1343,275,1430,249);
    ctx.bezierCurveTo(1531,217,1568,306,1525,371);
    ctx.bezierCurveTo(1492,423,1559,469,1499,538);
    ctx.bezierCurveTo(1450,594,1385,549,1314,579);
    ctx.bezierCurveTo(1210,617,1163,552,1201,487);
    ctx.bezierCurveTo(1238,426,1135,403,1168,330);
    ctx.bezierCurveTo(1186,291,1223,249,1258,237);ctx.closePath();
    ctx.fillStyle=metal;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle=p.secondary;ctx.stroke();
    const rim=ctx.createLinearGradient(1200,260,1490,550);
    rim.addColorStop(0,p.secondary);rim.addColorStop(.45,p.paper);rim.addColorStop(.54,p.ink);rim.addColorStop(1,p.primary);
    ctx.beginPath();ctx.moveTo(1233,301);ctx.bezierCurveTo(1300,243,1354,328,1443,279);ctx.bezierCurveTo(1538,278,1445,390,1474,458);ctx.bezierCurveTo(1513,555,1363,509,1300,558);
    ctx.strokeStyle=rim;ctx.lineWidth=13;ctx.stroke();
    ctx.beginPath();ctx.moveTo(1221,349);ctx.bezierCurveTo(1184,423,1303,443,1247,514);ctx.strokeStyle=p.secondary;ctx.lineWidth=4;ctx.stroke();ctx.restore();
    h.header();h.cropMarks();
    h.name(v.name,{x:T.card.margin,y:265,w:1080,h:304});
    h.avatar(1245,302,244,244,{type:'circle',angle:0,frame:metal,stroke:p.secondary});
    h.status(v.status,1230,600,300);h.fields();h.footer();
    h.line(T.card.margin,570,1040,570,p.primary,2);
  }

  function sticker(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.cropMarks();h.header({rule:false});
    h.rotated(1150,185,-8,()=>{h.box(0,0,330,66,p.secondary,p.plate,12);h.text('HELLO, INTERNET!',16,14,T.type.cardMarker,p.plate,800,T.fonts.mono);});
    h.rotated(600,416,-1.3,()=>{
      ctx.shadowColor=T.texture.shadow;ctx.shadowBlur=14;ctx.shadowOffsetX=6;ctx.shadowOffsetY=10;
      h.shape(-565,-173,1155,350,'sticker');ctx.fillStyle=p.plate;ctx.fill();ctx.shadowColor=T.colors.clear;ctx.strokeStyle=p.primary;ctx.lineWidth=3;ctx.stroke();
      h.name(v.name,{x:-540,y:-140,w:1080,h:300},{color:p.ink});
    });
    h.avatar(1246,308,248,248,{type:'sticker',angle:2,frame:p.plate,stroke:p.plate,shadow:true});
    h.star(1450,720,54,p.primary);h.star(1110,200,40,p.secondary);
    if(v.title)h.rotated(66,584,.8,()=>{h.box(-8,-4,Math.min(1100,Math.max(470,chars(v.title).length*36+32)),66,p.primary,p.plate,9);h.fit(v.title,{x:10,y:8,w:1040,h:48},{size:T.type.cardTitle,min:T.type.cardMinTitle,maxLines:1,weight:800});});
    h.status(v.status,1210,616,310);
    h.fields({showTitle:false,likesY:712,messageY:834});
    ctx.save();ctx.strokeStyle=p.secondary;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(70,190);ctx.bezierCurveTo(92,157,125,220,153,190);ctx.bezierCurveTo(180,155,214,220,241,187);ctx.stroke();ctx.restore();
    h.footer();
  }

  function poster(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.header({rule:false});h.cropMarks();
    h.line(T.card.margin,188,(T.card.width-T.card.margin),188,p.ink,4);h.text('PERSON / 01',T.card.margin,210,T.type.cardMeta,p.ink,700,T.fonts.mono);
    h.name(v.name,{x:-16,y:258,w:1630,h:313},{size:T.type.cardName*1.3,min:T.type.cardNameMin,maxLines:2,color:p.ink});
    h.rect(0,594,1600,74,p.primary);h.text(v.status||C.communityEnglish,T.card.margin,610,T.type.cardStrip,p.ink,900,T.fonts.mono);h.text('MEMBER / PRINT',1210,620,T.type.cardMeta,p.ink,700,T.fonts.mono);
    if(v.title)h.fit(v.title,{x:T.card.margin,y:700,w:1100,h:52},{size:T.type.cardTitleLarge,min:T.type.cardMinLarge,maxLines:1,weight:800});
    h.text('THINGS I LOVE',T.card.margin,770,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.fit(v.likes||'雑談 / ゲーム / すきなこと',{x:T.card.margin,y:807,w:1130,h:65},{size:T.type.cardDense,min:T.type.cardMin,weight:600});
    h.text('SAY HELLO',T.card.margin,890,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.fit(v.message||'はじめまして。よろしくね。',{x:290,y:885,w:900,h:60},{size:T.type.cardStatus,min:T.type.cardMin,weight:500});
    h.avatar(1300,700,210,210,{type:'cut',angle:0,frame:p.ink,stroke:p.ink});h.footer();
  }

  function idol(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);
    const foil=ctx.createLinearGradient(0,100,1600,950);
    p.foil.forEach((color,i)=>foil.addColorStop(i/(p.foil.length-1),color));
    h.rect(24,24,1552,952,foil);
    ctx.save();ctx.strokeStyle=p.stroke;ctx.lineWidth=2;ctx.strokeRect(36,36,1528,928);
    ctx.globalAlpha=.22;
    for(let x=-600;x<2000;x+=98)h.line(x,24,x+700,976,p.plate,22);
    ctx.restore();
    h.box(T.card.margin,210,1100,374,p.plate,p.stroke,2);
    h.name(v.name,{x:88,y:268,w:1052,h:290});
    h.header({rule:false});
    h.avatar(1235,246,274,310,{type:'rounded',angle:0,frame:p.plate,stroke:p.stroke});
    h.star(1498,222,29,p.ink);h.star(1193,561,22,p.ink);
    h.status(v.status,1210,608,310);
    h.fields({x:88,width:1424,y:610,likesY:710,messageY:836});
    h.footer();
  }

  function setting(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.header({rule:false});h.cropMarks();
    h.box(T.card.margin,210,1472,420,p.plate,p.stroke,2);
    ctx.save();ctx.globalAlpha=.18;
    for(let x=88;x<1160;x+=64)h.line(x,250,x,610,p.stroke,1);
    for(let y=250;y<620;y+=64)h.line(88,y,1160,y,p.stroke,1);
    ctx.restore();
    h.text('CHARACTER NAME / 名前',88,230,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.name(v.name,{x:88,y:286,w:1060,h:278},{font:T.fonts.mono});
    h.text('REFERENCE / 参考',1200,230,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.avatar(1260,282,210,210,{type:'cut',angle:0,frame:p.plate,stroke:p.stroke});
    // Empty turnaround guides suggest an animation model sheet; the icon is only a reference.
    ['FRONT','SIDE','BACK'].forEach((label,i)=>{
      const x=1200+i*104;
      h.box(x,524,90,48,p.paper,p.stroke,1);
      h.line(x+45,530,x+45,566,p.stroke,1);h.line(x+15,548,x+75,548,p.stroke,1);
      h.text(label,x+7,580,T.type.cardMin,p.muted,700,T.fonts.mono);
    });
    const columns=[{x:64,w:460,label:'01 / PROFILE',value:v.title||'—'}, {x:554,w:460,label:'02 / LIKES',value:v.likes||'雑談 / ゲーム / すきなこと'}, {x:1044,w:492,label:'03 / NOTE',value:v.message||'はじめまして。よろしくね。'}];
    columns.forEach((column,i)=>{
      h.box(column.x,660,column.w,240,p.plate,p.stroke,2);
      h.text(column.label,column.x+24,682,T.type.cardLabel,p.muted,700,T.fonts.mono);
      h.fit(column.value,{x:column.x+24,y:728,w:column.w-48,h:i===0?100:152},{size:i===0?T.type.cardDense:T.type.cardStatus,min:T.type.cardMinLabel,maxLines:i===0?2:4,font:T.fonts.mono});
    });
    if(v.status)h.fit(v.status,{x:88,y:848,w:412,h:38},{size:T.type.cardStatus,min:T.type.cardMinSmall,maxLines:1,font:T.fonts.mono,color:p.muted});
    const chips=[p.ink,p.secondary,p.primary,p.paper,p.plate,p.stroke];
    h.text('COLOR',856,608,T.type.cardMin,p.muted,700,T.fonts.mono);
    chips.forEach((color,i)=>h.box(942+i*35,606,27,20,color,p.stroke,1));
    h.footer();
  }

  function glass(ctx,h,p,v) {
    const background=ctx.createLinearGradient(0,0,1600,1000);
    background.addColorStop(0,p.paper);background.addColorStop(1,p.plate);
    h.rect(0,0,1600,1000,background);
    const glow=(x,y,r,color)=>{const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color+'90');gradient.addColorStop(1,color+'00');h.rect(x-r,y-r,r*2,r*2,gradient);};
    glow(1350,290,510,p.primary);glow(1180,1000,560,p.secondary);
    ctx.save();ctx.beginPath();ctx.roundRect(88,236,1430,650,48);ctx.fillStyle=p.paper+'75';ctx.fill();ctx.strokeStyle=p.secondary+'66';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.roundRect(64,210,1472,690,48);
    const surface=ctx.createLinearGradient(64,210,1536,900);
    surface.addColorStop(0,p.plate+'f0');surface.addColorStop(.7,p.paper+'d9');surface.addColorStop(1,p.plate+'e8');
    ctx.fillStyle=surface;ctx.fill();ctx.strokeStyle=p.secondary+'b0';ctx.stroke();
    h.line(104,213,1450,213,p.ink+'80',2);ctx.restore();
    h.header({rule:false});
    h.name(v.name,{x:100,y:276,w:1040,h:288});
    h.avatar(1234,286,244,244,{type:'rounded',angle:0,frame:p.plate,stroke:p.stroke});
    h.status(v.status,1210,602,290);
    h.fields({x:100,width:1400,y:608,likesY:710,messageY:820});
    h.footer();
  }

  const patterns=new WeakMap();
  function draw(ctx,key,values) {
    const p=T.styles[key];
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.scale(ctx.canvas.width/T.card.width,ctx.canvas.height/T.card.height);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.imageSmoothingQuality='high';
    const h=helpers(ctx,p);h.setValues(values);
    ({'y3k-liquid':liquid,'holo-idol':idol,'setting-sheet':setting,'sticker-bomb':sticker,glass,'type-poster':poster})[key](ctx,h,p,values);
    const opacity={'y3k-liquid':T.texture.liquidOpacity,'holo-idol':T.texture.holoOpacity,'setting-sheet':T.texture.sheetOpacity,glass:T.texture.glassOpacity};
    ctx.save();ctx.globalAlpha=opacity[key]??T.texture.cardOpacity;
    ctx.globalCompositeOperation=key==='y3k-liquid'||key==='glass'?'source-over':'multiply';
    if(!patterns.has(ctx))patterns.set(ctx,ctx.createPattern(noise,'repeat'));ctx.fillStyle=patterns.get(ctx);ctx.fillRect(0,0,1600,1000);ctx.restore();
    ctx.restore();
  }
  window.TACTILE_RENDERER=Object.freeze({draw});
})();
