/* All seven prints share typography and texture tokens; their compositions differ. */
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
  document.documentElement.style.setProperty('--grain-image', `url("${noise.toDataURL('image/png')}")`);

  function helpers(ctx, p) {
    function rect(x,y,w,h,color) { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); }
    function line(x,y,x2,y2,color=p.ink,width=T.layout.border) { ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); }
    function box(x,y,w,h,color=p.plate,border=p.stroke,width=T.layout.border) {rect(x,y,w,h,color);ctx.strokeStyle=border;ctx.lineWidth=width;ctx.strokeRect(x,y,w,h);}
    function text(text,x,y,size=T.type.cardBody,color=p.ink,weight=500,font=T.fonts.sans) {ctx.font=`${weight} ${size}px ${font}`;ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=color;ctx.fillText(text,x,y);}
    function wrap(text,width) {const lines=[];let current='';for(const ch of chars(text)){if(current&&ctx.measureText(current+ch).width>width){lines.push(current);current=ch;}else current+=ch;}if(current)lines.push(current);return lines.length?lines:[''];}
    function fit(text,area,{size=T.type.cardBody,min=T.type.cardMin,maxLines=2,color=p.ink,weight=600,font=T.fonts.sans,leading=T.card.bodyLeading,offsetX=0,offsetY=0}={}) {
      let lines=[];
      for(;size>=min;size--){ctx.font=`${weight} ${size}px ${font}`;lines=wrap(text,area.w);if(lines.length<=maxLines&&lines.length*size*leading<=area.h)break;}
      size=Math.max(size,min);ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='top';
      lines.forEach((line,index)=>ctx.fillText(line,area.x+offsetX,area.y+offsetY+index*size*leading));
      return {size,lines:lines.length,height:lines.length*size*leading};
    }
    function name(text,area,options={}) {return fit(text||'あなた',area,{size:T.type.cardName,min:T.type.cardNameMin,leading:T.card.nameLeading,weight:900,...options});}
    function cropMarks(color=p.stroke) {const m=24,s=32,o=T.texture.offset;[[m,m,1,1],[1600-m,m,-1,1],[m,1000-m,1,-1],[1600-m,1000-m,-1,-1]].forEach(([x,y,dx,dy],i)=>{line(x-10*dx,y+o*(i%2),x+s*dx,y+o*(i%2),color,2);line(x,y-10*dy,x,y+s*dy,color,2);});}
    function barcode(x=1280,y=928,w=248,h=34,color=p.ink) {let n=71;for(let i=0;i<w;){n=(Math.imul(n,1103515245)+12345)>>>0;const bar=2+(n%4);rect(x+i,y,bar,h-(i%7===0?6:0),color);i+=bar+2+(n%3);}}
    function header({rule=true,color=p.ink,handDate=false}={}) {text(C.communityEnglish,T.card.margin,47,T.type.cardMeta,color,700,T.fonts.mono);fit(C.communityName,{x:T.card.margin,y:94,w:1120,h:68},{size:T.type.cardCommunity,min:T.type.cardMinLabel,maxLines:1,color,weight:800});text(`No.${C.memberNumber}`,1280,49,T.type.cardSerial,color,700,T.fonts.mono);text(values.issuedDate,1280,106,handDate?T.type.cardScript:T.type.cardMeta,color,500,handDate?T.fonts.hand:T.fonts.mono);if(rule)line(T.card.margin,185,(T.card.width-T.card.margin),185,color);}
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
      else {const initial=chars(values.name||'V')[0];ctx.font=`900 ${Math.min(w,h)*.66}px ${T.fonts.sans}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.ink;ctx.fillText(initial,0,0,Math.min(w,h)*.85);}
      ctx.restore();ctx.restore();
    }
    function halftone(x,y,w,h,color=p.secondary,alpha=.55,step=15,r=2.7) {ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;for(let row=0;row<h/step;row++)for(let col=0;col<w/step;col++){ctx.beginPath();ctx.arc(x+col*step+(row%2)*step/2,y+row*step,r,0,Math.PI*2);ctx.fill();}ctx.restore();}
    function rotated(x,y,angle,fn) {ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);fn();ctx.restore();}
    function star(x,y,r,color=p.primary) {ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8;const radius=i%2?r*.53:r;const px=Math.cos(a)*radius,py=Math.sin(a)*radius;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
    let values;
    return {rect,line,box,text,fit,name,cropMarks,barcode,header,footer,status,fields,shape,avatar,halftone,rotated,star,setValues:v=>{values=v;}};
  }

  function riso(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.65;
    h.rect(1180,206,340,348,p.primary);ctx.beginPath();ctx.arc(1390,355,182,0,Math.PI*2);ctx.fillStyle=p.secondary;ctx.fill();ctx.restore();
    h.halftone(1120,218,440,370,p.secondary,.6);
    h.header();h.cropMarks();
    const area={x:T.card.margin,y:265,w:1090,h:304};
    ctx.save();ctx.globalCompositeOperation='multiply';h.name(v.name,area,{color:p.primary,offsetX:T.texture.offset,offsetY:T.texture.offset});h.name(v.name,area,{color:p.secondary,offsetX:-T.texture.offset});ctx.restore();
    h.avatar(1230,258,276,276,{angle:-1.1,frame:p.paper,stroke:p.secondary});
    h.status(v.status,1230,580,300);h.fields();h.footer();
    ctx.save();ctx.strokeStyle=p.primary;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(65,579);ctx.bezierCurveTo(220,590,360,569,520,580);ctx.stroke();ctx.restore();
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
    h.rect(0,594,1600,74,p.primary);h.text(v.status||'INTERNET V-CHU KAI',T.card.margin,610,T.type.cardStrip,p.ink,900,T.fonts.mono);h.text('MEMBER / PRINT',1210,620,T.type.cardMeta,p.ink,700,T.fonts.mono);
    if(v.title)h.fit(v.title,{x:T.card.margin,y:700,w:1100,h:52},{size:T.type.cardTitleLarge,min:T.type.cardMinLarge,maxLines:1,weight:800});
    h.text('THINGS I LOVE',T.card.margin,770,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.fit(v.likes||'雑談 / ゲーム / すきなこと',{x:T.card.margin,y:807,w:1130,h:65},{size:T.type.cardDense,min:T.type.cardMin,weight:600});
    h.text('SAY HELLO',T.card.margin,890,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.fit(v.message||'はじめまして。よろしくね。',{x:290,y:885,w:900,h:60},{size:T.type.cardStatus,min:T.type.cardMin,weight:500});
    h.avatar(1300,700,210,210,{type:'cut',angle:0,frame:p.ink,stroke:p.ink});h.footer();
  }

  function grain(ctx,h,p,v) {
    const gradient=ctx.createLinearGradient(0,0,1600,1000);gradient.addColorStop(0,p.paper);gradient.addColorStop(.48,p.primary);gradient.addColorStop(1,p.secondary);h.rect(0,0,1600,1000,gradient);
    ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle=p.secondary;ctx.lineWidth=150;ctx.beginPath();ctx.moveTo(-150,750);ctx.bezierCurveTo(350,240,1050,950,1750,220);ctx.stroke();ctx.restore();
    ctx.strokeStyle=p.stroke;ctx.lineWidth=2;ctx.strokeRect(40,24,1520,952);
    for(let y=60;y<960;y+=112){h.rect(12,y,18,48,p.ink);h.rect(1570,y,18,48,p.ink);}
    h.header({handDate:true});h.cropMarks();
    h.name(v.name,{x:88,y:275,w:1110,h:290},{color:p.ink});
    h.avatar(1260,270,238,286,{type:'cut',angle:1.5,frame:p.ink,stroke:p.paper});h.status(v.status,1220,595,300);
    h.fields({x:88,width:1424,likesY:700,messageY:836});h.footer();
  }

  function spec(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.header({rule:false});h.cropMarks();
    h.box(T.card.margin,210,(T.card.width-2*T.card.margin),690,p.plate,p.stroke,3);
    [554,660,782].forEach(y=>h.line(T.card.margin,y,(T.card.width-T.card.margin),y,p.stroke,2));
    h.line(1208,210,1208,554,p.stroke,2);h.line(964,554,964,660,p.stroke,2);h.line(382,660,382,900,p.stroke,2);
    h.text('01 / DISPLAY_NAME',86,230,T.type.cardLabel,p.muted,700,T.fonts.mono);
    h.name(v.name,{x:86,y:288,w:1090,h:244},{font:T.fonts.mono});
    h.avatar(1262,270,220,220,{type:'cut',angle:0,frame:p.paper,stroke:p.stroke});
    h.text('02 / TITLE',86,570,T.type.cardLabel,p.muted,700,T.fonts.mono);h.fit(v.title||'—',{x:86,y:608,w:840,h:42},{size:T.type.cardMessage,min:T.type.cardMinDense,maxLines:1,font:T.fonts.mono});
    h.text('03 / STATUS',986,570,T.type.cardLabel,p.muted,700,T.fonts.mono);h.fit(v.status||'—',{x:986,y:610,w:520,h:40},{size:T.type.cardMessage,min:T.type.cardMinLabel,maxLines:1,font:T.fonts.mono});
    h.text('04 / LOVE',86,686,T.type.cardLabel,p.muted,700,T.fonts.mono);h.fit(v.likes||'雑談 / ゲーム / すきなこと',{x:410,y:685,w:1096,h:86},{size:T.type.cardDense,min:T.type.cardMinSmall,font:T.fonts.mono});
    h.text('05 / MESSAGE',86,808,T.type.cardLabel,p.muted,700,T.fonts.mono);h.fit(v.message||'はじめまして。よろしくね。',{x:410,y:807,w:1096,h:84},{size:T.type.cardDense,min:T.type.cardMinSmall,font:T.fonts.mono});
    h.rect(946,944,13,13,p.secondary);h.text('LOCAL PRINT',976,941,T.type.cardMeta,p.ink,700,T.fonts.mono);h.footer();
  }

  function paper(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.header({rule:false});h.cropMarks();
    h.rotated(800,419,1.1,()=>{ctx.shadowColor=T.texture.shadow;ctx.shadowBlur=8;ctx.shadowOffsetX=5;ctx.shadowOffsetY=9;h.shape(-770,-175,1510,360,'cut');ctx.fillStyle=p.secondary;ctx.fill();ctx.shadowColor=T.colors.clear;});
    h.rotated(785,413,-.8,()=>{ctx.shadowColor=T.texture.shadow;ctx.shadowBlur=8;ctx.shadowOffsetX=4;ctx.shadowOffsetY=8;h.shape(-753,-183,1508,353,'cut');ctx.fillStyle=p.primary;ctx.fill();ctx.shadowColor=T.colors.clear;});
    h.rotated(785,412,.3,()=>{ctx.shadowColor=T.texture.shadow;ctx.shadowBlur=9;ctx.shadowOffsetY=6;h.shape(-741,-191,1510,352,'cut');ctx.fillStyle=p.plate;ctx.fill();ctx.shadowColor=T.colors.clear;h.name(v.name,{x:-700,y:-150,w:1084,h:296});});
    h.avatar(1250,267,240,270,{type:'cut',angle:-1.8,frame:p.paper,stroke:p.stroke,shadow:true});
    h.status(v.status,1226,602,300);h.fields({likesY:705,messageY:838});
    ctx.save();ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(82,196);ctx.bezierCurveTo(145,182,202,207,265,195);ctx.moveTo(1365,190);ctx.bezierCurveTo(1395,154,1420,214,1450,180);ctx.stroke();ctx.restore();h.footer();
  }

  function foil(ctx,h,p,v) {
    h.rect(0,0,1600,1000,p.paper);h.header({rule:false});h.cropMarks();
    h.line(T.card.margin,200,(T.card.width-T.card.margin),200,p.stroke);
    const metal=ctx.createLinearGradient(0,284,0,565);p.foil.forEach((color,i)=>metal.addColorStop(i/(p.foil.length-1),color));
    h.name(v.name,{x:T.card.margin,y:302,w:1134,h:292},{color:metal});
    h.avatar(1300,326,200,220,{type:'cut',angle:0,frame:p.plate,stroke:p.stroke});
    h.status(v.status,1226,615,300);h.fields({y:620,likesY:720,messageY:842});h.footer();
  }

  const patterns=new WeakMap();
  function draw(ctx,key,values) {
    const p=T.styles[key];
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.scale(ctx.canvas.width/T.card.width,ctx.canvas.height/T.card.height);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.imageSmoothingQuality='high';
    const h=helpers(ctx,p);h.setValues(values);
    ({y3k:riso,kawaii:sticker,chrome:poster,aurora:grain,pixel:spec,pop:paper,holo:foil})[key](ctx,h,p,values);
    ctx.save();ctx.globalAlpha=key==='aurora'?T.texture.grainFieldOpacity:key==='holo'?T.texture.foilOpacity:T.texture.cardOpacity;
    ctx.globalCompositeOperation=key==='aurora'||key==='holo'?'source-over':'multiply';
    if(!patterns.has(ctx))patterns.set(ctx,ctx.createPattern(noise,'repeat'));ctx.fillStyle=patterns.get(ctx);ctx.fillRect(0,0,1600,1000);ctx.restore();
    ctx.restore();
  }
  window.TACTILE_RENDERER=Object.freeze({draw});
})();
