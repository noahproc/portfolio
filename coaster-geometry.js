import * as THREE from 'three';

export const SAMPLES = 2000;
const clamp = THREE.MathUtils.clamp;
const smooth = t => t*t*(3-2*t);

// One authored, responsive 3D centerline. Coordinates are document pixels;
// depth is real world Z. Angles below are unwrapped degrees, not Euler frames.
export function buildRoute(layout) {
  const {width:w,stationY:s,stationX:sx,transplantBottom:a,writingBottom:b,researchBottom:c,endY:e,mobile}=layout;
  const L=w*(mobile?.055:.045),R=w-L,C=w/2;
  const controls=[],phase={};
  const add=(x,y,z,roll=0)=>controls.push({point:new THREE.Vector3(x,-y,z),roll:THREE.MathUtils.degToRad(roll)});
  // A long straight loading platform exits into a broad, tangent-continuous drop.
  const start=sx-100;
  add(start,s,0);add(start+55,s,0);add(start+110,s,0);
  phase.station=controls.length-1;
  const exit=new THREE.CubicBezierCurve3(new THREE.Vector3(start+110,-s,0),new THREE.Vector3(R,-s,0),new THREE.Vector3(R,-s-65,-18),new THREE.Vector3(R,-s-155,-28));
  for(let i=1;i<=18;i++){const t=i/18,p=exit.getPoint(t);controls.push({point:p,roll:THREE.MathUtils.degToRad(18*Math.sin(t*Math.PI))});}
  // Quintic easing has zero first and second derivatives at each end: broad
  // transitions join vertical gutter runs without abrupt curvature changes.
  const ease=t=>t*t*t*(10+t*(-15+6*t));
  const sweep=(x0,y0,x1,y1,z0,z1,bank=0)=>{
    const n=Math.max(12,Math.ceil((y1-y0)/28));
    for(let i=1;i<=n;i++){const t=i/n,k=ease(t);add(x0+(x1-x0)*k,y0+(y1-y0)*t,z0+(z1-z0)*k,bank*Math.sin(Math.PI*t)**2);}
  };
  sweep(R,s+155,R,a-15,-28,10,0);
  phase.rollStart=controls.length-1;
  sweep(R,a-15,L,a+125,10,0,-24);phase.rollPeak=controls.length-7;phase.rollEnd=controls.length-1;
  sweep(L,a+125,L,b-15,0,-16,0);phase.stallStart=controls.length-1;
  sweep(L,b-15,R,b+125,-16,10,24);phase.stallPeak=controls.length-7;phase.stallEnd=controls.length-1;
  sweep(R,b+125,R,c-10,10,0,0);phase.helixStart=controls.length-1;
  // The brake run sits directly beneath the final about button.
  const brake=new THREE.CubicBezierCurve3(new THREE.Vector3(R,-c+10,0),new THREE.Vector3(R,-e,0),new THREE.Vector3(C+100,-e,0),new THREE.Vector3(C-75,-e,0));
  for(let i=1;i<=24;i++){controls.push({point:brake.getPoint(i/24),roll:0});}
  phase.helixEnd=controls.length-1;
  const curve=new THREE.CatmullRomCurve3(controls.map(c=>c.point),false,'centripetal');
  curve.arcLengthDivisions=10000;
  const length=curve.getLength();
  const controlUs=controls.map((_,i)=>{
    const t=i/(controls.length-1);let lo=0,hi=1;
    for(let j=0;j<24;j++){const u=(lo+hi)/2;if(curve.getUtoTmapping(u)<t)lo=u;else hi=u;}
    return (lo+hi)/2;
  });
  const frames=[];
  let tangent=curve.getTangentAt(0), normal=new THREE.Vector3(0,1,0);
  normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();
  const rotation=new THREE.Quaternion();
  for(let i=0;i<=SAMPLES;i++){
    const u=i/SAMPLES,t=curve.getUtoTmapping(u),next=curve.getTangentAt(u);
    if(i){rotation.setFromUnitVectors(tangent,next);normal.applyQuaternion(rotation);normal.addScaledVector(next,-normal.dot(next)).normalize();}
    tangent=next;
    const ci=Math.min(controls.length-2,Math.floor(t*(controls.length-1))),f=t*(controls.length-1)-ci;
    const roll=THREE.MathUtils.lerp(controls[ci].roll,controls[ci+1].roll,smooth(f));
    const up=normal.clone().applyAxisAngle(tangent,roll).normalize();
    const side=new THREE.Vector3().crossVectors(tangent,up).normalize();
    const matrix=new THREE.Matrix4().makeBasis(tangent,up,side);
    frames.push({p:curve.getPointAt(u),tangent:tangent.clone(),up,side,q:new THREE.Quaternion().setFromRotationMatrix(matrix),roll});
  }
  let maxTangentJump=0,maxArcTangentJump=0,worstT=0,worstArcT=0;
  for(let i=1;i<=SAMPLES;i++){
    const jump=THREE.MathUtils.radToDeg(curve.getTangent((i-1)/SAMPLES).angleTo(curve.getTangent(i/SAMPLES)));if(jump>maxTangentJump){maxTangentJump=jump;worstT=i/SAMPLES;}
    const arcJump=THREE.MathUtils.radToDeg(frames[i-1].tangent.angleTo(frames[i].tangent));if(arcJump>maxArcTangentJump){maxArcTangentJump=arcJump;worstArcT=curve.getUtoTmapping(i/SAMPLES);}
  }
  function frameAt(u){
    const f=clamp(u,0,1)*SAMPLES,i=Math.min(SAMPLES-1,Math.floor(f)),t=f-i;
    return {p:curve.getPointAt(clamp(u,0,1)),q:frames[i].q.clone().slerp(frames[i+1].q,t),roll:THREE.MathUtils.lerp(frames[i].roll,frames[i+1].roll,t)};
  }
  return {curve,controls,controlUs,frames,length,phase,frameAt,maxTangentJump,maxArcTangentJump,worstT,worstArcT};
}

// Offset rails share the centerline's banked parallel-transport frame. Tube
// cross-sections also use transport frames, never TubeGeometry's Frenet default.
export class RailCurve extends THREE.Curve {
  constructor(route,side,up){super();this.route=route;this.side=side;this.up=up;this.arcLengthDivisions=2000;}
  getPoint(t,target=new THREE.Vector3()){
    const f=t*SAMPLES,i=Math.min(SAMPLES-1,Math.floor(f)),a=this.route.frames[i],b=this.route.frames[i+1],k=f-i;
    const p=target.copy(a.p).lerp(b.p,k);
    const side=a.side.clone().lerp(b.side,k).normalize(),up=a.up.clone().lerp(b.up,k).normalize();
    return p.addScaledVector(side,this.side).addScaledVector(up,this.up);
  }
  computeFrenetFrames(segments){
    const tangents=[],normals=[],binormals=[];let n=new THREE.Vector3(0,0,1),last=this.getTangentAt(0),q=new THREE.Quaternion();
    n.addScaledVector(last,-n.dot(last)).normalize();
    for(let i=0;i<=segments;i++){const t=this.getTangentAt(i/segments);if(i)n.applyQuaternion(q.setFromUnitVectors(last,t));n.addScaledVector(t,-n.dot(t)).normalize();tangents.push(t);normals.push(n.clone());binormals.push(new THREE.Vector3().crossVectors(t,n).normalize());last=t;}
    return {tangents,normals,binormals};
  }
}
