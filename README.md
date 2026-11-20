# noahproctor.co

Noah Proctor's portfolio: product case studies, data science projects, and a bit about life outside class.
It is a static site (HTML, CSS and vanilla JavaScript, no build step) served by GitHub Pages at [noahproctor.co](https://noahproctor.co).

## Run it locally

```sh
python3 -m http.server 8765
# then open http://localhost:8765
```

## What's where

```
index.html                 the homepage: one self-contained file (its CSS and JS are inline)
work.html                  product work
projects.html              data science and research
about.html                 about, timeline, skills and the photo corkboard
*-case-study.html, aden-prd.html, phia-teardown.html, airline-booking-case.html
                           case studies, a PRD and a teardown
coaster.html               the previous roller-coaster homepage, kept online

assets/
  css/                     inner-page styles; theme.css (loaded last) carries the homepage look
  js/                      site.js (sticker packer, draggable stickers), photo-tiles.js (lightbox),
                           stickers.js (generated sticker list), main.js, home.js (coaster.html)
  images/
    stickers/              Noah's stickers, cut from the sheets he supplied
    photos/                photos used on the pages
    reel/                  small copies of the photos for the homepage reel
    logos/                 project and company logos
    research/              charts from the data science projects
    projects/              case-study screenshots and mockups
    textures/              paper and cork backgrounds
    source/                the original sticker sheet
  docs/                    case-study PDFs (PRD, persona, one-pager...)
  icons/                   favicon and touch icons (favicon.ico sits at the root)

scripts/                   regenerate derived files (needs Python 3 + Pillow)
  make-favicon.py          icons from the chrome star sticker
  make-reel-thumbs.py      reel thumbnails from assets/images/photos
  make-sticker-manifest.py assets/js/stickers.js from assets/images/stickers

tests/                     Playwright checks
  stickers-text.cjs        no sticker sits on text, buttons or links (every page, 390-1920 px)
  collisions.cjs           coaster.html: nothing touches the track or the cars

CNAME                      custom domain for GitHub Pages
Proctor_Noah_Resume.pdf    résumé (older résumé files stay at the root so old links keep working)
```

Raw photo originals live in `originals/`, which is git-ignored so they are never published.

## Tests

The tests need a local server running (see above) and Playwright:

```sh
PW=$(npm root -g)/playwright node tests/stickers-text.cjs
PW=$(npm root -g)/playwright node tests/collisions.cjs
```

`PW` points at a Playwright install. `PAGES=index,about` and `WIDTHS=390,1440` narrow the sticker test.

## Adding things

- **A sticker:** drop a die-cut `.webp` into `assets/images/stickers/`, then run `python3 scripts/make-sticker-manifest.py`.
- **A reel photo:** add it to `assets/images/photos/` and to the list in `scripts/make-reel-thumbs.py`, run the script, then add a `<figure class="snap">` to the reel in `index.html`.
- **A project tile:** copy a tile in `index.html`. Product tiles are taped and carry a logo badge; code and data tiles are pinned and carry a chart print.

Strip location data (EXIF) from any photo before adding it; `scripts/make-reel-thumbs.py` already does this for the reel.
