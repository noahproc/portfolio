/* Controller checks use measured-layout fixtures; no browser or network needed. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const G=require('../horizontal-geometry.js');
const {fixture}=require('./horizontal-geometry-check.cjs');
function harness(width,height,reduced=false){
 let f=fixture(width,height);const frames=[],observers=[],events={};
 class Element{
  constructor(id){this.id=id;this.attrs={};this.children=[];this.style={setProperty:(k,v)=>this.attrs[k]=v};this.handlers={};this.scrollLeft=0;this.classList={add(){},contains(){return false;}};}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}removeAttribute(k){delete this.attrs[k];}
  append(n){this.children.push(n);}replaceChildren(){this.children=[];}addEventListener(k,fn){this.handlers[k]=fn;}
  get clientWidth(){return width;}get clientHeight(){return height;}get scrollWidth(){return f.worldWidth;}
  get offsetLeft(){return f.panels.find(p=>p.id===this.id)?.x||0;}get offsetWidth(){return f.panels.find(p=>p.id===this.id)?.width||width;}
  getBoundingClientRect(){return{left:-ids['ride-viewport'].scrollLeft,top:0,right:f.worldWidth-ids['ride-viewport'].scrollLeft,bottom:height};}
  scrollTo(options){this.lastScroll=options;this.scrollLeft=Math.max(0,Math.min(this.scrollWidth-width,options.left));this.handlers.scroll?.();}
  scrollBy(options){this.scrollTo({...options,left:this.scrollLeft+options.left});}
  focus(){}contains(node){return node===this;}closest(){return null;}
 }
 const ids=Object.fromEntries(['ride-viewport','ride-world','ride-scene','ride-previous','ride-next','ride-counter','ride-progress'].map(id=>[id,new Element(id)]));
 const panels=f.panels.map(p=>new Element(p.id));
 const tiles=f.tiles.map((t,i)=>{const n=new Element();n.dataset={trackSide:t.side};n.getBoundingClientRect=()=>{const a=f.tiles[i],scroll=ids['ride-viewport'].scrollLeft;return{left:a.left-scroll,right:a.right-scroll,top:a.top,bottom:a.bottom};};return n;});
 const stops=panels.map((p,i)=>{const n=new Element();n.dataset={rideTo:String(i)};return n;});
 ids['ride-world'].querySelectorAll=s=>s==='.ride-panel'?panels:tiles;
 const document={body:new Element('body'),documentElement:new Element('html'),fonts:{ready:{then(fn){fn();}}},querySelector:s=>ids[s.slice(1)],querySelectorAll:()=>stops,createElementNS:()=>new Element()};
 const media={matches:reduced,addEventListener(){}};
 const context={document,window:{HorizontalGeometry:G},location:{hash:''},matchMedia:()=>media,addEventListener:(k,fn)=>events[k]=fn,requestAnimationFrame:fn=>(frames.push(fn),frames.length),cancelAnimationFrame(){},ResizeObserver:class{constructor(fn){observers.push(fn);}observe(){}},console};
 vm.runInNewContext(fs.readFileSync('horizontal-ride.js','utf8'),context);
 function flush(){let limit=10;while(frames.length&&limit--)frames.shift()();assert(limit>0,'no perpetual rendering loop');}
 flush();return {ids,context,stops,panels,events,flush,state:()=>context.window.horizontalRide.getState(),jump(i){context.window.horizontalRide.jump(i);flush();},resize(w,h){width=w;height=h;f=fixture(width,height);observers.forEach(fn=>fn());flush();},wheel(event){let prevented=false;ids['ride-viewport'].handlers.wheel({ctrlKey:false,shiftKey:false,deltaX:0,deltaY:120,deltaMode:0,target:ids['ride-viewport'],preventDefault(){prevented=true;},...event});flush();return prevented;}};
}
for(const [w,h] of [[1440,700],[1024,500],[390,550],[320,380]]){
 const app=harness(w,h);assert.equal(app.state().active,0);assert(app.ids['ride-previous'].disabled);
 assert(app.wheel({}));assert.equal(app.state().scroll,120);
 assert.equal(app.wheel({ctrlKey:true}),false);assert.equal(app.wheel({deltaX:150}),false);
 app.jump(2);assert.equal(app.state().scroll,w*2,'research stop follows its real offset');assert.equal(app.stops[2].attrs['aria-current'],'step');
 app.jump(3);const before=app.state().scroll;app.ids['ride-next'].handlers.click();app.flush();assert(Math.abs(app.state().scroll-before-w*.85)<.001,'next advances one screen without skipping writing tiles');assert.equal(app.state().active,3);
 let prevented=false;app.events.keydown({target:app.ids['ride-viewport'],key:'Home',preventDefault(){prevented=true;}});app.flush();assert(prevented);assert.equal(app.state().scroll,0);
 app.events.keydown({target:app.ids['ride-viewport'],key:'End',preventDefault(){}});app.flush();assert.equal(app.state().active,4);assert(app.ids['ride-next'].disabled);
 app.jump(3);app.resize(w+10,h);assert.equal(app.state().active,3,'resize preserves the current stop');
 const worldWidth=app.state().layout.reduce((sum,p)=>sum+p.width,0);assert(Math.abs(app.state().max-(worldWidth-app.state().width))<.001,'scroll extent includes wider content panels');
 console.log(`${w}×${h}: five stops, measured offsets, wheel, keyboard, screen-sized navigation and resize passed.`);
}
const reduced=harness(390,550,true);reduced.jump(3);assert.equal(reduced.ids['ride-viewport'].lastScroll.behavior,'instant');assert.equal(reduced.state().active,3);console.log('Reduced-motion navigation passed.');
