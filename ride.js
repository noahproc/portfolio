import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildRoute, RailCurve, SAMPLES } from './coaster-geometry.js';

const DEV = ['localhost','127.0.0.1'].includes(location.hostname);
const layer=document.querySelector('#coaster-layer');
const motionButton=document.querySelector('#motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const tiles=[...document.querySelectorAll('.product-stage,.data-art,.writing-list a')];
const opaqueSelector='.navigation,.intro-copy,.project-copy,.product-stage,.research-head,.data-art,.research-feature>div:last-child,.research-row,.writing-head,.writing-list a,.last-stop>h2,.last-stop>p,.last-stop>div,.work-heading h2,footer';
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera();
let renderer;
try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); }
catch(error){layer.dataset.error='WebGL unavailable';motionButton.disabled=true;console.error('Coaster unavailable; all portfolio content remains accessible.',error);}
if(renderer) start();

function start(){
  renderer.setClearColor(0xffffff,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.domElement.id='coaster-canvas';layer.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x6c527f,2.1));
  const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(-500,1200,1800);scene.add(key);
  const fill=new THREE.DirectionalLight(0xb8caff,1.5);fill.position.set(900,-1000,500);scene.add(fill);
  let world=new THREE.Group();scene.add(world);
  let route,cars=[],couplers=[],layout,cardRects=[],width=0,height=0,scrollMax=1;
  let current=0,target=0,lastScroll=-1,lastTime=0,raf=0,resizePending=true,paused=reduced.matches;
  let mouseX=0,mouseY=0,parallaxX=0,parallaxY=0,staticImage=null,anchors=[];
  const frameTimes=[];
  const position=new THREE.Vector3(),look=new THREE.Vector3(),unitY=new THREE.Vector3(0,1,0);
  const colors=[new THREE.Color('#253b79'),new THREE.Color('#71318f'),new THREE.Color('#9b254b')];
  const gradient=t=>t<.5?colors[0].clone().lerp(colors[1],t*2):colors[1].clone().lerp(colors[2],(t-.5)*2);
  function documentRect(el){const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top+scrollY,bottom:r.bottom+scrollY};}
  function readLayout(){
    width=innerWidth;height=innerHeight;scrollMax=Math.max(1,document.documentElement.scrollHeight-height);
    const bottom=selector=>documentRect(document.querySelector(selector)).bottom;
    const stationRect=documentRect(document.querySelector('.station-anchor'));
    layout={width,stationX:(stationRect.left+stationRect.right)/2,stationY:stationRect.bottom-24,transplantBottom:bottom('#transplant'),researchBottom:bottom('#research'),writingBottom:bottom('#writing'),endY:bottom('.last-stop')-30,mobile:width<768};
    cardRects=tiles.map(el=>({el,...documentRect(el)}));
  }
  function disposeWorld(){
    const geometries=new Set(),materials=new Set();world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(world);world=new THREE.Group();scene.add(world);
  }
  function makeTrack(){
    const scale=layout.mobile?.72:1,railSeparation=11*scale;
    const material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.42,roughness:.31});
    const segments=layout.mobile?1400:2000;
    const specs=[[-railSeparation,0,1.55*scale],[railSeparation,0,1.55*scale],[0,-8*scale,2.5*scale]];
    specs.forEach(([side,up,radius])=>{
      const geometry=new THREE.TubeGeometry(new RailCurve(route,side,up),segments,radius,8,false);
      const attribute=new Float32Array(geometry.attributes.position.count*3);
      for(let i=0;i<attribute.length/3;i++){const c=gradient(Math.floor(i/9)/segments);attribute.set([c.r,c.g,c.b],i*3);}
      geometry.setAttribute('color',new THREE.BufferAttribute(attribute,3));
      const mesh=new THREE.Mesh(geometry,material);mesh.name=side?'rail':'spine';world.add(mesh);
    });
    const count=Math.floor(route.length/(layout.mobile?17:13));
    const tieMaterial=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.35,roughness:.4});
    const ties=new THREE.InstancedMesh(new THREE.BoxGeometry(2*scale,2*scale,24*scale),tieMaterial,count);
    const braces=new THREE.InstancedMesh(new THREE.CylinderGeometry(.7*scale,.7*scale,1,5),tieMaterial,count*2);
    const dummy=new THREE.Object3D(),a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3();
    for(let i=0;i<count;i++){
      const u=i/(count-1),f=route.frameAt(u),up=new THREE.Vector3(0,1,0).applyQuaternion(f.q),side=new THREE.Vector3(0,0,1).applyQuaternion(f.q);
      dummy.position.copy(f.p).addScaledVector(up,-2*scale);dummy.quaternion.copy(f.q);dummy.scale.set(1,1,1);dummy.updateMatrix();ties.setMatrixAt(i,dummy.matrix);ties.setColorAt(i,gradient(u));
      for(let j=0;j<2;j++){
        a.copy(f.p).addScaledVector(side,(j?1:-1)*railSeparation);b.copy(f.p).addScaledVector(up,-8*scale);
        direction.subVectors(b,a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(unitY,direction.clone().normalize());dummy.scale.set(1,direction.length(),1);dummy.updateMatrix();braces.setMatrixAt(i*2+j,dummy.matrix);braces.setColorAt(i*2+j,gradient(u));
      }
    }
    world.add(ties,braces);
    // A small physical platform under the center of the hero, below the tagline.
    const station=new THREE.Mesh(new RoundedBoxGeometry(232*scale,5*scale,52*scale,2,2),new THREE.MeshStandardMaterial({color:0xe7e4ed,metalness:.15,roughness:.6}));
    station.position.set(layout.stationX,-layout.stationY-13*scale,0);world.add(station);
    // Open-ended station shed: back wall, two piers, and a pitched roof.
    const shed=new THREE.Group(),wall=new THREE.MeshStandardMaterial({color:0xe9e0ee,roughness:.8}),roof=new THREE.MeshStandardMaterial({color:0x51335e,roughness:.6});
    const box=(x,y,z,px,py,pz,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat);m.position.set(px,py,pz);shed.add(m);return m;};
    box(190,68,4,0,34,-25,wall);box(9,68,55,-91,34,0,wall);box(9,68,55,91,34,0,wall);
    const roofShape=new THREE.Shape();roofShape.moveTo(-110,65);roofShape.lineTo(0,108);roofShape.lineTo(110,65);roofShape.closePath();
    const roofMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape,{depth:62,bevelEnabled:false}),roof);roofMesh.position.z=-31;shed.add(roofMesh);
    shed.scale.setScalar(scale);shed.position.set(layout.stationX-15*scale,-layout.stationY,0);world.add(shed);

  }
  function makeTrain(){
    const scale=layout.mobile?.72:1;
    const body=new THREE.MeshStandardMaterial({color:0x73379a,metalness:.58,roughness:.26});
    const seat=new THREE.MeshStandardMaterial({color:0x151d30,metalness:.25,roughness:.45});
    const skin=new THREE.MeshStandardMaterial({color:0xe6b896,roughness:.7});
    const shirt=new THREE.MeshStandardMaterial({color:0xbee0e1,roughness:.6});
    const metal=new THREE.MeshStandardMaterial({color:0xc4cbd9,metalness:.8,roughness:.22});
    const chassis=new RoundedBoxGeometry(35,10,26,3,3),shell=new RoundedBoxGeometry(7,17,21,2,2),cushion=new RoundedBoxGeometry(16,4,20,2,1.5);
    const head=new THREE.SphereGeometry(4.5,12,8),torso=new RoundedBoxGeometry(8,9,11,2,2),restraint=new THREE.CylinderGeometry(1,1,21,7),wheel=new THREE.CylinderGeometry(3,3,28,8);
    const count=layout.mobile?3:4;cars=[];couplers=[];
    for(let i=0;i<count;i++){
      const car=new THREE.Group();car.scale.setScalar(scale);
      const add=(geo,mat,x,y,z)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);car.add(mesh);return mesh;};
      add(chassis,body,0,7,0);add(shell,seat,-10,19,0);add(cushion,seat,0,14,0);
      add(torso,shirt,-1,22,0);add(head,skin,0,31,0);
      add(restraint,metal,7,22,0).rotation.x=Math.PI/2;
      add(wheel,seat,-11,1,0).rotation.x=Math.PI/2;add(wheel,seat,11,1,0).rotation.x=Math.PI/2;
      world.add(car);cars.push(car);
      if(i){const link=new THREE.Mesh(new THREE.CylinderGeometry(1.3*scale,1.3*scale,1,6),metal);world.add(link);couplers.push(link);}
    }
  }
  function rebuild(){
    readLayout();disposeWorld();route=buildRoute(layout);
    if(DEV){console.assert(route.maxTangentJump<=3,`Coaster tangent jump ${route.maxTangentJump.toFixed(3)}° exceeds 3° at ${SAMPLES} samples.`);}
    makeTrack();makeTrain();
    const parked=100/route.length;
    anchors=[[0,parked],...route.frames.map((f,i)=>[( -f.p.y-layout.stationY)/(layout.endY-layout.stationY),i/SAMPLES]).filter(([p,u])=>p>0&&p<1&&u>parked),[1,1]];
    target=progressToU(scrollY/scrollMax);current=paused?parked:target;
    renderer.setSize(width,height);camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.near=1;camera.far=20000;camera.updateProjectionMatrix();
    resizePending=false;updateCamera(paused?0:scrollY);placeTrain();renderer.render(scene,camera);
    if(paused)captureStatic();
    if(DEV) publishDiagnostics();
  }
  function progressToU(progress){
    const p=THREE.MathUtils.clamp(progress,0,1);let i=1;while(i<anchors.length-1&&p>anchors[i][0])i++;
    const [a,u]=anchors[i-1],[b,v]=anchors[i];return THREE.MathUtils.lerp(u,v,(p-a)/(b-a));
  }
  function updateCamera(scroll){
    // Camera-only ±3° cursor parallax. The train always stays on the spline.
    const pitch=THREE.MathUtils.degToRad(7),yaw=0,distance=2400;
    look.set(width/2,-scroll-height/2,0);
    camera.position.set(look.x+Math.sin(yaw)*distance,look.y+Math.sin(pitch)*distance,Math.cos(pitch)*Math.cos(yaw)*distance);camera.lookAt(look);camera.updateMatrixWorld();
  }
  function placeTrain(){
    const scale=layout.mobile?.72:1,gap=43*scale/route.length;
    const positions=[];
    cars.forEach((car,i)=>{const f=route.frameAt(Math.max(0,current-i*gap));car.position.copy(f.p);car.quaternion.copy(f.q);positions.push(f);});
    couplers.forEach((link,i)=>{
      const a=positions[i].p.clone().add(new THREE.Vector3(-18*scale,4*scale,0).applyQuaternion(positions[i].q));
      const b=positions[i+1].p.clone().add(new THREE.Vector3(18*scale,4*scale,0).applyQuaternion(positions[i+1].q));
      const d=b.clone().sub(a);link.position.copy(a).add(b).multiplyScalar(.5);link.quaternion.setFromUnitVectors(unitY,d.clone().normalize());link.scale.y=d.length();
    });
    position.copy(positions[0].p).project(camera);const screenY=(1-position.y)*height/2;
    cardRects.forEach(({el,top,bottom})=>el.classList.toggle('train-near',!paused&&screenY>=0&&screenY<=height&&Math.abs((top+bottom)/2-scrollY-screenY)<160));
  }
  function captureStatic(){
    renderer.render(scene,camera);if(!staticImage){staticImage=new Image();staticImage.alt='';layer.append(staticImage);}staticImage.src=renderer.domElement.toDataURL('image/png');renderer.domElement.hidden=true;
  }
  function unfreeze(){if(staticImage){staticImage.remove();staticImage=null;}renderer.domElement.hidden=false;}
  function updateButton(){motionButton.textContent=paused?'Play motion':'Pause motion';motionButton.setAttribute('aria-pressed',String(paused));document.documentElement.classList.toggle('motion-paused',paused);}
  function tick(time){
    raf=0;if(document.hidden)return;
    const dt=Math.min(.05,Math.max(.001,(time-lastTime)/1000||1/60));lastTime=time;
    if(resizePending)rebuild();
    if(paused)return;
    const scroll=scrollY;target=progressToU(scroll/scrollMax);
    const alpha=1-Math.exp(-dt*12);current=THREE.MathUtils.lerp(current,target,alpha);parallaxX=THREE.MathUtils.lerp(parallaxX,mouseX,alpha);parallaxY=THREE.MathUtils.lerp(parallaxY,mouseY,alpha);
    const changed=Math.abs(current-target)>1e-7||Math.abs(parallaxX-mouseX)>.0001||Math.abs(parallaxY-mouseY)>.0001||scroll!==lastScroll;
    if(changed){updateCamera(scroll);placeTrain();const start=performance.now();renderer.render(scene,camera);if(DEV){frameTimes.push(performance.now()-start);if(frameTimes.length>600)frameTimes.shift();}lastScroll=scroll;}
    raf=requestAnimationFrame(tick);
  }
  const requestTick=()=>{if(!raf)raf=requestAnimationFrame(tick);};
  // Scroll position is read in rAF; there is deliberately no scroll handler.
  addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&!paused){mouseX=THREE.MathUtils.clamp(event.clientX/innerWidth*2-1,-1,1);mouseY=THREE.MathUtils.clamp(event.clientY/innerHeight*2-1,-1,1);}} ,{passive:true});
  motionButton.addEventListener('click',()=>{paused=!paused;updateButton();if(paused){captureStatic();tiles.forEach(t=>t.classList.remove('train-near'));}else{unfreeze();lastScroll=-1;requestTick();}});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateButton();if(paused){current=anchors[0][1];parallaxX=parallaxY=0;updateCamera(0);placeTrain();captureStatic();}else{unfreeze();lastScroll=-1;requestTick();}});
  new ResizeObserver(()=>{resizePending=true;requestTick();}).observe(document.body);
  addEventListener('resize',()=>{resizePending=true;requestTick();});
  document.addEventListener('visibilitychange',()=>{lastTime=0;if(!document.hidden)requestTick();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();if(raf)cancelAnimationFrame(raf);raf=0;layer.dataset.error='WebGL context lost';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{delete layer.dataset.error;resizePending=true;requestTick();});
  document.fonts.ready.then(()=>{resizePending=true;requestTick();});
  function measureOcclusion(){
    // Sample the rendered centerline AND both rail envelopes, project through
    // the actual camera, and intersect their pixels with opaque content boxes.
    const rects=[...document.querySelectorAll(opaqueSelector)].map(el=>({el,r:el.getBoundingClientRect()}));
    let runMin=Infinity,runMax=-Infinity,maxSpan=0,covered=0,visible=0;
    const runs=[];
    const finish=()=>{if(runMin!==Infinity){const span=runMax-runMin;maxSpan=Math.max(maxSpan,span);runs.push(span);}runMin=Infinity;runMax=-Infinity;};
    const railWidth=layout.mobile?11:15;
    for(let i=0;i<=4000;i++){
      const f=route.frameAt(i/4000),points=[f.p.clone(),f.p.clone().add(new THREE.Vector3(0,0,railWidth).applyQuaternion(f.q)),f.p.clone().add(new THREE.Vector3(0,0,-railWidth).applyQuaternion(f.q))];
      let inView=false,hidden=false,ys=[];
      points.forEach(p=>{p.project(camera);const x=(p.x+1)*width/2,y=(1-p.y)*height/2;if(x<0||x>width||y<0||y>height)return;inView=true;ys.push(y);if(rects.some(({r})=>x>=r.left-2&&x<=r.right+2&&y>=r.top-2&&y<=r.bottom+2))hidden=true;});
      if(inView){visible++;if(hidden){covered++;runMin=Math.min(runMin,...ys);runMax=Math.max(runMax,...ys);}else finish();}else finish();
    }finish();
    const head=route.frameAt(current),up=new THREE.Vector3(0,1,0).applyQuaternion(head.q),normal=new THREE.Vector3(0,1,0);const p=head.p.clone().project(camera);
    return {maxCoveredSpanPx:maxSpan,maxCoveredViewportFraction:maxSpan/height,coveredSampleFraction:visible?covered/visible:0,trainScreen:{x:(p.x+1)*width/2,y:(1-p.y)*height/2},trainRollDegrees:THREE.MathUtils.radToDeg(head.roll),trainUp:up.toArray(),progress:scrollY/scrollMax,drawCalls:renderer.info.render.calls};
  }
  function publishDiagnostics(){
    window.coasterDebug={
      projectedSamples:()=>route.frames.map(f=>{const p=f.p.clone().project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2];}),
      captureCanvas:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL();},ready:true,version:THREE.REVISION,layout,worstT:route.worstT,worstArcT:route.worstArcT,controls:route.controls.map(c=>c.point.toArray()),controlPointCount:route.controls.length,maxTangentJump:route.maxTangentJump,maxArcTangentJump:route.maxArcTangentJump,
      measureOcclusion,
      getState:()=>({paused,reduced:reduced.matches,current,target,settled:Math.abs(current-target)<1e-6,canvasVisible:!renderer.domElement.hidden,staticImage:!!staticImage,frameTimes:[...frameTimes],...measureOcclusion()}),
      // Test-only deterministic settle; the test still scrolls the real document.
      settle:()=>{target=progressToU(scrollY/scrollMax);current=paused?anchors[0][1]:target;parallaxX=parallaxY=0;updateCamera(paused?0:scrollY);placeTrain();renderer.render(scene,camera);lastScroll=scrollY;},
      tangentSamples:SAMPLES,
    };
  }
  updateButton();rebuild();requestTick();
}
