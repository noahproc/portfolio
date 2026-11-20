/* ============================================================
   SLOT MACHINE NAME — per-character vertical spinning columns
   ============================================================ */

(function () {
  const wrapper = document.getElementById('slotMachine');
  if (!wrapper) return;

  const FINAL_NAME = 'NOAH PROCTOR';
  const CHARSET    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const SPIN_ROWS  = 20;   // how many random chars to spin through per column

  // Each column stops slightly after the previous (cascade effect)
  const BASE_DURATION  = 600;   // ms for first column
  const STAGGER        = 90;    // extra ms per column index
  const EASE           = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

  // Measure one character's height after font loads
  function buildSlot() {
    wrapper.innerHTML = '';

    // Build a hidden probe span to measure cell height
    const probe = document.createElement('span');
    probe.className = 'slot-char';
    probe.textContent = 'A';
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    wrapper.appendChild(probe);
    const cellH = probe.getBoundingClientRect().height;
    probe.remove();

    // Set wrapper height to exactly one cell
    wrapper.style.height = cellH + 'px';

    const cols = [];

    for (let i = 0; i < FINAL_NAME.length; i++) {
      const finalChar = FINAL_NAME[i];

      // Build the column's character list: randoms + final char at bottom
      const charList = [];
      for (let r = 0; r < SPIN_ROWS; r++) {
        charList.push(CHARSET[Math.floor(Math.random() * CHARSET.length)]);
      }
      charList.push(finalChar); // always land here

      // Create column div
      const col = document.createElement('div');
      col.className = 'slot-col';
      col.style.transform = 'translateY(0)';

      charList.forEach(ch => {
        const span = document.createElement('span');
        span.className = 'slot-char';
        span.textContent = ch;
        col.appendChild(span);
      });

      wrapper.appendChild(col);
      cols.push({ col, cellH, count: charList.length });
    }

    // Kick off each column with a staggered delay
    cols.forEach(({ col, cellH, count }, idx) => {
      const duration = BASE_DURATION + idx * STAGGER;
      const totalShift = -(count - 1) * cellH; // scroll up so last item is visible

      // Use requestAnimationFrame to ensure layout is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          col.style.transition = `transform ${duration}ms ${EASE}`;
          col.style.transform  = `translateY(${totalShift}px)`;
        });
      });
    });

    // After all columns land, fade in tagline & CTA
    const totalTime = BASE_DURATION + (FINAL_NAME.length - 1) * STAGGER + 100;
    setTimeout(() => {
      document.querySelectorAll('.fade-up').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, totalTime);
  }

  // Wait for Instrument Serif to load so cell height is accurate
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(buildSlot);
  } else {
    setTimeout(buildSlot, 400);
  }
})();


/* Content stays visible immediately, including when motion is reduced. */
document.querySelectorAll('.fade-up, .case-card, .repo-card, .figma-card, .research-item, .preview-card').forEach(node => {
  node.style.opacity = '1';
  node.style.transform = 'none';
});

/* ============================================================
   ACTIVE NAV LINK
   ============================================================ */
(function () {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active',
      href === path || (path === '' && href === 'index.html')
    );
  });
})();
