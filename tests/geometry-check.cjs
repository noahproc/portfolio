const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.COASTER_CHROMIUM});const p=await b.newPage();await p.goto('http://127.0.0.1:8765/tests/geometry.html');await p.waitForFunction(()=>window.routeReport);console.log(JSON.stringify(await p.evaluate(()=>routeReport),null,2));await b.close();})();
