# Noah Proctor portfolio — working rules

Static site (HTML/CSS/vanilla JS), served locally with `python3 -m http.server 8765` from the repo root.
Design sketch: `~/Downloads/Portfolio Roller Coaster.pdf` (3 pages, read as one continuous ride).

## Priorities, in order
1. Zero overlap between the coaster track/cart and any tile, image, text block or decoration.
2. Density: the homepage is scannable in 5 or fewer viewport heights at 1440px wide. No big empty sections.
3. Smooth, flowy motion that feels like a ride; never jagged.
4. Professional first, playful second. Creative, not cluttered.

## Lane rule (how overlap is prevented)
- The ride runs left to right. From 1024px wide and 560px tall it is a sticky stage that vertical scroll moves sideways. Below that (phones, tablets) it is one dense column with a narrow vertical left rail.
- The wide ride follows Noah's Figma wireframe ("portfolio" file, rollercoaster frames, 2026-11-02): a strip about 6.4 screens wide, with every card, polaroid, text block and sticker circle at a fixed spot given in screen widths and strip heights (`--x/--y/--w/--h` on `[data-at]`). The track (layoutH in home.js) is traced through the gaps the wireframe leaves, using the full height of the screen. Change positions only together with the track, and re-run the collision test.
- Nothing may touch the track or the cars: the collision test enforces this at every scroll position.
- The hero fills the first screen, and no track shows there. The ride opens on the Station: flat track, "Building to new heights." and Add yourself here, with no content in view until you scroll. The train has 4 cars: the visitor in front, Noah behind, then two empty seats. The camera keeps the train's middle centred, so it finishes in the centre of the last screen. The cars are big (about 1.8× at 1440×900, set by the screen height and capped by its width so they shrink on narrow screens) and the rail is 10px. The last screen is black, like the old homepage footer, and the track turns white across it (a clipped white copy of the same path). The cut-out "Let's build something" is the only thing above the track; below it, the crumpled-paper ride-photo tile (an optional download) on the left, and the recruiting line plus Contact, LinkedIn, GitHub, Résumé and Ride again on the right.
- Positions come from Noah's Claude Design canvas edits (2026-11-02), which refined the wireframe. "Where it started" is a tight cluster: the Family polaroid and Columbia under the lift hill, with stickers around them. The Product title and subtitle sit on one line under the cards; the Data title and subtitle are left-aligned inside the loop. Transplant shows its app logo, not the prototype; Water shows its bar chart, and GMV a dashed placeholder until a chart exists. Product cards use larger, screen-scaled type. Experience images are prints pinned onto their paper tiles (white border, slight tilt, the pinboard pushpin). Stickers are placed by their centre with left/top (never CSS translate: the reveal tween owns the transform), sized as at 1440×900 and kept 16px inside the ride's edges (the collision test checks).
- Phones and tablets use bento grids: CSS Grid, dense flow, varied spans, no empty cells. On the wide ride, cards keep their wireframe boxes. No tile may clip its own content: logos sit in the corner, and chips drop on cards under 150px tall.
- Progressive disclosure: a tile shows title, one line and tag chips; detail opens inline or in a modal.
- Sections: Station → Where it started (Family polaroid, Columbia) → Product (Transplant, Series, Lumelle, Threshold, Hive, Phia) → Data (loop around its title; Lake Erie, Emissions, Water, GMV) → Personal life (6 polaroids, Activities: RA, CSR, Ascend, Speech coach, Inspirate Earth, A2E2S) → Let's build. Alka Oaks, NYSee, Toolkit, Looking for and Thanks for riding are deliberately off the homepage (they stay on inner pages). Each is a short band, with its tiles beside that section's stop on the track.
- A small sticky progress/nav indicator lets people jump between sections.
- Mobile-first: one dense column with the track on the left rail. Tab order matches visual order; sideways, tabbing to an off-screen tile rides the cart over to it.

## Motion rules
- One SVG path made of a few gentle cubic béziers (no kinks, never hundreds of points).
- Library: GSAP (ScrollTrigger + MotionPathPlugin), used everywhere; no second animation library.
- Cart: scrubbed tween with `scrub: 1` (a number), `autoRotate: true`, `ease: "none"`, `invalidateOnRefresh: true`; call `ScrollTrigger.refresh()` after fonts and images load.
- Animate only `transform` and `opacity`.
- Tile reveals: opacity plus a 12–20px translateY, 400–600ms, ease-out, batched with a small stagger (`ScrollTrigger.batch` on phones; sideways, as each tile slides into view).
- No bounce or elastic anywhere, except one subtle moment on the first drop.
- No scroll-snap. The sideways ride is the one pinned element: a CSS `position: sticky` stage (not a ScrollTrigger pin) whose length is set from the track. Nothing else is pinned.
- `prefers-reduced-motion`: no reveals, no smoothing, and the train hops forward in steps of 0.4 screens instead of gliding, so it stays in view.

## Decoration budget
- Use only Noah's own art (sketch callouts and the sticker sheets he supplied); do not redraw or invent new art.
- Each sketch element gets exactly one job: section header art, tile corner accent, or hover easter egg. Unassigned art stays out.
- Decorations sit inside tiles or in the margins: never in the track lane and never over text.
- At most 2–3 visible per viewport, small and low-contrast. Exceptions at Noah's request: the hero keeps its four corner stickers on the headshot polaroid (they may overlap the photo's corners, never text or the ticket), and the wide ride has 17 sticker spots from Noah's canvas, each a different sticker (no repeats). A few (Ohio on Family, grad cap and Saturn on Columbia) overlap a card's corner like the hero stickers; none may cover text (the collision test checks) or touch the track.

## Verification (required after every step)
- Collision test: `PW=<playwright path> node tests/collisions.cjs` (locally: `PW=/Users/noahproctor/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`). It runs at 390, 768, 1024 and 1440 wide (or `SIZES='[[1280,720],...]'`) and ~20 scroll positions; also run the common laptop sizes 1280×720, 1366×768, 1536×864 and 1920×1080. It samples the track path (`getPointAtLength`) and the cart's bounding box against every tile, image, text block and decoration, and fails on any intersection, or on any tile too small for its content. Sideways, everything is re-measured at each scroll position. It must report 0 collisions.
- Screenshot every width at the top, middle and bottom.
- No horizontal scroll, no layout shift after load, and a steady scroll frame rate (performance trace).
- Report total page height in viewport heights at 1440px: 5 or fewer. The sideways scroll speed is `SPEED` in home.js (px of track per px scrolled).
