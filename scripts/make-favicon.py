"""Build the site icons from Noah's chrome star sticker.
Run from the repo root:  python3 scripts/make-favicon.py
Writes favicon.ico (16/32/48) at the root, plus assets/icons/favicon-32.png,
favicon-192.png and apple-touch-icon.png (180, on white, since iOS fills transparency with black)."""
from PIL import Image

SRC = 'assets/images/stickers/star-chrome.webp'

def square(im, size, pad=0.06, bg=None):
    im = im.copy()
    inner = round(size * (1 - 2 * pad))
    im.thumbnail((inner, inner), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return out

star = Image.open(SRC).convert('RGBA')
star = star.crop(star.getbbox())
square(star, 48, pad=0.02).save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
square(star, 32, pad=0.02).save('assets/icons/favicon-32.png')
square(star, 192).save('assets/icons/favicon-192.png')
square(star, 180, pad=0.12, bg=(255, 255, 255, 255)).convert('RGB').save('assets/icons/apple-touch-icon.png')
print('icons written')
