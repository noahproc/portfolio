/* Open, monotone rail geometry. Tile bounds determine the hills and valleys. */
(function(root){
 function makeRoute({width:w,height:h,panels,tiles=[]}){
  const start={x:w*.04,y:h*.82},segments=[];let point=start;
  function to(x,y){if(x<=point.x)return;const dx=x-point.x;segments.push({p0:point,c1:{x:point.x+dx*.38,y:point.y},c2:{x:x-dx*.38,y},p1:{x,y}});point={x,y};}
  // Gentle, playful curves run in the reserved margin beneath the clippings.
  for(const panel of panels){
   to(panel.x+panel.width*.26,h*.80);
   to(panel.x+panel.width*.58,h*.94);
   to(panel.x+panel.width*.85,h*.81);
  }
  const end=panels[panels.length-1];
  to(end.x+end.width*.98,h*.86);
  const d=`M ${start.x} ${start.y} `+segments.map(s=>`C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`).join(' ');
  let length=0,last;const samples=[];
  for(const [index,s] of segments.entries())for(let j=0;j<=160;j++){
   if(index&&j===0)continue;const t=j/160,v=1-t,x=v*v*v*s.p0.x+3*v*v*t*s.c1.x+3*v*t*t*s.c2.x+t*t*t*s.p1.x,y=v*v*v*s.p0.y+3*v*v*t*s.c1.y+3*v*t*t*s.c2.y+t*t*t*s.p1.y;
   if(last)length+=Math.hypot(x-last.x,y-last.y);last={x,y,d:length};samples.push(last);
  }
  return {d,segments,samples,length};
 }
 function atDistance(route,distance){const a=route.samples;distance=Math.max(0,Math.min(route.length,distance));let lo=0,hi=a.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(a[m].d<distance)lo=m;else hi=m;}const t=(distance-a[lo].d)/(a[hi].d-a[lo].d||1);return{x:a[lo].x+(a[hi].x-a[lo].x)*t,y:a[lo].y+(a[hi].y-a[lo].y)*t};}
 function distanceAtX(route,x){const a=route.samples;let lo=0,hi=a.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(a[m].x<x)lo=m;else hi=m;}const t=Math.max(0,Math.min(1,(x-a[lo].x)/(a[hi].x-a[lo].x||1)));return a[lo].d+(a[hi].d-a[lo].d)*t;}
 const api={makeRoute,atDistance,distanceAtX};if(typeof module!=='undefined')module.exports=api;else root.HorizontalGeometry=api;
})(typeof window!=='undefined'?window:globalThis);
