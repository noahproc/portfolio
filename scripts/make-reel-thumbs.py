"""Small copies of the life photos for the homepage reel (300x336, ~17KB each).
Run from the repo root after adding or changing a photo:  python3 scripts/make-reel-thumbs.py
The reel's order and captions live in index.html (#reel)."""
import os
from PIL import Image, ImageOps

SRC, OUT = 'assets/images/photos', 'assets/images/reel'
NAMES = ('hello coaster science-review tennis group-photo theater dinner-candid campus-blue park-walk '
         'speech ice-cream travel campus-sunset dinner-friends car-selfie mirror city-skyline museum').split()
os.makedirs(OUT, exist_ok=True)
for n in NAMES:
    im = Image.open(f'{SRC}/{n}.webp').convert('RGB')   # convert also drops any EXIF
    ImageOps.fit(im, (300, 336), Image.LANCZOS, centering=(0.5, 0.4)).save(f'{OUT}/{n}.webp', quality=70, method=6, exif=b'')
print(len(NAMES), 'reel thumbnails written')
