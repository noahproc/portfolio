# noahproctor.co

Noah Proctor's portfolio: product case studies, data science projects, and a bit about life outside class.
It is a static site (HTML, CSS and vanilla JavaScript, no build step) served by GitHub Pages at [noahproctor.co](https://noahproctor.co).

## Run it locally

```sh
npm run serve          # or: python3 scripts/serve.py
# then open http://localhost:8765
```

`scripts/serve.py` behaves like GitHub Pages: `/product` goes to `/product/`, and a missing address gets `404.html`, so old-link forwarding works locally too.

## Pages and their addresses

Every page is a folder with an `index.html`, so addresses have no `.html` and end in a slash.

| Address | File |
|---|---|
| `/` | `index.html` (the homepage; its CSS and JS are inline) |
| `/product/` | `product/index.html` |
| `/product/transplant/`, `/product/series/`, `/product/threshold/`, `/product/hive-onboarding/`, `/product/phia-teardown/`, `/product/airline-booking/` | case studies, a PRD and a teardown, each in its own folder under `product/` |
| `/data-science/` | `data-science/index.html` |
| `/about/` | `about/index.html` |
| `/resume/` | forwards to `assets/resume/Proctor_Noah_Resume.pdf` |
| anything else | `404.html`: forwards old addresses (`work.html`, `aden-prd.html`, old asset paths...) to their new home, otherwise shows "not found" |

Links are root-absolute (`/product/`, `/assets/...`) so they work from any folder.

## What's where

```
index.html  404.html  CNAME  favicon.ico  _config.yml  package.json  README.md  CLAUDE.md
product/  data-science/  about/  resume/        the pages (see above)

assets/
  css/        base.css (shared base) and pages.css (everything else for the inner pages, in load order;
              its last section carries the homepage look)
  js/         site.js (sticker packer, draggable stickers), photo-tiles.js (photo lightbox),
              stickers.js (generated list of stickers)
  images/     stickers/ photos/ reel/ logos/ research/ projects/ textures/ source/
  docs/       case-study PDFs (PRD, persona, one-pager...)
  icons/      favicon and touch icons (favicon.ico sits at the root)
  resume/     résumé PDFs

archive/coaster/   the previous roller-coaster homepage. Kept for reference, not published.

scripts/           regenerate derived files (Python 3 + Pillow: pip install -r scripts/requirements.txt)
  serve.py                   local preview server
  make-favicon.py            icons from the chrome star sticker
  make-reel-thumbs.py        reel thumbnails from assets/images/photos
  make-sticker-manifest.py   assets/js/stickers.js from assets/images/stickers

tests/             Playwright checks (npm install once, keep npm run serve running)
  links.cjs                  every page loads cleanly, every link and image resolves, old addresses forward
  stickers-text.cjs          no sticker sits on text, buttons or links (every page, 390-1920 px)
  collisions.cjs             archive/coaster: nothing touches the track or the cars
```

`_config.yml` keeps `archive/`, `scripts/`, `tests/` and these notes out of the published site.
Raw photo originals live in `originals/`, which is git-ignored so they are never published.

## Commands

| Command | Does |
|---|---|
| `npm run serve` | local preview at http://localhost:8765 |
| `npm test` | link check, then the sticker check |
| `npm run test:coaster` | collision test for the archived coaster page |
| `npm run icons` / `reel` / `stickers` | rebuild the favicon, reel thumbnails or sticker list |

The tests use the Playwright from `npm install`, or set `PW` to another install. `PAGES=/,/about/` and `WIDTHS=390,1440` narrow the sticker test.

## Adding things

- **A page:** make a folder with an `index.html`, copy the head and nav from a sibling page, and link to it as `/folder/`. If it replaces an old address, add that to the map in `404.html`.
- **A sticker:** drop a die-cut `.webp` into `assets/images/stickers/`, then `npm run stickers`.
- **A reel photo:** add it to `assets/images/photos/` and to the list in `scripts/make-reel-thumbs.py`, run `npm run reel`, then add a `<figure class="snap">` to the reel in `index.html`.
- **A project tile:** copy a tile in `index.html`. Product tiles are taped and carry a logo badge; code and data tiles are pinned and carry a chart print.
- **A new résumé:** replace `assets/resume/Proctor_Noah_Resume.pdf`; `/resume/` keeps working.

Strip location data (EXIF) from any photo before adding it; `scripts/make-reel-thumbs.py` already does this for the reel.
