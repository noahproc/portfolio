/* A native horizontal scroller: the train and the content share one world. */
(() => {
 const viewport=document.querySelector('#ride-viewport');
 if(!viewport)return;
 const world=document.querySelector('#ride-world'),scene=document.querySelector('#ride-scene');
 const panels=[...world.querySelectorAll('.ride-panel')];
 const stops=[...document.querySelectorAll('.ride-stops [data-ride-to]')];
 const previous=document.querySelector('#ride-previous'),next=document.querySelector('#ride-next');
 const counter=document.querySelector('#ride-counter'),bar=document.querySelector('#ride-progress');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const ns='http://www.w3.org/2000/svg';
 let width=1,height=1,active=-1,frame=0,cars=[],route=null,layout=[],tileBounds=[];
 const geometry=window.HorizontalGeometry;
 function el(tag,attrs,parent=scene){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);parent.append(node);return node;}
 function jump(index,focus=false){
  index=Math.max(0,Math.min(panels.length-1,index));
  if(innerWidth<=800){panels[index].scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});return;}
  viewport.scrollTo({left:layout[index]?.x||0,behavior:reduce.matches?'instant':'smooth'});
  if(focus)viewport.focus({preventScroll:true});
 }
 document.querySelectorAll('[data-ride-to]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();jump(Number(link.dataset.rideTo),!link.closest('.ride-navigation'));}));
 function page(direction){viewport.scrollBy({left:width*.85*direction,behavior:reduce.matches?'instant':'smooth'});}
 previous.addEventListener('click',()=>page(-1));next.addEventListener('click',()=>page(1));
 function handleHash(){const index=panels.findIndex(panel=>'#'+panel.id===location.hash);if(index>=0)jump(index);}
 addEventListener('hashchange',handleHash);
 // Wheel travel always follows the horizontal ride; panels have no vertical scrollers.
 viewport.addEventListener('wheel',event=>{
  if(innerWidth<=800)return;
  if(event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
  event.preventDefault();
  const unit=event.deltaMode===1?18:event.deltaMode===2?width:1;
  viewport.scrollBy({left:event.deltaY*unit,behavior:'instant'});
 },{passive:false});
 addEventListener('keydown',event=>{
  if(event.altKey||event.metaKey||event.ctrlKey||event.shiftKey)return;
  if(event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
  if(event.target!==document.body&&!viewport.contains(event.target)&&!event.target.closest('.ride-navigation'))return;
  if(['ArrowRight','PageDown','ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();page(['ArrowRight','PageDown'].includes(event.key)?1:-1);}
  else if(event.key==='Home'||event.key==='End'){event.preventDefault();jump(event.key==='Home'?0:panels.length-1);}
 });
 // Native focus scrolling keeps individual links reachable inside wider panels.
 // Do not snap a whole panel back to its beginning when a later tile gets focus.
 function atDistance(distance){return geometry.atDistance(route,distance);}
 function distanceAtX(x){return geometry.distanceAtX(route,x);}
 function station(x,y,platformWidth){
  const group=el('g',{'class':'drawn-station'});
  el('path',{d:`M ${x} ${y+13} h ${platformWidth}`,fill:'none',stroke:'#171717','stroke-width':3},group);
  for(const fraction of [.06,.48,.94])el('path',{d:`M ${x+platformWidth*fraction} ${y+13} v 22`,stroke:'#bdbdbd','stroke-width':2},group);
 }
 function build(){
  const oldWidth=width,position=viewport.scrollLeft/oldWidth;
  const oldPanel=layout.findIndex(p=>viewport.scrollLeft>=p.x&&viewport.scrollLeft<p.x+p.width);
  const fraction=oldPanel>=0?(viewport.scrollLeft-layout[oldPanel].x)/layout[oldPanel].width:0;
  width=viewport.clientWidth;height=viewport.clientHeight;
  if(!width||!height)return;
  document.documentElement.style.setProperty('--panel-width',width+'px');
  document.documentElement.style.setProperty('--ride-height',height+'px');
  layout=panels.map(panel=>({id:panel.id,x:panel.offsetLeft,width:panel.offsetWidth}));
  const worldBox=world.getBoundingClientRect();
  tileBounds=[...world.querySelectorAll('.track-tile')].map(tile=>{const r=tile.getBoundingClientRect();return{left:r.left-worldBox.left,right:r.right-worldBox.left,top:r.top-worldBox.top,bottom:r.bottom-worldBox.top,side:tile.dataset.trackSide};});
  const worldWidth=layout[layout.length-1].x+layout[layout.length-1].width;
  if(innerWidth<=800){scene.replaceChildren();route=null;return;}
  scene.replaceChildren();scene.setAttribute('viewBox',`0 0 ${worldWidth} ${height}`);scene.setAttribute('width',worldWidth);scene.setAttribute('height',height);scene.style.width=worldWidth+'px';
  const w=width,h=height;
  route=geometry.makeRoute({width:w,height:h,panels:layout,tiles:tileBounds});
  const d=route.d;
  // A single ink line: no lift machinery, ties, or supports.
  el('path',{d,fill:'none',stroke:'#0b0b0b','stroke-width':4,'class':'cartoon-track'});
  const train=el('g',{'id':'ride-train'});cars=[];
  for(let i=0;i<3;i++){
   const car=el('g',{},train);
   for(const x of [-11,8]){
    el('circle',{cx:x,cy:-36,r:4.5,fill:'#252820'},car);
    el('path',{d:`M ${x} -28 V -15 M ${x-6} -23 H ${x+6}`,fill:'none',stroke:'#252820','stroke-width':5,'stroke-linecap':'round'},car);
   }
   el('polygon',{points:'-23,-18 18,-18 25,-7 19,0 -19,0',fill:i===1?'#fafaf8':'#777770',stroke:'#252820','stroke-width':2},car);
   cars.push(car);
  }
  viewport.scrollLeft=oldPanel>=0?layout[oldPanel].x+fraction*layout[oldPanel].width:position*width;
  paint();
 }
 function paint(){
  frame=0;
  const scroll=viewport.scrollLeft,max=viewport.scrollWidth-width;
  const progress=Math.max(0,Math.min(1,scroll/(max||1)));
  bar.style.transform=`scaleX(${progress})`;
  let index=0;for(let i=0;i<layout.length;i++)if(layout[i].x<=scroll+width*.3)index=i;
  if(index!==active){active=index;stops.forEach((stop,i)=>{if(i===index)stop.setAttribute('aria-current','step');else stop.removeAttribute('aria-current');});previous.disabled=scroll<1;next.disabled=scroll>=max-1;counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(panels.length).padStart(2,'0')}`;}
  previous.disabled=scroll<1;next.disabled=scroll>=max-1;
  panels.forEach((panel,i)=>{const entry=Math.max(0,Math.min(1,(scroll+width-layout[i].x)/(width*.65)));panel.style.setProperty('--entry-opacity',String(reduce.matches?1:entry));panel.style.setProperty('--entry-shift',(reduce.matches?0:(1-entry)*32)+'px');});
  if(!route)return;
  // Keep the train on screen while it advances along the shared world.
  const leadX=scroll+width*(.34+.10*Math.min(1,scroll/width));
  const distance=distanceAtX(leadX),scale=width<600?.8:1;
  cars.forEach((car,i)=>{const offset=distance-i*51*scale,p=atDistance(offset),a=atDistance(offset-2),b=atDistance(offset+2),angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;car.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle}) scale(${scale})`);});
 }
 addEventListener('scroll',()=>{if(innerWidth>800)return;let index=0;panels.forEach((panel,i)=>{if(panel.getBoundingClientRect().top<innerHeight*.45)index=i;});stops.forEach((stop,i)=>{if(i===index)stop.setAttribute('aria-current','step');else stop.removeAttribute('aria-current');});},{passive:true});
 viewport.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(paint);},{passive:true});
 let resizeFrame=0;
 new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(build);}).observe(viewport);
 document.body.classList.add('ride-ready');
 build();document.fonts.ready.then(()=>{build();handleHash();});
 reduce.addEventListener('change',()=>{viewport.scrollTo({left:viewport.scrollLeft,behavior:'instant'});});
 // Small read-only surface for checking geometry and navigation in a preview.
 window.horizontalRide={getState:()=>({active,width,height,scroll:viewport.scrollLeft,max:viewport.scrollWidth-width,layout,tileBounds,routeLength:route?.length,train:cars.map(car=>car.getAttribute('transform')),stops:panels.length}),jump};
})();
