/* Collision test for the homepage ride (see CLAUDE.md).
   Usage: PW=<path to playwright> node tests/collisions.cjs [baseUrl]
   At 390, 768, 1024 and 1440 wide it checks, and fails on, any of:
   - a tile, image, text block or decoration entering the track lane
   - the track path (sampled with getPointAtLength) touching any of them
   - the cart's cars touching any of them, at ~20 scroll positions
   - a tile too small for its own content
   - horizontal scrolling
   From 768px the ride is a sideways stage that moves as you scroll, so every
   check measures the track, tiles and cart together at the same scroll. */
const {chromium}=require(process.env.PW||'playwright');
const BASE=process.argv[2]||'http://localhost:8765/archive/coaster/';
const SIZES=process.env.SIZES?JSON.parse(process.env.SIZES):[[390,844],[768,1000],[1024,800],[1440,900]];   // e.g. SIZES='[[1280,720]]'
const OBSTACLES='#ride .tile, #ride img, #ride .band-head, #ride .build-l > *, #ride .build-r > *, #ride .end-links > *, #ride .station-l > *, #ride .act-label, #ride .mini-pol, #ride .tile-accent, #ride .band-art';
(async()=>{
 const browser=await chromium.launch();let total=0;
 for(const [w,h] of SIZES){
  const pg=await browser.newPage({viewport:{width:w,height:h}});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE,{waitUntil:'load'});await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(1500);
  const measure=()=>pg.evaluate(sel=>{
   // page coordinates; tiles are measured without their reveal offset
   const R=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);const m=new DOMMatrixReadOnly(cs.transform==='none'?undefined:cs.transform);const t=e.classList.contains('tile');
    return{l:r.left-(t?m.m41:0),t:r.top+scrollY-(t?m.m42:0),r:r.right-(t?m.m41:0),b:r.bottom+scrollY-(t?m.m42:0)};};
   const name=e=>(e.id||e.className||e.tagName).toString().slice(0,30)+(e.src?' '+e.src.split('/').pop():'')+(e.textContent?' "'+e.textContent.trim().slice(0,20)+'"':'');
   const obs=[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).map(e=>({n:name(e),...R(e)}));
   const lanes=[...document.querySelectorAll('.lane-slot')].map(e=>({n:'lane',...R(e)}));
   const rail=document.getElementById('rail'),pts=[];
   if(rail&&rail.getTotalLength&&rail.getAttribute('d')){
    const L=rail.getTotalLength(),ctm=rail.getScreenCTM();
    for(let i=0;i<=900;i++){const p=rail.getPointAtLength(L*i/900).matrixTransform(ctm);pts.push([p.x,p.y+scrollY]);}
   }
   const cars=[...document.querySelectorAll('#cart .car')].map(c=>{const r=c.querySelector('svg').getBoundingClientRect();return{l:r.left,t:r.top+scrollY,r:r.right,b:r.bottom+scrollY};});
   return{obs,lanes,pts,cars,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,H:document.documentElement.scrollHeight};
  },OBSTACLES);
  const hit=(a,b,pad=0)=>a.l<b.r+pad&&a.r>b.l-pad&&a.t<b.b+pad&&a.b>b.t-pad;
  const issues=[];
  const geo=await measure();
  // 1. lane rule
  for(const ln of geo.lanes)for(const o of geo.obs)if(hit({l:ln.l+1,r:ln.r-1,t:ln.t+1,b:ln.b-1},o))issues.push(`LANE ${o.n}`);
  // 2. the track
  const pad=4;  // half the rail stroke plus a hair
  for(const o of geo.obs){const p=geo.pts.find(([x,y])=>x>o.l-pad&&x<o.r+pad&&y>o.t-pad&&y<o.b+pad);if(p)issues.push(`TRACK ${o.n} at ${p.map(Math.round)}`);}
  // 3. the cart (and, sideways, everything else again), at ~20 scroll positions
  const ride=await pg.evaluate(()=>{const r=document.getElementById('ride').getBoundingClientRect();return{top:r.top+scrollY,h:r.height};});
  let cartChecks=0;
  for(let i=0;i<20;i++){
   const y=Math.max(0,ride.top-h*.5+(ride.h)*i/19);
   await pg.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pg.waitForTimeout(1300);
   const g=await measure();
   cartChecks+=g.cars.length;
   for(const c of g.cars)for(const o of g.obs)if(hit(c,o)){issues.push(`CART ${o.n} at scroll ${Math.round(y)}`);break;}
   for(const o of g.obs){const p=g.pts.find(([x,yy])=>x>o.l-pad&&x<o.r+pad&&yy>o.t-pad&&yy<o.b+pad);if(p)issues.push(`TRACK ${o.n}`);}
  }
  // 4. no tile clips its own content (a clipped tile hides text and can push images out)
  issues.push(...await pg.evaluate(()=>[...document.querySelectorAll('#ride .tile')].filter(t=>t.scrollHeight>t.clientHeight+1).map(t=>`CLIP ${t.id} needs ${t.scrollHeight}px, has ${t.clientHeight}px`)));
  // 5. decorations never sit over text
  const deco=await pg.evaluate(()=>{const R=e=>{const r=e.getBoundingClientRect();return{l:r.left,t:r.top,r:r.right,b:r.bottom};};
   const decos=[...document.querySelectorAll("#ride .tile-accent,#ride .band-art,#ride .doodle")].filter(e=>e.getClientRects().length).map(e=>({n:e.className,...R(e)}));
   const range=document.createRange(),text=[];
   const walk=document.createTreeWalker(document.getElementById('ride'),NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&!n.parentElement.closest('.sr-only,[hidden]')?1:2});
   for(let n;(n=walk.nextNode());){range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width>1)text.push({n:n.textContent.trim().slice(0,20),l:r.left,t:r.top,r:r.right,b:r.bottom});}
   const out=[];for(const d of decos)for(const x of text)if(d.l<x.r&&d.r>x.l&&d.t<x.b&&d.b>x.t)out.push(`DECO ${d.n} over "${x.n}"`);return out;});
  issues.push(...deco);
  // 6. margins: stickers keep 16px clear of the ride's edges, never cut off
  issues.push(...await pg.evaluate(()=>{const st=document.getElementById('ride-strip');if(!st)return[];const s=st.getBoundingClientRect(),M=16;
   return[...document.querySelectorAll('#ride .doodle')].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect();
    return r.top<s.top+M||r.bottom>s.bottom-M||r.left<s.left+M||r.right>s.right-M?[`EDGE ${e.src.split('/').pop()} (needs ${M}px margin)`]:[];});}));
  // 7. horizontal scroll
  if(geo.sw>geo.cw)issues.push(`HSCROLL page is ${geo.sw}px wide in a ${geo.cw}px viewport`);
  const uniq=[...new Set(issues)];total+=uniq.length;
  console.log(`${w}px: ${uniq.length} collision(s) | ${geo.obs.length} obstacles, ${geo.pts.length} track samples, ${cartChecks} cart checks | page ${(geo.H/h).toFixed(2)} viewports tall`+(errs.length?` | JS errors: ${errs.join('; ')}`:''));
  uniq.slice(0,12).forEach(s=>console.log('   '+s));if(uniq.length>12)console.log(`   ...and ${uniq.length-12} more`);
  await pg.close();
 }
 await browser.close();
 console.log(total?`FAIL: ${total} collision(s)`:'PASS: 0 collisions');
 process.exit(total?1:0);
})();
