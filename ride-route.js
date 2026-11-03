/* Shared numeric geometry: the SVG and animation use exactly the same cubics. */
(function(root){
function makeRoute(layout){
 const {w,start,p,r,orbit,end,tiles,mobile,climate,viewport=900}=layout,l=w*.04,right=w*.95;
 const sy=start.y+start.h*.55,ey=end.y+end.h*.5;
 const segments=[];let point={x:start.x+start.w*.45,y:sy},tangent={x:1,y:0};
 const initial={...point};
 function to(x,y,dx,dy,handle,departure){
  const distance=Math.hypot(x-point.x,y-point.y),a=departure??Math.min(distance*.42,210),m=Math.hypot(dx,dy)||1,b=handle??a;
  const c1={x:point.x+tangent.x*a,y:point.y+tangent.y*a},c2={x:x-dx/m*b,y:y-dy/m*b};
  segments.push({p0:point,c1,c2,p1:{x,y}});point={x,y};tangent={x:dx/m,y:dy/m};
 }
 // Leave the station level; the first descent gets a broad horizontal lead-in.
 to(w*.78,sy,1,0);
 to(right-28,p.y+p.h*.22,0,1,150);
 // Begin the prototype's bottom turn well before its lower corner.
 to(right-28,p.y+p.h*.5,0,1,p.h*.12,p.h*.12);
 if(climate&&!mobile){
  const mid=(climate.data.right+climate.story.x)/2;
  const gap1=(climate.feature.bottom+climate.rows[0].y)/2;
  const edge=Math.max(26,w*.025);
  // A wide horseshoe starts above the climate headline, then descends in its gutter.
  to(mid+175,p.bottom+65,-1,0,(point.x-mid-175)*.5522847498,(p.bottom+65-point.y)*.5522847498);
  to(mid,climate.feature.y+climate.feature.h*.38,0,1,145,155);
  to(mid-115,gap1,-1,0,115,130);
  // Both research rows use the same outside-left corridor.
  to(edge+130,gap1,-1,0,100);
  to(edge,climate.rows[0].y+110,0,1,95,90);
  to(edge,climate.rows[1].bottom+95,0,1,110);
 }else{
  to(right-100,p.bottom+35,-1,0,130);
  to(w*.5,p.bottom+62,-1,0,150);
  to(l+25,r.y+r.h*.55,0,1);
  to(l+45,r.bottom+60,0,1);
 }
 let bankStartSegment,bankEndSegment;
 let brakeStart;
 if(!mobile){
  const first=tiles[0],second=tiles[1];
  // A single open sweep reaches the card crest without circling the copy.
  to(first.x+95,first.y-75,1,0,110,80);
  to((first.right+second.x)/2,first.y-38,1,0,90);
  to(second.right-85,second.y-80,1,.12,110);
  const outside=Math.min(w-22,Math.max(right,second.right+45));
  to(outside,second.y+125,0,1,130);
  bankStartSegment=segments.length;
  to(outside-32,(second.y+125+tiles[2].bottom)/2,-.08,1,145);
  to(outside-10,Math.max(tiles[2].bottom,tiles[3].bottom)-90,0,1,120);
  bankEndSegment=segments.length;
 }else{
  to(l+30,orbit.y+orbit.h+45,.2,1);
  to(w*.5,orbit.y+orbit.h+90,1,0);
  to(right-5,orbit.y+orbit.h+150,0,1);
  bankStartSegment=segments.length;
  to(right-20,tiles[tiles.length-1].bottom+55,0,1);
  bankEndSegment=segments.length;
 }
 brakeStart=segments.length;
 // One broad quarter-turn after the inversion, followed by a level station run.
 const approach=point;
 const radiusX=mobile?Math.min(w*.27,320):Math.min(w*.36,460),drop=Math.max(1,ey-approach.y),k=.5522847498;
 segments.push({p0:point,c1:{x:point.x,y:point.y+drop*k},c2:{x:point.x-radiusX+radiusX*k,y:ey},p1:{x:point.x-radiusX,y:ey}});
 point={x:approach.x-radiusX,y:ey};tangent={x:-1,y:0};
 // Continue far enough into the station for the entire three-car train to arrive.
 to(end.x+25,ey,-1,0,50);
 const d=`M ${initial.x} ${initial.y} `+segments.map(s=>`C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`).join(' ');
 const samples=[];let length=0,previous;
 segments.forEach((s,index)=>{for(let j=0;j<=160;j++){if(index&&j===0)continue;const t=j/160,v=1-t,x=v*v*v*s.p0.x+3*v*v*t*s.c1.x+3*v*t*t*s.c2.x+t*t*t*s.p1.x,y=v*v*v*s.p0.y+3*v*v*t*s.c1.y+3*v*t*t*s.c2.y+t*t*t*s.p1.y;if(previous)length+=Math.hypot(x-previous.x,y-previous.y);const q={x,y,distance:length,segment:index};samples.push(q);previous=q;}});
 const bankStartDistance=samples.find(s=>s.segment===(bankStartSegment??brakeStart)).distance,bankEndDistance=samples.find(s=>s.segment===(bankEndSegment??brakeStart+2)).distance;
 return {d,samples,length,segments,brakeStart,bankStartDistance,bankEndDistance};
}
function pointAt(route,distance){const a=route.samples;distance=Math.max(0,Math.min(route.length,distance));let lo=0,hi=a.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(a[m].distance<distance)lo=m;else hi=m;}const t=(distance-a[lo].distance)/(a[hi].distance-a[lo].distance||1);return {x:a[lo].x+(a[hi].x-a[lo].x)*t,y:a[lo].y+(a[hi].y-a[lo].y)*t,segment:a[hi].segment};}
function timeline(route,viewport,scrollMax){
 const samples=route.samples,n=samples.length;
 const start=Math.max(0,samples[0].y-viewport*.72),end=scrollMax;
 let low,high,feasible=false,minimumScrollPerPixel=.32;
 // Reserve scroll distance for every part of the rail, including the open card crest.
 // Adapt the speed bound to the viewport rather than skipping a route branch.
 for(let attempt=0;attempt<10;attempt++){
  low=[];high=[];
  for(let i=0;i<n;i++){const offset=samples[i].distance*minimumScrollPerPixel,y=samples[i].y;low[i]=Math.max(start,y-viewport+65)-offset;high[i]=Math.min(end,y-65)-offset;}
  for(let i=1;i<n;i++)low[i]=Math.max(low[i],low[i-1]);
  for(let i=n-2;i>=0;i--)high[i]=Math.min(high[i],high[i+1]);
  feasible=low.every((v,i)=>v<=high[i]);
  if(feasible)break;
  minimumScrollPerPixel*=.5;
 }
 const times=samples.map((s,i)=>{const offset=s.distance*minimumScrollPerPixel,desired=start+(end-start)*s.distance/route.length-offset;return (feasible?Math.max(low[i],Math.min(high[i],desired)):desired)+offset;});
 times[0]=start;times[n-1]=end;
 return {times,feasible,start,end,minimumScrollPerPixel};
}
function distanceAt(route,schedule,scroll){const a=schedule.times;if(scroll<=a[0])return 0;if(scroll>=a[a.length-1])return route.length;let lo=0,hi=a.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(a[m]<scroll)lo=m;else hi=m;}const t=(scroll-a[lo])/(a[hi]-a[lo]);return route.samples[lo].distance+(route.samples[hi].distance-route.samples[lo].distance)*t;}
const api={makeRoute,pointAt,timeline,distanceAt};if(typeof module!=='undefined')module.exports=api;else root.RideRoute=api;
})(typeof window!=='undefined'?window:globalThis);
