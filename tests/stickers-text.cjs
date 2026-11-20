/* Stickers must never sit on text, buttons, tiles or links.
   For every page and width: measure each visible sticker (home: .sticker, inner pages: .stk),
   shrink its box a little for the transparent margin around the die-cut art, and test it against
   every line box of visible text (Range.getClientRects) and against the home's moving reel band.
   Usage: PW=<playwright path> node tests/stickers-text.cjs   (optional PAGES=index,work  WIDTHS=390,1440) */
const { chromium } = require(process.env.PW || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8765/';
const PAGES = (process.env.PAGES || 'index,work,projects,about,transplant-case-study,series-case-study,threshold-case-study,aden-prd,phia-teardown,airline-booking-case').split(',');
const WIDTHS = (process.env.WIDTHS || '390,768,1024,1280,1440,1920').split(',').map(Number);
const INSET = +(process.env.INSET || 0.12);

(async () => {
  const browser = await chromium.launch();
  let total = 0;
  for (const w of WIDTHS) {
    for (const pg of PAGES) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.addInitScript(() => { try { sessionStorage.setItem('np-intro', '1'); } catch (_) {} });
      // python's dev server occasionally stalls a request; retry instead of failing the whole sweep
      for (let tries = 0; ; tries++) {
        try { await page.goto(BASE + (pg === 'index' ? '' : pg + '.html'), { waitUntil: 'load', timeout: 30000 }); break; }
        catch (e) { if (tries >= 2) throw e; }
      }
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        await (document.fonts ? document.fonts.ready : null);
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
        scrollTo(0, 0); await new Promise(r => setTimeout(r, 2800));   // let the pop-in finish
      });
      const hits = await page.evaluate((INSET) => {
        const seen = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
        const box = (r, k) => ({ l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k });
        const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
        const sx = scrollX, sy = scrollY;
        const stickers = [...document.querySelectorAll('.sticker, .stk')].filter(seen).map(el => {
          const r = el.getBoundingClientRect(); const img = el.matches('img') ? el : el.querySelector('img');
          return { el, name: el.getAttribute('aria-label') || (img && img.getAttribute('src')) || el.className, b: box(r, INSET), w: r.width };
        }).filter(s => s.w > 4);
        const obstacles = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = walker.nextNode());) {
          if (!n.nodeValue.trim()) continue;
          const p = n.parentElement;
          if (!p || p.closest('.sticker, .stk, script, style, .sr-only, #intro, .skip-hint, .reel') || !seen(p)) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          // a big display face's glyph box runs far above and below the letters; clip it to the element's own box (+6px for ascenders)
          const pb = p.getBoundingClientRect();
          for (const r of rg.getClientRects()) if (r.width > 2 && r.height > 2) obstacles.push({ what: 'text "' + n.nodeValue.trim().slice(0, 40) + '"', b: { l: r.left, r: r.right, t: Math.max(r.top, pb.top - 6), b: Math.min(r.bottom, pb.bottom + 6) } });
        }
        const reel = document.getElementById('reel');
        if (reel && seen(reel)) { const r = reel.getBoundingClientRect(); obstacles.push({ what: 'the photo reel', b: { l: r.left, r: r.right, t: r.top + 20, b: r.bottom - 20 } }); }
        // buttons, tiles and nav links count as text: a sticker on a button's edge still hides it
        for (const el of document.querySelectorAll('.btn, .tile, .more, .nav a, .site-nav a, .repo-links a, .back-link, .doc-resource-link, .foot-thin a')) {
          if (!seen(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 2) obstacles.push({ what: (el.className || el.tagName).toString().split(' ')[0] + ' "' + el.textContent.trim().slice(0, 30) + '"', b: { l: r.left, r: r.right, t: r.top, b: r.bottom } });
        }
        const out = [];
        for (const s of stickers) for (const o of obstacles) if (hit(s.b, o.b)) { out.push(s.name + ' on ' + o.what + ' @y=' + Math.round(o.b.t + sy)); break; }
        return out;
      }, INSET);
      total += hits.length;
      console.log(`${w}px ${pg}: ${hits.length} overlap(s)` + (hits.length ? '\n   ' + hits.join('\n   ') : ''));
      await page.close();
    }
  }
  await browser.close();
  console.log(total ? `FAIL: ${total} sticker(s) on text` : 'PASS: no sticker touches text');
  process.exit(total ? 1 : 0);
})();
