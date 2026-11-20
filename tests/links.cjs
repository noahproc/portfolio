/* Every page loads cleanly and every internal reference resolves.
   - each page: no failed request, no console error, cards visible
   - every same-site href / src / data-photo-src answers 200
   - old addresses (work.html, aden-prd.html, the old résumé and asset paths...) forward to their new home
   Needs the GitHub-Pages-like dev server (npm run serve), so 404.html is served for missing paths.
   Usage: PW=<playwright path> node tests/links.cjs */
const { chromium } = require(process.env.PW || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const PAGES = ['/', '/product/', '/data-science/', '/about/', '/product/transplant/', '/product/series/', '/product/threshold/',
  '/product/hive-onboarding/', '/product/phia-teardown/', '/product/airline-booking/', '/404.html', '/archive/coaster/'];
const OLD = {
  '/work.html': '/product/', '/projects.html': '/data-science/', '/about.html': '/about/',
  '/transplant-case-study.html': '/product/transplant/', '/series-case-study.html': '/product/series/',
  '/threshold-case-study.html': '/product/threshold/', '/aden-prd.html': '/product/hive-onboarding/',
  '/phia-teardown.html': '/product/phia-teardown/', '/airline-booking-case.html': '/product/airline-booking/',
  '/work': '/product/', '/coaster.html': '/', '/resume': '/assets/resume/Proctor_Noah_Resume.pdf',
  '/Proctor_Noah_Resume.pdf': '/assets/resume/Proctor_Noah_Resume.pdf',
  '/case-assets/transplant-prd.pdf': '/assets/docs/transplant-prd.pdf',
  '/pictures/stickers/heart.webp': '/assets/images/stickers/heart.webp',
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('np-intro', '1'); } catch (_) {} });
  let bad = 0;
  const checked = new Map();
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400 && !r.url().endsWith('/404.html')) problems.push(r.status() + ' ' + r.url().slice(BASE.length)); });
    page.on('requestfailed', r => { if (r.url().startsWith(BASE)) problems.push('failed ' + r.url().slice(BASE.length)); });
    page.on('pageerror', e => problems.push('js: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/404 \(File not found\)|status of 404/.test(m.text())) problems.push('console: ' + m.text()); });
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
      for (let y = 0; y < document.documentElement.scrollHeight; y += 800) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
    });
    await page.waitForTimeout(800);
    const refs = await page.evaluate(() => [...document.querySelectorAll('[href],[src],[data-photo-src]')]
      .map(e => e.getAttribute('data-photo-src') || e.getAttribute('href') || e.getAttribute('src'))
      .filter(h => h && !/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(h)));
    const hidden = await page.evaluate(() => [...document.querySelectorAll('.repo-card, .case-card, .tile')].filter(e => +getComputedStyle(e).opacity < .5).length);
    if (hidden && !path.startsWith('/archive/')) problems.push(hidden + ' card(s) invisible');   // the archive animates its own tiles in
    for (const ref of new Set(refs)) {
      const url = new URL(ref, BASE + path).href;
      if (!checked.has(url)) checked.set(url, (await page.request.get(url, { maxRedirects: 3 })).status());
      if (checked.get(url) >= 400) problems.push('link ' + checked.get(url) + ' ' + ref);
    }
    bad += problems.length;
    console.log(`${path}: ${problems.length ? [...new Set(problems)].join(' | ') : 'ok'}`);
    await page.close();
  }
  for (const [from, to] of Object.entries(OLD)) {
    const page = await ctx.newPage();
    // watch the requests: a PDF downloads instead of navigating, so the address bar alone can't tell
    let landed = '';
    const seen = new Promise(res => page.on('request', r => { const p = new URL(r.url()).pathname; if (p === to) res(p); }));
    page.goto(BASE + from, { waitUntil: 'commit' }).catch(() => {});
    landed = await Promise.race([seen, new Promise(r => setTimeout(() => r(''), 8000))]);
    if (!landed) landed = new URL(page.url()).pathname;
    const ok = landed === to;
    if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'BAD'} ${from} -> ${landed || '(nothing)'}`);
    await page.close();
  }
  await browser.close();
  console.log(bad ? `FAIL: ${bad} problem(s)` : 'PASS: every page, link and old address works');
  process.exit(bad ? 1 : 0);
})();
