/* Home: the ride, the photo booth and the on-ride photo.
   Rules for layout and motion live in CLAUDE.md. */
(() => {
 const $=id=>document.getElementById(id);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
 // Where Noah's face sits in hello.webp, as fractions of the image (822 x 1400).
 const NOAH={src:'pictures/portfolio/hello.webp',w:822,h:1400,cx:.52,cy:.33,r:.26};
 const STORE='np-rider';

 /* ---------- rider state (this tab only) ---------- */
 let rider=null;
 try{rider=sessionStorage.getItem(STORE);}catch{}
 const riderListeners=[];
 function setRider(url){rider=url;try{url?sessionStorage.setItem(STORE,url):sessionStorage.removeItem(STORE);}catch{}riderListeners.forEach(fn=>fn());}
 const flash=$('flash');

 /* ---------- the ride: one path, a four-car train ---------- */
 const ride=$('ride'),stage=$('stage'),strip=$('ride-strip'),svg=$('lane-svg'),rail=$('rail'),cart=$('cart');
 const sideways=matchMedia('(min-width:1024px) and (min-height:560px)');
 const bands=[...document.querySelectorAll('.band')];
 const ns='http://www.w3.org/2000/svg';
 const el=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.append(n);return n;};
 const HEAD=66,BACK=8,CAR_GAP=64;     // riders' heads stand 66px off the rail, toward the open side
 const SPEED=3.2;                     // sideways: px of track covered per px scrolled
 const SEATS=4;
 let cars=[],geo=null,tl=null,triggers=[],dropped=false;

 function carSvg(front){
  const s=el('svg',{viewBox:'-28 -66 56 72',width:56,height:72});
  el('rect',{x:-28,y:-34,width:56,height:30,rx:9,fill:front?'#059669':'#fff',stroke:'#000','stroke-width':3},s);
  for(const x of [-15,15])el('circle',{cx:x,cy:-2,r:4.5,fill:'#000'},s);
  const head=el('g',{class:'head'},s);return{s,head};
 }
 function paintHeads(){
  const [front,noah]=cars;if(!front)return;
  front.head.replaceChildren();
  const clip=`url(#face-clip)`;
  if(rider){
   el('circle',{cx:0,cy:-45,r:19,fill:'#fff'},front.head);
   el('image',{href:rider,x:-19,y:-64,width:38,height:38,'clip-path':clip},front.head);
   el('circle',{cx:0,cy:-45,r:19,fill:'none',stroke:'#000','stroke-width':3},front.head);
  }else{
   el('circle',{cx:0,cy:-45,r:19,fill:'#fff',stroke:'#000','stroke-width':2.5,'stroke-dasharray':'5 4'},front.head);
   el('path',{d:'M-8 -45H8M0 -53V-37',stroke:'#000','stroke-width':3,'stroke-linecap':'round'},front.head);
  }
  if(!noah.head.childNodes.length){
   const w=19/NOAH.r,h=w*NOAH.h/NOAH.w;
   el('circle',{cx:0,cy:-45,r:19,fill:'#fff'},noah.head);
   el('image',{href:NOAH.src,x:-NOAH.cx*w,y:-45-NOAH.cy*h,width:w,height:h,'clip-path':clip,style:'filter:grayscale(1)'},noah.head);
   el('circle',{cx:0,cy:-45,r:19,fill:'none',stroke:'#000','stroke-width':3},noah.head);
  }
 }
 function buildCart(){
  cart.replaceChildren();
  const defs=el('svg',{width:0,height:0,style:'position:absolute'},null);
  el('circle',{cx:0,cy:-45,r:19},el('clipPath',{id:'face-clip'},el('defs',{},defs)));
  cart.append(defs);
  // you in front, Noah behind you, then two empty seats
  cars=[true,false,false,false].map(front=>{const d=document.createElement('div');d.className='car';const c=carSvg(front);d.append(c.s);cart.append(d);return{el:d,...c};});
  paintHeads();
 }

 // the same track again in white, shown only over the black Let's build panel
 function whiteRail(d,x0,y0,x1,y1){
  let k=$('rail-k');
  if(!k){const cp=el('clipPath',{id:'k-clip'},el('defs',{},svg));el('rect',{},cp);k=el('path',{id:'rail-k',class:'rail rail-k','clip-path':'url(#k-clip)'},svg);}
  const r=svg.querySelector('#k-clip rect');r.setAttribute('x',x0);r.setAttribute('y',y0);r.setAttribute('width',Math.max(0,x1-x0));r.setAttribute('height',Math.max(0,y1-y0));
  k.setAttribute('d',d);
 }
 /* The vertical path (phones): one gentle cubic per section, vertical at
    every stop so the joins are smooth. x wiggles inside the left rail,
    leaving room on the right for the riders' heads. */
 function layoutV(){
  const rr=strip.getBoundingClientRect(),W=strip.offsetWidth,H=strip.offsetHeight;
  svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const scale=.6;
  const stops=bands.map(b=>{
   const lr=b.querySelector('.lane-slot').getBoundingClientRect(),br=b.getBoundingClientRect();
   const a=lr.left-rr.left+BACK*scale+4,z=lr.right-rr.left-(HEAD+6)*scale;
   return{a,z,y:br.top-rr.top+Math.min(56,br.height/2),band:b};
  });
  const top=Math.max(4,stops[0].y-70),bottom=H-24;
  const xs=stops.map((s,i)=>{const c=(s.a+s.z)/2,amp=Math.max(0,(s.z-s.a)/2*.85);return c+(i%2?amp:-amp);});
  // build it stop by stop, measuring how far along the path each stop sits
  const probe=el('path',{d:''},svg),lens=[],marks=[];
  const measure=d=>{probe.setAttribute('d',d);return probe.getTotalLength();};
  let d=`M${xs[0].toFixed(1)} ${top.toFixed(1)} L${xs[0].toFixed(1)} ${stops[0].y.toFixed(1)}`;
  lens.push(measure(d));
  const f=n=>n.toFixed(1);
  for(let i=0;i<stops.length;i++){
   const x=xs[i],y=stops[i].y;marks.push([x,y]);
   const last=i+1>=stops.length,nx=last?x:xs[i+1],ny=last?bottom:stops[i+1].y,dy=ny-y;
   d+=` C${f(x)} ${f(y+dy*.5)} ${f(nx)} ${f(ny-dy*.5)} ${f(nx)} ${f(ny)}`;
   if(!last)lens.push(measure(d));
  }
  probe.remove();
  rail.setAttribute('d',d);
  const kb=$('b-build').getBoundingClientRect();whiteRail(d,0,kb.top-rr.top,W,H);
  svg.querySelectorAll('.rail-stop').forEach(n=>n.remove());
  for(const [x,y] of marks)el('circle',{class:'rail-stop',cx:x,cy:y,r:5},svg);
  geo={mode:'v',stops,lens,total:rail.getTotalLength(),scale,rideTop:rr.top+scrollY};
 }

 /* The sideways path (tablet and up), traced from Noah's wireframe. Points
    are in screen widths (x) and strip heights (y), like the layout. It runs
    flat through the station, climbs the lift hill to a crest over Columbia,
    drops steeply under Product, crests over Phia, loops around the Data
    title, dips under the data cards, rolls between the polaroids, and
    levels out under Let's build. Every node is a crest or a dip with a
    level tangent, so each cubic joins the next smoothly. */
 function layoutH(){
  gsap.set(strip,{x:0});
  const vw=stage.clientWidth;strip.style.setProperty('--vw',vw+'px');
  const H=strip.clientHeight;strip.style.setProperty('--sh',H+'px');
  const W=strip.offsetWidth;
  svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const scale=clamp(H/900*2.05*Math.min(1,(vw/H/1.83)**1.5),1.1,1.95);   // big cars: the ride is the hero of this page (smaller on narrow screens)
  const X=u=>u*vw,Y=u=>u*H,f=n=>n.toFixed(1);
  let px=0,py=Y(.806),d=`M0 ${f(py)}`;
  const to=(x,y,a=.5,b=.5)=>{x=X(x);y=Y(y);const w=x-px;d+=` C${f(px+a*w)} ${f(py)} ${f(x-b*w)} ${f(y)} ${f(x)} ${f(y)}`;px=x;py=y;};   // a, b: handle lengths; shorter at a crest makes it a peak, not a plateau
  const flat=x=>{px=X(x);d+=` L${f(px)} ${f(py)}`;};
  const loop=(rx,ry)=>{const x=px,cy=py-ry,kx=.5523*rx,ky=.5523*ry;   // up the right, over the top, down the left, back to the bottom
   d+=` C${f(x+kx)} ${f(py)} ${f(x+rx)} ${f(cy+ky)} ${f(x+rx)} ${f(cy)} C${f(x+rx)} ${f(cy-ky)} ${f(x+kx)} ${f(cy-ry)} ${f(x)} ${f(cy-ry)} C${f(x-kx)} ${f(cy-ry)} ${f(x-rx)} ${f(cy-ky)} ${f(x-rx)} ${f(cy)} C${f(x-rx)} ${f(cy+ky)} ${f(x-kx)} ${f(py)} ${f(x)} ${f(py)}`;};
  flat(1.0);               // the station platform
  to(1.5,.17,.2,.3);       // the lift hill, peaking over Columbia
  to(1.86,.80,.8,.3);const dropX=px;   // the first drop
  flat(2.34);              // under Transplant, Series and lumelle
  to(2.8,.54,.5,.3);       // peaking over Phia
  to(3.25,.88,.6,.3);loop(X(.17),Y(.43));   // the loop, around the Data title, clear of the data cards
  flat(3.38);
  to(3.66,.9);flat(3.85);  // under the data cards
  to(4.32,.47);            // between the polaroids
  to(4.62,.59);
  to(4.93,.32);            // over the activities
  to(5.38,.54);
  flat(W/vw-.02);          // level under Let's build
  rail.setAttribute('d',d);
  whiteRail(d,X(5.38),0,W,H);
  // sample it once: x along the length, and the furthest x reached so far
  const total=rail.getTotalLength(),step=4,n=Math.ceil(total/step),reach=new Float32Array(n+1);
  for(let i=0,m=0;i<=n;i++){m=Math.max(m,rail.getPointAtLength(Math.min(total,i*step)).x);reach[i]=m;}
  const lenAt=x=>{let a=0,b=n;while(a<b){const c=(a+b)>>1;reach[c]<x?a=c+1:b=c;}return a*step;};
  const mid=CAR_GAP*scale*(SEATS-1)/2;   // the camera keeps the middle of the train centred
  const start=lenAt(vw/2)+mid,end=lenAt(W-vw/2)+mid;
  const lens=bands.map(b=>{const cx=b.dataset.cx;return !cx?start:cx==='end'?end:clamp(lenAt(X(+cx))+mid,start,end);});
  // reduced motion: the train hops forward in steps of 0.4 screens, so it never glides but never leaves the view
  const hops=[];for(let x=vw/2;x<W-vw/2;x+=vw*.4)hops.push(lenAt(x)+mid);hops.push(end);
  svg.querySelectorAll('.rail-stop').forEach(n=>n.remove());
  const hdr=parseFloat(getComputedStyle(stage).top)||0;
  const S=(end-start)/SPEED;
  ride.style.setProperty('--ride-h',(stage.offsetHeight+S)+'px');
  const tiles=[...strip.querySelectorAll('[data-at]')].map(t=>({t,l:t.offsetLeft}));
  geo={mode:'h',vw,W,step,n,reach,lenAt,start,end,lens,hops,total,scale,mid,S,drop:lenAt(dropX)+mid,tiles,
   scrollStart:()=>ride.getBoundingClientRect().top+scrollY-hdr};
 }
 const pos={len:0};
 let raw=null;
 const links=[...document.querySelectorAll('.stops a')],fill=$('stops-fill');
 function camera(L){const i=clamp(Math.round((L-geo.mid)/geo.step),0,geo.n);return clamp(geo.reach[i]-geo.vw/2,0,geo.W-geo.vw);}
 function place(){
  if(!geo||!raw)return;
  let L=pos.len;
  if(geo.mode==='h'){
   const cam=camera(L);gsap.set(strip,{x:-cam});
   if(reduce.matches)L=geo.hops.reduce((m,s)=>s<=pos.len+1?s:m,geo.start);   // hop, don't glide
   if(!dropped&&pos.len>=geo.drop)firstDrop();
   reveal(cam);
   const k=geo.lens.reduce((m,s,i)=>s<=pos.len+1?i:m,0);
   links.forEach((a,j)=>a.setAttribute('aria-current',String(j===k)));
   gsap.set(fill,{scaleX:(pos.len-geo.start)/(geo.end-geo.start)});
  }
  cars.forEach((c,i)=>{
   const l=clamp(L-i*CAR_GAP*geo.scale,0,geo.total);
   const p=MotionPathPlugin.getPositionOnPath(raw,l/geo.total,true);
   gsap.set(c.el,{x:p.x,y:p.y,rotation:p.angle,scale:geo.scale});
  });
 }
 // sideways, tiles arrive from the right: reveal each one as it comes into view
 function reveal(cam){
  if(!document.documentElement.classList.contains('motion'))return;
  const due=geo.tiles.filter(o=>!o.shown&&o.l<cam+geo.vw*.92);
  if(!due.length)return;
  due.forEach(o=>o.shown=true);
  gsap.to(due.map(o=>o.t),{opacity:1,y:0,duration:.5,ease:'power2.out',stagger:.06,overwrite:true});
 }
 function snap(){
  if(!reduce.matches){flash.classList.remove('go');void flash.offsetWidth;flash.classList.add('go');}
  shopReady=true;renderPhoto();
 }
 function firstDrop(){
  if(dropped)return;dropped=true;
  // the one bouncy moment on the whole site
  if(!reduce.matches)gsap.fromTo(cars.map(c=>c.s),{scale:1},{scale:1.14,duration:.2,yoyo:true,repeat:1,ease:'back.out(3)'});
  if(rider)snap();
 }
 function buildV(){
  ride.style.removeProperty('--ride-h');gsap.set(strip,{clearProps:'transform'});
  layoutV();
  raw=MotionPathPlugin.getRawPath(rail);MotionPathPlugin.cacheRawPathMeasurements(raw);
  const stopScroll=i=>geo.rideTop+geo.stops[i].y-innerHeight*.45;
  pos.len=geo.lens[0];place();
  if(reduce.matches){
   // no scrub: the cart jumps to each section's stop
   geo.stops.forEach((s,i)=>triggers.push(ScrollTrigger.create({trigger:s.band,start:'top 60%',end:'bottom 40%',onToggle:self=>{if(self.isActive){pos.len=geo.lens[i];place();}}})));
  }else{
   tl=gsap.timeline({scrollTrigger:{trigger:ride,start:()=>stopScroll(0),end:()=>stopScroll(geo.stops.length-1)+1,scrub:1,invalidateOnRefresh:true}});
   for(let i=1;i<geo.stops.length;i++){
    tl.to(pos,{len:geo.lens[i],duration:Math.max(1,stopScroll(i)-stopScroll(i-1)),ease:'none',onUpdate:place});
   }
   const prod=geo.stops.findIndex(s=>s.band.id==='b-product');
   if(prod>0)triggers.push(ScrollTrigger.create({start:()=>stopScroll(prod),onEnter:firstDrop}));
   triggers.push(...ScrollTrigger.batch('#ride .tile',{start:'top 92%',once:true,
    onEnter:els=>gsap.to(els,{opacity:1,y:0,duration:.5,ease:'power2.out',stagger:.06,overwrite:true})}));
  }
  // the sticky stops: which section you're in, and how far along the ride
  geo.stops.forEach((s,i)=>triggers.push(ScrollTrigger.create({trigger:s.band,start:'top 55%',end:'bottom 55%',onToggle:self=>{if(self.isActive)links.forEach((a,j)=>a.setAttribute('aria-current',String(j===i)));}})));
  triggers.push(ScrollTrigger.create({trigger:ride,start:'top 60%',end:'bottom bottom',onUpdate:self=>gsap.set(fill,{scaleX:self.progress})}));
 }
 function buildH(){
  layoutH();
  raw=MotionPathPlugin.getRawPath(rail);MotionPathPlugin.cacheRawPathMeasurements(raw);
  for(const o of geo.tiles)o.shown=gsap.getProperty(o.t,'opacity')>=1;
  pos.len=geo.start;
  // one scrubbed tween: the track length the cart has covered; the camera follows the cart
  tl=gsap.timeline({scrollTrigger:{trigger:ride,start:()=>geo.scrollStart(),end:()=>geo.scrollStart()+geo.S,scrub:reduce.matches?true:1,invalidateOnRefresh:true}});
  tl.fromTo(pos,{len:geo.start},{len:geo.end,duration:1,ease:'none',onUpdate:place});
  place();
 }
 function build(){
  if(!window.gsap||!window.ScrollTrigger||!window.MotionPathPlugin)return;
  triggers.forEach(t=>t.kill());triggers=[];if(tl){tl.scrollTrigger?.kill();tl.kill();tl=null;}
  sideways.matches?buildH():buildV();
 }
 // sideways, the scroll position for a length along the track
 const scrollFor=L=>geo.scrollStart()+(L-geo.start)/SPEED;
 links.forEach((a,i)=>a.addEventListener('click',e=>{
  if(geo?.mode!=='h')return;
  e.preventDefault();scrollTo({top:scrollFor(geo.lens[i]),behavior:reduce.matches?'auto':'smooth'});
 }));
 // Ride again: back to the station
 document.querySelector('[data-ride-again]')?.addEventListener('click',e=>{
  if(geo?.mode!=='h')return;
  e.preventDefault();scrollTo({top:scrollFor(geo.start),behavior:reduce.matches?'auto':'smooth'});
 });
 // keyboard: tabbing to something off to the side rides the cart over to it
 stage.addEventListener('focusin',e=>{
  if(geo?.mode!=='h'||!e.target.closest('.band'))return;
  const r=e.target.getBoundingClientRect();
  if(r.left>=0&&r.right<=geo.vw)return;
  const x=r.left+r.width/2-gsap.getProperty(strip,'x');
  scrollTo({top:scrollFor(clamp(geo.lenAt(x)+geo.mid,geo.start,geo.end)),behavior:'instant'});
  ScrollTrigger.update();tl?.scrollTrigger?.getTween()?.progress(1);   // no easing lag: focus is never off screen
 });
 function start(){
  if(!window.gsap)return;
  gsap.registerPlugin(ScrollTrigger,MotionPathPlugin);
  if(!reduce.matches)document.documentElement.classList.add('motion');
  buildCart();build();
  let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{build();ScrollTrigger.refresh();},200);});
  const refresh=()=>{build();ScrollTrigger.refresh();};
  document.fonts.ready.then(refresh);
  if(document.readyState!=='complete')addEventListener('load',refresh,{once:true});
  riderListeners.push(()=>{paintHeads();place();});
 }
 start();

 /* ---------- tiles: details in a modal ---------- */
 const modal=$('tile-modal');
 document.querySelectorAll('.tile-more').forEach(btn=>btn.addEventListener('click',()=>{
  const t=btn.closest('.tile');
  modal.querySelector('#tile-modal-title').textContent=t.querySelector('.tile-title').textContent;
  modal.querySelector('.tile-modal-body').innerHTML=t.querySelector('.tile-detail').innerHTML;
  modal.showModal();
 }));
 modal.querySelector('.tile-modal-close').addEventListener('click',()=>modal.close());
 modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});

 /* ---------- photo booth ---------- */
 const booth=$('booth'),video=$('booth-video'),preview=$('booth-preview'),frame=video.parentElement,count=$('booth-count'),status=$('booth-status');
 let stream=null,pending=null,counting=false;
 function mode(name){for(const id of ['pick','live','confirm'])$('booth-'+id).hidden=id!==name;}
 function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}video.srcObject=null;frame.classList.remove('live');counting=false;count.textContent='';}
 function show(url){pending=url;preview.src=url;preview.hidden=false;$('booth-empty').hidden=true;mode('confirm');$('booth-board').focus();}
 function reset(){stopCamera();pending=null;preview.hidden=true;$('booth-empty').hidden=false;status.textContent='';mode('pick');}
 function openBooth(){
  reset();
  if(rider){show(rider);status.textContent='You are already in the front car.';}
  booth.showModal();
 }
 // Square-crop, then match the black-and-white collage.
 function toRider(source,sw,sh,{mirror=false,mono=true,bias=.5}={}){
  const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,320,320);
  if(mono){
   const side=Math.min(sw,sh);
   if(mirror){x.translate(320,0);x.scale(-1,1);}
   x.drawImage(source,(sw-side)/2,(sh-side)*bias,side,side,0,0,320,320);
   x.setTransform(1,0,0,1,0,0);
   const img=x.getImageData(0,0,320,320),d=img.data;
   for(let i=0;i<d.length;i+=4){const v=clamp((.299*d[i]+.587*d[i+1]+.114*d[i+2]-128)*1.25+136,0,255);d[i]=d[i+1]=d[i+2]=v;}
   x.putImageData(img,0,0);
  }else{const k=250/Math.max(sw,sh);x.drawImage(source,(320-sw*k)/2,(320-sh*k)/2,sw*k,sh*k);}
  return c.toDataURL('image/jpeg',.86);
 }
 document.querySelectorAll('[data-open-booth]').forEach(b=>b.addEventListener('click',openBooth));
 document.querySelectorAll('[data-booth-close]').forEach(b=>b.addEventListener('click',()=>booth.close()));
 booth.addEventListener('close',stopCamera);
 booth.addEventListener('click',event=>{if(event.target===booth)booth.close();});
 $('booth-camera').addEventListener('click',async()=>{
  if(!navigator.mediaDevices?.getUserMedia){status.textContent='No camera available here. Upload a photo instead.';return;}
  status.textContent='Asking for your camera.';
  try{
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:640}},audio:false});
   video.srcObject=stream;await video.play();
   frame.classList.add('live');$('booth-empty').hidden=true;status.textContent='Center your face in the circle.';
   mode('live');$('booth-snap').focus();
  }catch(error){stopCamera();status.textContent=error.name==='NotAllowedError'?'The camera stays off. Upload a photo or send a stand-in.':'The camera would not start. Upload a photo instead.';}
 });
 $('booth-snap').addEventListener('click',async()=>{
  if(counting||!stream)return;counting=true;
  for(const n of [3,2,1]){count.textContent=n;await new Promise(r=>setTimeout(r,700));if(!stream)return;}
  count.textContent='';
  const url=toRider(video,video.videoWidth,video.videoHeight,{mirror:true});
  stopCamera();status.textContent='';show(url);
 });
 $('booth-stop').addEventListener('click',reset);
 $('booth-retake').addEventListener('click',reset);
 $('booth-file').addEventListener('change',async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  const objectUrl=URL.createObjectURL(file);
  try{const img=await load(objectUrl);status.textContent='';show(toRider(img,img.naturalWidth,img.naturalHeight,{bias:.3}));}
  catch{status.textContent='That file did not open as an image. Try another.';}
  finally{URL.revokeObjectURL(objectUrl);}
 });
 document.querySelectorAll('[data-standin]').forEach(button=>button.addEventListener('click',async()=>{
  stopCamera();const img=await load(`pictures/stickers/${button.dataset.standin}.webp`);
  status.textContent='A fine choice.';show(toRider(img,img.naturalWidth,img.naturalHeight,{mono:false}));
 }));
 $('booth-board').addEventListener('click',()=>{
  if(!pending)return;
  setRider(pending);booth.close();
 });

 /* ---------- the on-ride photo ---------- */
 const canvas=$('ride-photo-canvas'),download=$('ride-photo-btn');
 let shopReady=false,noahImg=null;
 async function renderPhoto(){
  if(!canvas)return;
  const x=canvas.getContext('2d'),cw=canvas.width;
  await Promise.all(['400 60px "Alfa Slab One"','500 44px Caveat','20px "Space Mono"'].map(f=>document.fonts.load(f).catch(()=>{})));
  noahImg??=await load(NOAH.src).catch(()=>null);
  const face=rider?await load(rider).catch(()=>null):null;
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#fff';x.fillRect(0,0,cw,canvas.height);
  x.save();x.beginPath();x.rect(50,50,800,760);x.clip();
  x.fillStyle='#dedede';x.fillRect(50,50,800,760);
  x.fillStyle='rgba(0,0,0,.08)';for(let yy=56;yy<810;yy+=13)for(let xx=56+(yy%26?6:0);xx<850;xx+=13){x.beginPath();x.arc(xx,yy,2.6,0,7);x.fill();}
  const P=[[20,200],[330,180],[560,430],[900,860]];
  const bez=(t,i)=>(1-t)**3*P[0][i]+3*(1-t)**2*t*P[1][i]+3*(1-t)*t*t*P[2][i]+t**3*P[3][i];
  x.strokeStyle='#000';
  x.lineWidth=20;x.lineCap='round';x.beginPath();x.moveTo(...P[0]);x.bezierCurveTo(...P[1],...P[2],...P[3]);x.stroke();
  const carAt=(t,draw)=>{const px=bez(t,0),py=bez(t,1),a=Math.atan2(bez(t+.01,1)-py,bez(t+.01,0)-px);x.save();x.translate(px,py);x.rotate(a);x.scale(4.3,4.3);draw();x.restore();};
  const body=front=>{x.lineWidth=3;x.fillStyle=front?'#000':'#fff';x.beginPath();x.roundRect(-28,-34,56,30,9);x.fill();x.stroke();x.fillStyle='#000';for(const w of [-15,15]){x.beginPath();x.arc(w,-2,4.5,0,7);x.fill();}};
  const head=(img,crop)=>{x.save();x.beginPath();x.arc(0,-46,19,0,7);x.fillStyle='#fff';x.fill();x.clip();if(img){x.filter='grayscale(1)';x.drawImage(img,...crop,-19,-65,38,38);x.filter='none';}x.restore();x.lineWidth=3;x.beginPath();x.arc(0,-46,19,0,7);x.stroke();};
  x.lineWidth=5;for(const [a,b,c] of [[120,150,90],[90,230,120],[150,300,70]]){x.beginPath();x.moveTo(a,b);x.lineTo(a+c,b+c*.35);x.stroke();}
  carAt(.43,()=>{head(noahImg,noahImg?[NOAH.w*(NOAH.cx-NOAH.r),NOAH.h*NOAH.cy-NOAH.w*NOAH.r,NOAH.w*NOAH.r*2,NOAH.w*NOAH.r*2]:[]);body(false);});
  carAt(.6,()=>{
   if(face)head(face,[0,0,face.naturalWidth,face.naturalHeight]);
   else{x.setLineDash([5,4]);x.lineWidth=2.5;x.beginPath();x.arc(0,-46,19,0,7);x.fillStyle='#fff';x.fill();x.stroke();x.setLineDash([]);x.fillStyle='#000';x.font='400 22px "Alfa Slab One"';x.textAlign='center';x.fillText('?',0,-38);}
   body(true);
  });
  x.restore();
  x.save();x.translate(244,742);x.rotate(-.07);x.fillStyle='#000';x.fillRect(-152,-44,304,80);x.fillStyle='#fff';x.font='400 46px "Alfa Slab One"';x.textAlign='center';x.fillText('First drop',0,22);x.restore();
  x.fillStyle='#000';x.font='19px "Space Mono"';x.textAlign='left';x.fillText('On-ride photo  no. 0'+(rider?String(rider.length%900+100):'000'),74,92);
  x.textAlign='center';x.font='500 46px Caveat';x.fillText(rider?'me and Noah, first drop':'seat 1A still open',cw/2,906);
  x.font='17px "Space Mono"';x.fillText('noahproctor.co   '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),cw/2,960);
  syncShop();
 }
 // The ride photo button downloads the picture whenever you like: with your
 // face in the front car if you added it, or an open seat if you didn't.
 function syncShop(){}
 if(canvas&&download){
  renderPhoto();
  riderListeners.push(()=>{shopReady=false;renderPhoto();});
  download.addEventListener('click',()=>{
   canvas.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='noah-proctor-ride-photo.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);},'image/png');
  });
 }
})();
