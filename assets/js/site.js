/* Shared behavior: the sticker packer, cut-out headlines, and things you can move.

   The packer measures every word, photo, button and existing sticker in a zone
   and only puts stickers where none of them are. It works in two passes:
   first it tucks a sticker onto a corner of each tile, picked to match what
   the tile is about; then it sprinkles a few more into the open space.
   Cards are "soft": a sticker may hang off a card's corner but never cover
   most of it, and never any of its words. */
(() => {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const ALL=window.STICKERS||[];
 const BY=Object.fromEntries(ALL.map(s=>[s.n,s]));
 const POOL=ALL.filter(s=>s.pool!==false);

 // Seeded randomness, so a page lays out the same way every visit.
 function rng(seed){
  let h=1779033703^seed.length;
  for(let i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296;};
 }

 /* ---------- cut-out headlines ---------- */
 const FACES=[["'Alfa Slab One'",400,'normal'],["'Abril Fatface'",400,'normal'],["'Archivo Black'",400,'normal'],["'Big Shoulders Display'",900,'normal'],["'Space Mono'",700,'normal'],["'Special Elite'",400,'normal'],["'Crimson Pro'",600,'italic']];
 function ransom(el){
  if(el.dataset.cut)return;el.dataset.cut='1';
  const text=el.textContent.trim().replace(/\s+/g,' ');
  const r=rng(text+(el.dataset.seed||''));
  const sr=document.createElement('span');sr.className='sr-only';sr.textContent=text;
  const vis=document.createElement('span');vis.className='rl-wrap';vis.setAttribute('aria-hidden','true');
  let i=0;
  for(const word of text.split(' ')){
   const w=document.createElement('span');w.className='rw';
   for(const ch of word){
    const s=document.createElement('span');s.className='rl';s.textContent=ch;
    const f=FACES[Math.floor(r()*FACES.length)],roll=r();
    s.dataset.t=roll<.4?'w':roll<.72?'k':roll<.84?'g':roll<.94?'a':'o';
    s.style.cssText=`font-family:${f[0]};font-weight:${f[1]};font-style:${f[2]};--rr:${(r()*12-6).toFixed(1)}deg;--ry:${(r()*8-4).toFixed(1)}px;--rs:${(.9+r()*.2).toFixed(2)};transition-delay:${(i++*18)}ms`;
    w.append(s);
   }
   vis.append(w,' ');
  }
  el.replaceChildren(sr,vis);el.classList.add('ransom-type');
 }
 document.querySelectorAll('[data-cut-out]').forEach(ransom);

 // Hand-placed stickers get their shape before their pixels arrive.
 const RATIO=Object.fromEntries(ALL.map(s=>[s.n,s.r]));
 document.querySelectorAll('img.stk').forEach(img=>{
  const n=(img.getAttribute('src')||'').split('/').pop().replace('.webp','');
  if(RATIO[n])img.style.aspectRatio=String(RATIO[n]);
 });

 /* ---------- which stickers belong with which work ---------- */
 const THEMES=[
  [/series|imessage|interview/i,['phone-rotary','headphones','cassette']],
  [/lumelle|jewel/i,['pearls','heart-keys','crown','padlock']],
  [/transplant|moving|new city|interstate/i,['bus','usa','golden-gate']],
  [/threshold|briefing|digest|slack/i,['alarm','megaphone-hand','clock','coffee']],
  [/phia|shopping|price/i,['candy','flats','iconic','ribbon']],
  [/hive|onboarding|requirements|\bprd\b/i,['fountain-pen','diary','books-stack']],
  [/airline|flight|travel/i,['eiffel','liberty','big-ben','globe']],
  [/nysee|transit/i,['liberty','new-york','bus']],
  [/lake erie|bloom|noaa|water/i,['wave','dragonfly','lily']],
  [/emission|scope|carbon/i,['globe','usa','sun']],
  [/dashboard|gmv|brand portfolio|financ/i,['keychain','barcode','dice']],
  [/poker|java/i,['ace','dice','eight-ball']],
  [/resident|reslife/i,['key','heart-keys','coffee']],
  [/ascend|consulting group|yope/i,['megaphone','why-not','stars-sketch']],
  [/speech/i,['megaphone-hand','memories']],
  [/science review|editor|publication/i,['love-clip','fountain-pen','darwin']],
  [/inspirate|climate/i,['globe','sun','lilies']],
  [/columbia|engineering|economics|research|laboratory/i,['grad-cap','books-open','darwin','books']],
  [/coaster/i,['ticket']],
  [/theat|show/i,['clapper']],[/dinner|food/i,['coffee','cherries-ink']],
  [/sci-fi|dystopian/i,['ufo','saturn','rocket']],[/skill|python|sql|figma/i,['knob','cassette','reel']],
  [/timeline|intern|manager/i,['alarm','clock','keychain']],
 ];
 function themed(text,used){
  for(const [re,names] of THEMES)if(re.test(text)){const free=names.filter(n=>BY[n]&&!used.has(n));if(free.length)return free;}
  return null;
 }

 /* ---------- the packer ---------- */
 const HARD=['img:not(.stk)','canvas','video','iframe','svg:not(.scene)','input','select','textarea','button:not(.pinned)','.btn','.tag','.specs > div','.meta-pill','.repo-tag','.preview-tag','.tile-img','.fig','.admit','.pin','.ticker','.hud','.rl','.photo-tile','[data-solid]','.stk:not(.scattered)'].join(',');
 const SOFT=['.rc','.sheet','.sheet-k','.case-card','.case-featured','.repo-card','.research-item','.doc-wrap','.pol','.pinned','.tile','.info-cell','.skill-group','.figma-card','.preview-card','.board-main','.board-mini'].join(',');
 const TILE=['.case-card','.case-featured','.repo-card','.research-item','.doc-wrap','.skill-group','.board-main','.mini-tile'].join(',');
 const SKIP='.stk,.sr-only,script,style,dialog,.ticker,.photo-word-preview,details:not([open]) > :not(summary)';
 function visible(el){
  if(!el.getClientRects().length)return false;
  const s=getComputedStyle(el);return s.visibility!=='hidden'&&s.display!=='none';
 }
 function Grid(cell){
  const m=new Map();
  const keys=r=>{const out=[];for(let gx=Math.floor(r.x/cell);gx<=Math.floor((r.x+r.w)/cell);gx++)for(let gy=Math.floor(r.y/cell);gy<=Math.floor((r.y+r.h)/cell);gy++)out.push(gx+','+gy);return out;};
  return{
   add(r){for(const k of keys(r)){let b=m.get(k);if(!b)m.set(k,b=[]);b.push(r);}},
   hits(r){for(const k of keys(r)){const b=m.get(k);if(b)for(const o of b)if(r.x<o.x+o.w&&r.x+r.w>o.x&&r.y<o.y+o.h&&r.y+r.h>o.y)return true;}return false;}
  };
 }

 /* scatter(zone, opts)
    opts.key     seed suffix
    opts.extra   extra hard rectangles, in zone coordinates
    opts.blocks  selectors treated as one solid block (their insides ignored)
    opts.top/bottom/left/right  margins inside the zone
    opts.per     zone area per ambient sticker (bigger = fewer); 0 = none
    opts.corners false to skip the corner pass
    opts.min/max sticker width range */
 function scatter(zone,opts={}){
  zone.querySelectorAll(':scope > .stk.scattered').forEach(n=>n.remove());
  if(!POOL.length)return 0;
  const zr=zone.getBoundingClientRect(),scale=zone.offsetWidth?zr.width/zone.offsetWidth:1;
  const W=zone.offsetWidth,H=zone.scrollHeight||zone.offsetHeight;
  const toZone=(r,pad=0)=>({x:(r.left-zr.left)/scale-pad,y:(r.top-zr.top)/scale-pad,w:r.width/scale+pad*2,h:r.height/scale+pad*2});
  const narrow=innerWidth<820,PAD=narrow?6:10;
  const hard=Grid(180),placed=Grid(180),softs=[];
  const blocks=opts.blocks?[...zone.querySelectorAll(opts.blocks)]:[];
  const inBlock=el=>blocks.some(b=>b!==el&&b.contains(el));
  blocks.forEach(b=>visible(b)&&hard.add(toZone(b.getBoundingClientRect(),PAD)));
  (opts.extra||[]).forEach(r=>hard.add(r));
  for(const el of zone.querySelectorAll(HARD)){
   if(inBlock(el)||el.closest(SKIP.replace('.stk,',''))||!visible(el))continue;
   const pad=PAD+(parseFloat(el.dataset?.pad)||0);
   for(const r of el.getClientRects())hard.add(toZone(r,pad));
  }
  // Every element that holds words is solid, padding and all; a card's own
  // blank paper is not.
  const walk=document.createTreeWalker(zone,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&!n.parentElement.closest(SKIP)&&!inBlock(n.parentElement)?1:2});
  const range=document.createRange(),seen=new Set();
  for(let n;(n=walk.nextNode());){
   const p=n.parentElement;
   if(seen.has(p)||!visible(p))continue;
   if(p===zone||p.matches(SOFT)){range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width>1)hard.add(toZone(r,PAD));continue;}
   seen.add(p);
   for(const r of p.getClientRects())if(r.width>1)hard.add(toZone(r,PAD));
  }
  const tiles=[];
  for(const el of zone.querySelectorAll(SOFT)){
   if(inBlock(el)||!visible(el)||el.closest('details:not([open])'))continue;
   const box=toZone(el.getBoundingClientRect(),0);softs.push(box);
   if(el.matches(TILE))tiles.push({el,box});
  }

  const r=rng(location.pathname+'|'+(opts.key||zone.id||zone.className)+'|'+Math.round(W/120));
  const minW=opts.min||(narrow?46:64),maxW=opts.max||(narrow?74:108);
  const top=opts.top??8,bottom=opts.bottom??8,left=opts.left??6,right=opts.right??6;
  const frag=document.createDocumentFragment(),used=new Set();let count=0;
  function size(st){let w=minW+(maxW-minW)*r(),h=w/st.r;if(h>maxW*1.15){h=maxW*1.15;w=h*st.r;}
   const rot=(r()*24-12)*Math.PI/180,c=Math.abs(Math.cos(rot)),s=Math.abs(Math.sin(rot));return{w,h,rot,bw:w*c+h*s,bh:w*s+h*c};}
  function fits(x,y,bw,bh,own){
   if(x<left||y<top||x+bw>W-right||y+bh>H-bottom)return false;
   const box={x,y,w:bw,h:bh};
   if(hard.hits(box)||placed.hits({x:x-6,y:y-6,w:bw+12,h:bh+12}))return false;
   for(const sb of softs){
    const ox=Math.min(x+bw,sb.x+sb.w)-Math.max(x,sb.x),oy=Math.min(y+bh,sb.y+sb.h)-Math.max(y,sb.y);
    if(ox>0&&oy>0&&(ox*oy)/(bw*bh)>(sb===own?.45:.12))return false;
   }
   return true;
  }
  function put(st,x,y,g){
   placed.add({x,y,w:g.bw,h:g.bh});used.add(st.n);
   const img=document.createElement('img');
   img.className='stk scattered';img.src=`/assets/images/stickers/${st.n}.webp`;img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';
   if(zr.top+y*scale>innerHeight*1.5)img.loading='lazy';
   img.width=Math.round(g.w);img.height=Math.round(g.h);
   img.style.cssText=`left:${(x+(g.bw-g.w)/2).toFixed(1)}px;top:${(y+(g.bh-g.h)/2).toFixed(1)}px;width:${g.w.toFixed(1)}px;height:${g.h.toFixed(1)}px;--r:${(g.rot*180/Math.PI*(r()<.5?1:-1)).toFixed(1)}deg`;
   if(!reduce.matches&&r()<.22){img.classList.add('drift');img.style.setProperty('--dur',(6+r()*5).toFixed(1)+'s');img.style.setProperty('--del',(-r()*6).toFixed(1)+'s');}
   frag.append(img);count++;
  }
  // pass 1: a sticker on a corner of each tile, matched to what the tile is about
  // inner pages: a sticker on every other tile, not all of them
  const every=document.body.classList.contains('home')?1:2;
  if(opts.corners!==false)for(const [ti,{el,box}] of tiles.entries()){
   if(ti%every)continue;
   const names=themed(el.textContent,used)||[POOL[Math.floor(r()*POOL.length)].n];
   const st=BY[names[0]];if(!st)continue;
   const g=size(st);
   const corners=[[0,0],[1,0],[0,1],[1,1]].sort(()=>r()-.5);
   for(const [cx,cy] of corners){
    let done=false;
    for(let t=0;t<14&&!done;t++){
     // sit mostly off the card, overlapping just its corner
     const ix=.62+r()*.16,iy=.6+r()*.16;
     const x=box.x+cx*box.w-(cx?g.bw*(1-ix):g.bw*ix),y=box.y+cy*box.h-(cy?g.bh*(1-iy):g.bh*iy);
     if(fits(x,y,g.bw,g.bh,box)){put(st,x,y,g);done=true;}
    }
    if(done)break;
   }
  }
  // pass 2: a light sprinkle into open space
  const target=opts.per===0?0:Math.round((W*H)/(opts.per||(narrow?900000:520000)));
  const order=[...POOL].filter(s=>!used.has(s.n)).sort(()=>r()-.5);
  for(let k=0;k<target&&order.length;k++){
   const st=order[k%order.length],g=size(st);
   for(let t=0;t<40;t++){
    const x=left+r()*(W-left-right-g.bw),y=top+r()*(H-top-bottom-g.bh);
    if(fits(x,y,g.bw,g.bh,null)){put(st,x,y,g);break;}
   }
  }
  zone.append(frag);
  if(!reduce.matches)reveal(zone);
  return count;
 }

 // Stickers slap onto the page the first time they scroll into view.
 const io='IntersectionObserver' in window?new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){const s=e.target;if(!s.classList.contains('drift')){s.style.setProperty('--del',(Math.random()*.35).toFixed(2)+'s');s.classList.add('slap');}io.unobserve(s);}},{threshold:.2}):null;
 function reveal(zone){if(io)zone.querySelectorAll(':scope > .stk.scattered').forEach(s=>io.observe(s));}

 /* ---------- page zones ---------- */
 function scatterPage(){
  const body=document.body;
  // the homepage places its few decorations by hand (CLAUDE.md decoration budget)
  if(body.classList.contains('no-scatter'))return;
  if(getComputedStyle(body).position==='static')body.style.position='relative';
  const head=document.querySelector('.site-header');
  const extra=head?[{x:0,y:0,w:body.offsetWidth,h:head.offsetHeight+12}]:[];
  // the corkboard is its own collage: dense, and everything on it can be moved
  const cork=document.querySelector('.corkboard');
  if(cork)scatter(cork,{key:'cork',corners:false,per:innerWidth<820?42000:26000,min:innerWidth<820?44:58,max:innerWidth<820?72:104,top:14,bottom:14,left:14,right:14});
  scatter(body,{key:'page',extra,blocks:'.ride,.hero,.site-header,.page-header h1,.photo-lightbox,.ticker,.foot,.foot-thin,.corkboard',top:(head?head.offsetHeight:0)+6});
 }
 let timer=0;
 const later=()=>{clearTimeout(timer);timer=setTimeout(scatterPage,260);};
 if(document.readyState==='complete')Promise.resolve(document.fonts?.ready).then(scatterPage);
 else addEventListener('load',()=>Promise.resolve(document.fonts?.ready).then(scatterPage));
 addEventListener('resize',later);
 document.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',later));

 /* ---------- moving things: stickers anywhere, photos on the corkboard ---------- */
 const MOVABLE='.stk,.corkboard .pinned';
 document.addEventListener('dragstart',event=>{if(event.target.closest?.(MOVABLE))event.preventDefault();});
 let held=null,swallow=false;
 document.addEventListener('pointerdown',event=>{
  const item=event.target.closest?.(MOVABLE);if(!item||event.button)return;
  const box=item.offsetParent?.getBoundingClientRect(),scale=box&&item.offsetParent.offsetWidth?box.width/item.offsetParent.offsetWidth:1;
  held={item,moved:false,scale:scale||1,x:event.clientX,y:event.clientY,dx:parseFloat(item.style.getPropertyValue('--dx'))||0,dy:parseFloat(item.style.getPropertyValue('--dy'))||0,id:event.pointerId};
  if(item.classList.contains('stk'))event.preventDefault();
 });
 document.addEventListener('pointermove',event=>{
  if(!held)return;
  const dx=event.clientX-held.x,dy=event.clientY-held.y;
  if(!held.moved&&Math.abs(dx)+Math.abs(dy)>5){held.moved=true;held.item.setPointerCapture?.(held.id);held.item.classList.remove('slap','wig');held.item.classList.add('held');}
  if(!held.moved)return;
  held.item.style.setProperty('--dx',held.dx+dx/held.scale+'px');
  held.item.style.setProperty('--dy',held.dy+dy/held.scale+'px');
 });
 const drop=()=>{
  if(!held)return;const it=held.item,moved=held.moved;held=null;it.classList.remove('held');
  if(moved)swallow=true;   // a drag is not a click: don't open the photo
  if(!reduce.matches&&it.classList.contains('stk')){void it.offsetWidth;it.classList.add(moved?'slap':'wig');}
 };
 document.addEventListener('pointerup',drop);document.addEventListener('pointercancel',drop);
 document.addEventListener('click',event=>{if(swallow){swallow=false;if(event.target.closest?.(MOVABLE)){event.preventDefault();event.stopImmediatePropagation();}}},true);
 document.addEventListener('animationend',event=>{const n=event.animationName;if(n==='wig'||n==='slap-in')event.target.classList.remove('wig','slap');});

 window.Stickers={scatter,ransom,rng};
})();
