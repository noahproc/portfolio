const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.COASTER_CHROMIUM});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.coasterDebug?.ready);
 await page.waitForTimeout(500);
 const performance=await page.evaluate(async()=>{
  document.documentElement.style.scrollBehavior='auto';const times=[];let start,last;
  await new Promise(resolve=>{function step(time){if(start===undefined)start=time;if(last!==undefined)times.push(time-last);last=time;const p=Math.min(1,(time-start)/4000);scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p);if(p<1)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
  const sorted=times.slice().sort((a,b)=>a-b),render=coasterDebug.getState().frameTimes.sort((a,b)=>a-b);
  const quantile=(a,p)=>a[Math.floor((a.length-1)*p)];
  return {sampleFrames:times.length,medianFrameMs:quantile(sorted,.5),p95FrameMs:quantile(sorted,.95),medianFps:1000/quantile(sorted,.5),renderCpuMedianMs:quantile(render,.5),renderCpuP95Ms:quantile(render,.95),drawCalls:coasterDebug.getState().drawCalls};
 });
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await noJS.newPage();await staticPage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 const fallback={headline:await staticPage.locator('h1').isVisible(),project:await staticPage.locator('#transplant-title').isVisible(),link:await staticPage.getByRole('link',{name:'Explore Transplant',exact:true}).getAttribute('href'),embed:await staticPage.locator('iframe').getAttribute('src')};
 const result={performance,noJavaScript:fallback,environment:'Headless Chromium on this Mac; synthetic four-second scroll, not a guarantee for every laptop.'};fs.writeFileSync('artifacts/coaster/performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
