const assert=require('node:assert/strict');
const {makeRoute,pointAt,timeline,distanceAt}=require('../ride-route.js');
for(const [w,vh,mobile] of [[1440,900,false],[1024,768,false],[390,844,true],[1440,650,false]]){
 const start={x:w*.09,y:600,w:w*.55,h:100,right:w*.64};
 const p={y:800,h:640,bottom:1440},r={y:1570,h:600,bottom:2170};
 const orbit={x:w*.12,y:2460,w:mobile?270:300,h:220};
 const end={x:w*.09,y:mobile?4300:3430,w:310,h:80};
 const tiles=mobile?[{x:40,y:2900,bottom:3200},{x:210,y:2900,bottom:3200},{x:40,y:3300,bottom:3700},{x:210,y:3300,bottom:3700}]:[{x:w*.52,y:2340,bottom:2670},{x:w*.75,y:2340,bottom:2670},{x:w*.52,y:2750,bottom:3130},{x:w*.75,y:2750,bottom:3130}];
 tiles.forEach((t,i)=>{t.right=t.x+(mobile?140:w*.2);});
 const climate={data:{right:w*.45},story:{x:w*.57},feature:{y:1570,h:330,bottom:1900},rows:[{y:1960,bottom:2040},{y:2120,bottom:2200}]};
 const route=makeRoute({w,start,p,r,orbit,end,tiles,mobile,climate,viewport:vh}),max=end.y+end.h+230-vh,clock=timeline(route,vh,max);
 for(let i=1;i<route.segments.length;i++){const a=route.segments[i-1],b=route.segments[i],u={x:a.p1.x-a.c2.x,y:a.p1.y-a.c2.y},v={x:b.c1.x-b.p0.x,y:b.c1.y-b.p0.y};assert(Math.abs(u.x*v.y-u.y*v.x)/(Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y)||1)<1e-8,`tangent break ${i}`);assert(u.x*v.x+u.y*v.y>0);}
 for(let i=1;i<clock.times.length;i++)assert(clock.times[i]>clock.times[i-1],'timeline strictly increasing');
 assert.equal(distanceAt(route,clock,clock.start),0);assert.equal(distanceAt(route,clock,max),route.length);
 let previous=0;for(let i=0;i<=10000;i++){const distance=distanceAt(route,clock,max*i/10000);assert(distance>=previous);previous=distance;}
 const last=pointAt(route,route.length),before=pointAt(route,route.length-10);assert(last.x<before.x);assert(Math.abs(last.y-before.y)<.001);
 assert(clock.feasible,`viewport schedule infeasible ${w}×${vh}`);
 for(let i=0;i<route.samples.length;i++){const sample=route.samples[i],scroll=clock.times[i];assert(Math.abs(distanceAt(route,clock,scroll)-sample.distance)<.001,'every rail sample is reached');const screenY=sample.y-scroll;assert(screenY>=64&&screenY<=vh-64,'train stays in viewport');}
 if(!mobile){
  for(const tile of tiles.slice(0,2))for(const sample of route.samples){
   if(sample.x>tile.x&&sample.x<tile.right&&sample.y>tile.y&&sample.y<tile.y+210){
    const cornerDistance=Math.min(Math.hypot(sample.x-tile.x,sample.y-tile.y),Math.hypot(sample.x-tile.right,sample.y-tile.y));
    assert(cornerDistance<34,`first-row corner clearance ${w}: ${JSON.stringify({sample,tile,cornerDistance})}`);
   }
  }
 }
 assert(route.bankEndDistance>route.bankStartDistance);
 const brakeDistance=route.samples.find(s=>s.segment===route.brakeStart).distance;
 assert(route.bankEndDistance<=brakeDistance,'inversion finishes before station approach');
 const arrival=route.samples.filter(s=>s.segment>=route.brakeStart);
 for(let i=1;i<arrival.length;i++){
  assert(arrival[i].x<=arrival[i-1].x+.001,'station approach never doubles back horizontally');
  assert(arrival[i].y>=arrival[i-1].y-.001,'station approach never doubles back vertically');
 }
 assert.equal(route.segments.length-route.brakeStart,2,'one rounded turn and one flat station run');
 if(!mobile){
  const gutter=(climate.feature.bottom+climate.rows[0].y)/2;
  const turn=route.segments.find(s=>Math.abs(s.p1.y-gutter)<.01);
  assert(turn&&turn.p1.x<turn.p0.x,'research gutter turns left before Lake Erie');
 }
 console.log(`${w}×${vh}: smooth joins, ordered full traversal, viewport bounds and final station passed (${Math.round(route.length)}px rail).`);
}

// Regression: deep copy must not reintroduce a loop or hide the train.
// It must remain possible to see the car on the entire route, including between samples.

for(const w of [1024,1440])for(const vh of [650,768,900])for(const copyHeight of [220,300]){
 const firstY=2400,orbit={x:w*.12,y:firstY+280,w:300,h:copyHeight};
 const padding=0;
 const makeLayout=pad=>({w,viewport:vh,mobile:false,
  start:{x:w*.09,y:600,w:w*.55,h:100},p:{y:800,h:640,bottom:1440},
  r:{y:1570,h:600,bottom:2200},orbit,
  end:{x:w*.09,y:3700+pad,w:310,h:80},
  climate:{data:{right:w*.45},story:{x:w*.57},feature:{y:1570,h:330,bottom:1900},rows:[{y:1960,bottom:2040},{y:2120,bottom:2200}]},
  tiles:[{x:w*.52,y:firstY+pad,right:w*.72,bottom:2730+pad},{x:w*.75,y:firstY+pad,right:w*.95,bottom:2730+pad},{x:w*.52,y:2810+pad,right:w*.72,bottom:3190+pad},{x:w*.75,y:2810+pad,right:w*.95,bottom:3190+pad}]});
 const route=makeRoute(makeLayout(padding));
 const clock=timeline(route,vh,4010+padding-vh);
 assert(clock.feasible,`open-route visibility ${w}×${vh}, copy ${copyHeight}`);
 for(let i=0;i<=20000;i++){
  const scroll=clock.start+(clock.end-clock.start)*i/20000;
  const position=pointAt(route,distanceAt(route,clock,scroll));
  assert(position.y-scroll>=64&&position.y-scroll<=vh-64,'car visible continuously across scroll');
 }
}

console.log('12 deep-copy layouts: continuous visibility passes with the open route.');
