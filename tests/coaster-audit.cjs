// Run: NODE_PATH=<path containing playwright> node tests/coaster-audit.cjs
// Visits the real page at both requested sizes; no screenshot-only substitute.
const {chromium}=require('playwright');
const fs=require('node:fs');
const {PNG}=require('pngjs');
const path=require('node:path');
const out=path.resolve('artifacts/coaster');fs.mkdirSync(out,{recursive:true});
function rasterCoverage(actualBuffer,canvasURL,points){
 const actual=PNG.sync.read(actualBuffer),reference=PNG.sync.read(Buffer.from(canvasURL.split(',')[1],'base64'));
 let low=Infinity,high=-Infinity,max=0,covered=0,visible=0;
 const finish=()=>{if(low!==Infinity)max=Math.max(max,high-low);low=Infinity;high=-Infinity;};
 for(const [px,py] of points){
  if(px<0||px>=actual.width||py<0||py>=actual.height){finish();continue;}
  let expected=0,matched=0;
  for(let y=Math.max(0,Math.round(py)-13);y<Math.min(actual.height,Math.round(py)+14);y++)for(let x=Math.max(0,Math.round(px)-13);x<Math.min(actual.width,Math.round(px)+14);x++){
   const k=(y*actual.width+x)*4,a=reference.data[k+3]/255;if(a<.8)continue;
   expected++;let difference=0;for(let c=0;c<3;c++){const composited=reference.data[k+c]*a+255*(1-a);difference+=Math.abs(actual.data[k+c]-composited);}if(difference<100)matched++;
  }
  if(expected<2){finish();continue;}visible++;
  if(matched/expected<.25){covered++;low=Math.min(low,py);high=Math.max(high,py);}else finish();
 }finish();return {maxRasterCoveredSpanPx:max,maxRasterCoveredViewportFraction:max/actual.height,rasterCoveredFraction:visible?covered/visible:0};
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.COASTER_CHROMIUM});const results=[];
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='assert')errors.push(m.text());});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.coasterDebug?.ready,{timeout:30000});
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>({controlPoints:coasterDebug.controlPointCount,maxTangentJump:coasterDebug.maxTangentJump,maxArcTangentJump:coasterDebug.maxArcTangentJump,layout:coasterDebug.layout}));
  const samples=[];
  for(let percent=0;percent<=100;percent+=10){
    await page.evaluate(p=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/100);},percent);
    await page.waitForTimeout(100);await page.evaluate(()=>coasterDebug.settle());await page.waitForTimeout(450);
    const actual=await page.screenshot();const reference=await page.evaluate(()=>coasterDebug.captureCanvas());const points=await page.evaluate(()=>coasterDebug.projectedSamples());
    samples.push({percent,...await page.evaluate(()=>coasterDebug.measureOcclusion()),...rasterCoverage(actual,reference,points)});
  }
  const captures=[];
  for(const percent of [0,25,50,75,100]){
    await page.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/100),percent);
    await page.waitForTimeout(150);await page.evaluate(()=>coasterDebug.settle());await page.waitForTimeout(450);
    const state=await page.evaluate(()=>coasterDebug.getState());
    await page.screenshot({path:path.join(out,`${name}-${String(percent).padStart(3,'0')}.png`)});
    captures.push({percent,...state});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  const reduced=await page.evaluate(()=>coasterDebug.getState());
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  const reducedAfter=await page.evaluate(()=>coasterDebug.getState());
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  results.push({name,width,height,geometry,samples,captures,errors,noOverflow,reducedMotion:{staticImage:reduced.staticImage,canvasHidden:!reduced.canvasVisible,trainUnchanged:reduced.current===reducedAfter.current}});
  await page.close();
 }
 const report={created:new Date().toISOString(),results,maxTangentJump:Math.max(...results.map(r=>r.geometry.maxTangentJump)),maxArcTangentJump:Math.max(...results.map(r=>r.geometry.maxArcTangentJump)),maxOcclusionPx:Math.max(...results.flatMap(r=>r.samples.map(s=>Math.max(s.maxCoveredSpanPx,s.maxRasterCoveredSpanPx)))),maxOcclusionFraction:Math.max(...results.flatMap(r=>r.samples.map(s=>Math.max(s.maxCoveredViewportFraction,s.maxRasterCoveredViewportFraction))))};
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({maxTangentJump:report.maxTangentJump,maxArcTangentJump:report.maxArcTangentJump,maxOcclusionPx:report.maxOcclusionPx,maxOcclusionFraction:report.maxOcclusionFraction,results:results.map(r=>({name:r.name,points:r.geometry.controlPoints,errors:r.errors,noOverflow:r.noOverflow,captures:r.captures.map(c=>({percent:c.percent,position:c.trainScreen,roll:c.trainRollDegrees})),reduced:r.reducedMotion}))},null,2));
 await browser.close();
 if(report.maxTangentJump>3||report.maxOcclusionFraction>.15||results.some(r=>r.errors.length||!r.noOverflow))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
