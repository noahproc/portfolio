const assert=require('node:assert/strict');
const G=require('../horizontal-geometry.js');
function fixture(w,h){
 const mobile=w<=700,factors=mobile?[1,1,2.85,4.5,1]:[1,1,1.35,1.95,1];let x=0;
 const panels=['station','transplant','research','thinking','next-stop'].map((id,i)=>{const p={id,x,width:w*factors[i]};x+=p.width;return p;});
 const r=panels[2],t=panels[3];
 const tiles=mobile?[
  {left:r.x+w*1.05,right:r.x+w*1.84,top:h*.12,bottom:h*.63,side:'below'},
  {left:r.x+w*1.98,right:r.x+w*2.74,top:h*.42,bottom:h*.71,side:'above'}
 ]:[
  {left:r.x+w*.49,right:r.x+w*.89,top:h*.09,bottom:h*.65,side:'below'},
  {left:r.x+w*.98,right:r.x+w*1.27,top:h*.42,bottom:h*.72,side:'above'}
 ];
 for(let i=0;i<4;i++){const left=t.x+w*(mobile?.08+i*1.1:.36+i*.4),top=mobile?(i%2?Math.max(h*.13,75):h*.39):h*(i%2?.43:.08);tiles.push({left,right:left+w*(mobile?.82:.27),top,bottom:top+h*(mobile?.42:.48),side:i%2?'above':'below'});}
 return{width:w,height:h,panels,tiles,worldWidth:x};
}
for(const [w,h] of [[1920,350],[1440,700],[1440,500],[1024,500],[768,600],[390,550],[320,380],[390,300]]){
 const f=fixture(w,h),route=G.makeRoute(f),scale=w<600?.8:1;
 for(let i=1;i<route.samples.length;i++)assert(route.samples[i].x>route.samples[i-1].x,'rail remains open and moves right');
 for(let i=1;i<route.segments.length;i++){
  const a=route.segments[i-1],b=route.segments[i];assert.equal(a.p1.y,a.c2.y);assert.equal(b.p0.y,b.c1.y);
 }
 for(const tile of f.tiles){const crossing=route.samples.filter(p=>p.x>=tile.left&&p.x<=tile.right);assert(crossing.length);for(const p of crossing){if(tile.side==='above')assert(p.y<=tile.top-12,'rail clears top of lower tile');else assert(p.y>=tile.bottom+12,'rail clears bottom of upper tile');}}
 for(const p of route.samples)if(p.x>=w*1.07&&p.x<=w*1.94)assert(p.y-36*scale>=h*.77,'Transplant train clears the prototype and actions');
 const max=f.worldWidth-w;let min=Infinity,high=-Infinity;
 for(let i=0;i<=2000;i++){
  const scroll=max*i/2000,lead=scroll+w*(.34+.10*Math.min(1,scroll/w)),d=G.distanceAtX(route,lead);
  for(let car=0;car<3;car++){
   const p=G.atDistance(route,d-car*51*scale);assert(p.x-scroll>21*scale,'tail remains in view');assert(p.x-scroll<w-25*scale,'nose remains in view');assert(p.y>=36*scale&&p.y<h-4,'train stays vertically visible');min=Math.min(min,p.y);high=Math.max(high,p.y);
  }
 }
 assert(high-min>h*.6,'substantial hills and valleys');
 console.log(`${w}×${h}: open track, smooth joins, all six tile clearances, visible three-car train, lift and drops passed.`);
}
module.exports={fixture};
