/* Small local effects, with no third-party scripts or network dependencies. */
(() => {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 document.querySelectorAll('.page-header, .ambient-section').forEach(network);
 function network(surface){
  surface.classList.add('network-surface');
  const canvas=document.createElement('canvas');canvas.className='header-network';canvas.setAttribute('aria-hidden','true');surface.prepend(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;
  const dots=Array.from({length:32},(_,i)=>({x:(i*.61803398875)%1,y:(i*.381966+.13)%1,vx:Math.sin(i*3.1)*.000025,vy:Math.cos(i*2.3)*.000035}));let w=1,h=1,visible=false,frame=0,last=0;
  function draw(now){frame=0;const dt=Math.min(now-last||16,40);last=now;ctx.clearRect(0,0,w,h);const moving=!reduce.matches&&!document.hidden&&!document.body.classList.contains('motion-paused');for(const p of dots){if(moving){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<0||p.x>1)p.vx*=-1;if(p.y<0||p.y>1)p.vy*=-1;}ctx.beginPath();ctx.arc(p.x*w,p.y*h,2,0,Math.PI*2);ctx.fillStyle='#ddd';ctx.fill();}for(let i=0;i<dots.length;i++)for(let j=i+1;j<dots.length;j++){const a=dots[i],b=dots[j],d=Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);if(d>155)continue;ctx.strokeStyle=`rgba(255,255,255,${(1-d/155)*.26})`;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}if(visible&&moving)frame=requestAnimationFrame(draw);}
  function start(){if(!frame){last=0;frame=requestAnimationFrame(draw);}}
  new ResizeObserver(()=>{w=surface.clientWidth;h=surface.clientHeight;const ratio=Math.min(devicePixelRatio,2);canvas.width=w*ratio;canvas.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);start();}).observe(surface);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0;}}).observe(surface);
  reduce.addEventListener('change',start);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)start();});
 }
})();

/* Reveal complete, selectable text once; layout and screen-reader text stay stable. */
(() => {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const animations=[];
 if(reduce.matches||document.body.classList.contains('motion-paused'))return;
 document.querySelectorAll('[data-typewriter]').forEach(target=>{
  let letters=[...target.querySelectorAll('.wave-letter')];
  if(!letters.length){
   const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT),nodes=[];
   while(walker.nextNode())nodes.push(walker.currentNode);
   for(const node of nodes){
    const fragment=document.createDocumentFragment();
    for(const word of node.textContent.split(/(\s+)/)){
     if(!word.trim()){fragment.append(document.createTextNode(word));continue;}
     const wrapper=document.createElement('span');wrapper.className='type-word';
     for(const char of word){const letter=document.createElement('span');letter.className='type-letter';letter.textContent=char;wrapper.append(letter);letters.push(letter);}
     fragment.append(wrapper);
    }
    node.replaceWith(fragment);
   }
  }
  const delay=Number(target.dataset.typeDelay)||120,step=38;
  letters.forEach((letter,index)=>animations.push(letter.animate([{opacity:0},{opacity:1}],{duration:1,delay:delay+index*step,fill:'backwards'})));
 });
 function finish(){animations.forEach(animation=>animation.cancel());}
 reduce.addEventListener('change',e=>{if(e.matches)finish();});
 new MutationObserver(()=>{if(document.body.classList.contains('motion-paused'))finish();}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
