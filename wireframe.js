(() => {
const ns='http://www.w3.org/2000/svg',layer=document.querySelector('#coaster-layer');let svg,path,train,cars=[],length=1,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,progress=0;
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{paused=e.matches;button();});
const motion=document.querySelector('#motion');function button(){document.body.classList.toggle('motion-paused',paused);motion.textContent=paused?'Play motion':'Pause motion';motion.setAttribute('aria-pressed',String(paused));}button();motion.addEventListener('click',()=>{paused=!paused;lastScroll=-1;button();});
function el(tag,attrs,parent){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
const rect=s=>{const r=(typeof s==='string'?document.querySelector(s):s).getBoundingClientRect();return {x:r.left,y:r.top+scrollY,w:r.width,h:r.height,right:r.right,bottom:r.bottom+scrollY};};
let route,schedule,lastScroll=-1;
function build(){
layer.replaceChildren();const w=innerWidth,h=document.documentElement.scrollHeight;svg=el('svg',{viewBox:`0 0 ${w} ${h}`,style:`height:${h}px;position:absolute;top:0`},layer);const start=rect('.work-heading'),p=rect('#transplant'),r=rect('#research'),orbit=rect('.thinking-orbit'),end=rect('.last-stop>.button'),tiles=[...document.querySelectorAll('.writing-list a')].map(n=>{const visual=n.querySelector('.writing-image,.writing-visual');const a=rect(visual);return {...a,bottom:rect(n).bottom};});
const climate={data:rect('.data-art'),story:rect('.research-feature>div:last-child'),feature:rect('.research-feature'),rows:[...document.querySelectorAll('.research-row')].map(rect)};
route=RideRoute.makeRoute({w,start,p,r,orbit,end,tiles,climate,viewport:innerHeight,mobile:w<768});const d=route.d;
schedule=RideRoute.timeline(route,innerHeight,Math.max(1,h-innerHeight));
const defs=el('defs',{},svg);
const steel=el('linearGradient',{id:'rail-steel',x1:0,y1:0,x2:0,y2:1},defs);
[['0%','#444'],['32%','#999'],['49%','#ccc'],['64%','#999'],['100%','#444']].forEach(([offset,color])=>el('stop',{offset,'stop-color':color},steel));
const shell=el('linearGradient',{id:'car-shell',x1:0,y1:0,x2:0,y2:1},defs);
[['0%','#fff'],['36%','#f0f0f0'],['48%','#dedede'],['100%','#c8c8c8']].forEach(([offset,color])=>el('stop',{offset,'stop-color':color},shell));
// Only the two stations conceal the overlay; all other content stays below it.
const stationMask=el('mask',{id:'station-mask',maskUnits:'userSpaceOnUse',x:0,y:0,width:w,height:h},defs);
el('rect',{width:w,height:h,fill:'white'},stationMask);
for(const [selector,box,pad] of [['.work-heading',start,2],['.last-stop>.button',end,10]]){
 const radius=parseFloat(getComputedStyle(document.querySelector(selector)).borderTopLeftRadius)||0;
 el('rect',{x:box.x-pad,y:box.y-pad,width:box.w+pad*2,height:box.h+pad*2,rx:radius+pad,fill:'black'},stationMask);
}
const track=el('g',{mask:'url(#station-mask)'},svg);
path=el('path',{d,fill:'none',stroke:'#252525','stroke-width':3.6},track);
const railPaths=[[],[]],ties=[];
for(let distance=0;distance<=route.length;distance+=5){const a=RideRoute.pointAt(route,distance),b=RideRoute.pointAt(route,distance+1),c=RideRoute.pointAt(route,distance-1),dx=b.x-c.x,dy=b.y-c.y,m=Math.hypot(dx,dy)||1,nx=-dy/m,ny=dx/m;
 for(let side=0;side<2;side++){const sign=side?1:-1;railPaths[side].push(`${distance?'L':'M'} ${(a.x+nx*6*sign).toFixed(2)} ${(a.y+ny*6*sign).toFixed(2)}`);}
}
for(let distance=0;distance<=route.length;distance+=17){const a=RideRoute.pointAt(route,distance),b=RideRoute.pointAt(route,distance+1),c=RideRoute.pointAt(route,distance-1),m=Math.hypot(b.x-c.x,b.y-c.y)||1,nx=-(b.y-c.y)/m,ny=(b.x-c.x)/m;ties.push(`M ${a.x-nx*7} ${a.y-ny*7} L ${a.x+nx*7} ${a.y+ny*7}`);}
el('path',{d:ties.join(' '),fill:'none',stroke:'#757575','stroke-width':1.6},track);
for(const rail of railPaths){el('path',{d:rail.join(' '),fill:'none',stroke:'#252525','stroke-width':3.7},track);el('path',{d:rail.join(' '),fill:'none',stroke:'url(#rail-steel)','stroke-width':2.1},track);}
length=route.length;lastScroll=-1;train=el('g',{mask:'url(#station-mask)'},svg);cars=[];
for(let i=0;i<3;i++){
 const car=el('g',{},train);
 // Articulated steel frame and low, faceted shell; leading car gets a nose cone.
 el('path',{d:'M -32 -8 L 27 -8 M -19 -5 L 19 -5',fill:'none',stroke:'#323232','stroke-width':2.3},car);
 el('path',{d:i===0?'M -21 -20 L 9 -20 L 25 -13 L 27 -8 L -21 -8 Z':'M -21 -20 L 17 -20 L 23 -14 L 23 -8 L -21 -8 Z',fill:'url(#car-shell)',stroke:'#111','stroke-width':.8},car);
 el('path',{d:'M -18 -18 L 10 -18 L 18 -14',fill:'none',stroke:'#e7e7e7','stroke-width':.8},car);
 for(const x of [-13,7]){
  el('path',{d:`M ${x-4} -20 L ${x-6} -35 Q ${x-6} -39 ${x-1} -39 L ${x+3} -38 L ${x+5} -24 L ${x+11} -22 L ${x+10} -19 Z`,fill:'#191919',stroke:'#8c8c8c','stroke-width':.8},car);
  el('path',{d:`M ${x-2} -35 L ${x+3} -33 L ${x+7} -26 L ${x+10} -26`,fill:'none',stroke:'#c7c7c7','stroke-width':1.5},car);
  el('path',{d:`M ${x+5} -25 L ${x+10} -25`,stroke:'#111','stroke-width':3},car);
 }
 for(const x of [-14,14]){
  el('path',{d:`M ${x-5} -8 L ${x+5} -8 L ${x+6} 3 L ${x-5} 3 Z`,fill:'#626262',stroke:'#222','stroke-width':.7},car);
  for(const dx of [-2.6,2.6]){el('circle',{cx:x+dx,cy:-1,r:3.2,fill:'#151515',stroke:'#a7a7a7','stroke-width':.8},car);el('circle',{cx:x+dx,cy:-1,r:1,fill:'#d5d5d5'},car);}
  el('circle',{cx:x,cy:4,r:1.8,fill:'#222',stroke:'#999','stroke-width':.6},car);
 }
 for(const x of [-18,0,18])el('circle',{cx:x,cy:-12,r:.8,fill:'#ccc'},car);
 cars.push(car);
}
window.coasterDebug={ready:true,route,schedule,visibilityFeasible:schedule.feasible,
 getState:()=>({progress,paused,trainScreen:cars.map((_,i)=>{const p=RideRoute.pointAt(route,Math.max(0,length*progress-i*57));return {x:p.x,y:p.y-scrollY};})})};
draw();}
function draw(){if(!svg)return;
if(!paused&&scrollY!==lastScroll){progress=RideRoute.distanceAt(route,schedule,scrollY)/length;lastScroll=scrollY;}
cars.forEach((car,i)=>{const pos=Math.max(0,Math.min(length,length*progress-i*57)),p=RideRoute.pointAt(route,pos),q=RideRoute.pointAt(route,pos+1),b=RideRoute.pointAt(route,pos-1);const angle=Math.atan2(q.y-b.y,q.x-b.x)*180/Math.PI;
// The final leftward brake run keeps the seats above the wheels.
const bankStart=route.bankStartDistance,bankEnd=route.bankEndDistance;
const t=Math.max(0,Math.min(1,(pos-bankStart)/(bankEnd-bankStart))),bank=Math.cos(Math.PI*t*t*(3-2*t));
const upright=pos<bankStart&&Math.cos(angle*Math.PI/180)<0?-1:1;
car.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle}) scale(1 ${pos<bankStart?upright:bank})`);});}
let pending;function rebuild(){clearTimeout(pending);pending=setTimeout(build,120);}
addEventListener('resize',rebuild);
new ResizeObserver(rebuild).observe(document.querySelector('#ride-world'));
document.querySelectorAll('.writing-image').forEach(image=>image.addEventListener('load',rebuild));
document.fonts.ready.then(build);function tick(){draw();requestAnimationFrame(tick);}tick();
})();
