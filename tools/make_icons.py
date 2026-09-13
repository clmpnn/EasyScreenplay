#!/usr/bin/env python3
"""Regenerate the icon family from one description of the mark.

    python3 tools/make_icons.py            → writes assets/favicon.svg and the PNGs
    python3 tools/make_icons.py --check    → regenerates in memory and reports any
                                             difference from what is committed

Everything else in this repository is assembled from readable source by
build.py. The icons were the exception — six binaries with nothing to say where
they came from. This is where they come from.

The mark is a screenplay page: dark ground, cream paper, and six ruled lines in
the shape of a scene — heading, two lines of action, a character cue, and two
lines of dialogue, the first of them gold. It is drawn once, on a 64-unit grid,
and every size is that same drawing scaled. Colours are the app's own, so
changing the palette here and in src/css keeps them honest with each other.

assets/social-card.png is NOT generated here. It sets type in four faces, so it
would only reproduce on a machine with those fonts installed; it is committed as
a finished asset instead. Requires Pillow (python3 -m pip install pillow).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')

# the app's palette, from src/css
GROUND = '#15120E'   # --paper, dark
PAPER = '#FAF5EC'    # --paper, light
INK = '#2B2621'      # --ink
GREY = '#6A6157'     # --ink-3
GOLD = '#A9781E'     # --gold

# the drawing, on a 64-unit grid: (x, y, width, height, colour)
GRID = 64
PAGE = (8, 8, 48, 48, PAPER)
LINES = [
    (14, 15, 24, 3, INK),    # scene heading
    (14, 22, 36, 3, GREY),   # action
    (14, 27, 28, 3, GREY),   # action
    (26, 35, 14, 3, INK),    # character cue, indented
    (20, 42, 26, 3, GOLD),   # dialogue, the line that matters
    (20, 47, 19, 3, GREY),   # dialogue
]

SIZES = {'favicon-32.png': 32, 'apple-touch-icon.png': 180,
         'icon-192.png': 192, 'icon-512.png': 512}


def svg():
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
           'role="img" aria-label="EasyScreenplay">' % (GRID, GRID),
           '  <rect width="%d" height="%d" fill="%s"/>' % (GRID, GRID, GROUND),
           '  <rect x="%d" y="%d" width="%d" height="%d" fill="%s"/>' % PAGE,
           '  <g fill="%s">' % GREY]
    for x, y, w, h, c in LINES:
        tail = ' fill="%s"' % c if c != GREY else ''
        out.append('    <rect x="%d" y="%d" width="%d" height="%d"%s/>' % (x, y, w, h, tail))
    out += ['  </g>', '</svg>', '']
    return '\n'.join(out)


def png(size):
    """Drawn at 8x and reduced, so the thin rules stay clean at 32px."""
    from PIL import Image, ImageDraw
    ss = 8
    big = size * ss
    img = Image.new('RGB', (big, big), GROUND)
    d = ImageDraw.Draw(img)
    k = big / float(GRID)

    def box(x, y, w, h, c):
        d.rectangle([round(x * k), round(y * k),
                     round((x + w) * k) - 1, round((y + h) * k) - 1], fill=c)

    box(*PAGE)
    for r in LINES:
        box(*r)
    return img.resize((size, size), Image.LANCZOS)


def main():
    check = '--check' in sys.argv
    changed = []

    want = svg()
    p = os.path.join(ASSETS, 'favicon.svg')
    have = open(p, encoding='utf-8').read() if os.path.exists(p) else None
    # a committed copy may carry provenance metadata added in transit; compare
    # the drawing, not the file
    if have is None or [l.strip() for l in have.split('\n') if '<rect' in l] != \
                       [l.strip() for l in want.split('\n') if '<rect' in l]:
        changed.append('favicon.svg')
        if not check:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(want)

    try:
        from PIL import Image, ImageChops
    except ImportError:
        sys.exit('Pillow is needed for the PNGs: python3 -m pip install pillow')

    for name, size in SIZES.items():
        img = png(size)
        p = os.path.join(ASSETS, name)
        if os.path.exists(p):
            old = Image.open(p).convert('RGB')
            same = old.size == img.size and ImageChops.difference(old, img).getbbox() is None
        else:
            same = False
        if not same:
            changed.append(name)
            if not check:
                img.save(p, optimize=True)

    if check:
        print('differs from what is committed: ' + ', '.join(changed) if changed
              else 'every icon matches the drawing')
        raise SystemExit(1 if changed else 0)
    print('wrote ' + ', '.join(changed) if changed else 'nothing to do — all current')


if __name__ == '__main__':
    main()
