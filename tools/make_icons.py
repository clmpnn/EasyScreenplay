#!/usr/bin/env python3
"""Regenerate the icon family from one description of the mark.

    python3 tools/make_icons.py            → writes assets/favicon.svg and the PNGs
    python3 tools/make_icons.py --check    → reports any drift from the drawing
                                             (this one needs Pillow; writing does not)

Everything else in this repository is assembled from readable source by
build.py. The icons were the exception — binaries with nothing to say where they
came from. This is where they come from.

The mark is a screenplay page: dark ground, cream paper, and six ruled lines in
the shape of a scene — heading, two lines of action, a character cue, and two
lines of dialogue, the first of them gold. It is drawn once, on a 64-unit grid,
and every size is that same drawing scaled. The colours are the app's own, so
changing a colour here and in src/css keeps them honest with each other.

Nothing is imported but the standard library. Every shape is an axis-aligned
rectangle, so each pixel's colour is the exact area the rectangles cover in it —
computed directly rather than sampled, which is both sharper than supersampling
and quick enough to need no image library. That matters for more than purity:
a file that crosses a network can pick up metadata on the way, and a file you
generate on your own machine cannot.

assets/social-card.png is NOT generated here. It sets type in four faces, so it
would only reproduce on a machine with those fonts installed; it is kept as a
finished asset instead.
"""
import os
import struct
import sys
import zlib

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


def rgb(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


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


def render(size):
    """Paint the rectangles in order, each pixel weighted by the exact fraction
    of its area the rectangle covers. Returns rows of RGB bytes."""
    k = size / float(GRID)
    r, g, b = rgb(GROUND)
    buf = bytearray(bytes((r, g, b)) * (size * size))

    for x, y, w, h, colour in [PAGE] + LINES:
        cr, cg, cb = rgb(colour)
        x0, x1 = x * k, (x + w) * k
        y0, y1 = y * k, (y + h) * k
        for py in range(max(0, int(y0)), min(size, int(y1) + 1)):
            cov_y = min(y1, py + 1) - max(y0, py)
            if cov_y <= 0:
                continue
            base = py * size * 3
            for px in range(max(0, int(x0)), min(size, int(x1) + 1)):
                cov_x = min(x1, px + 1) - max(x0, px)
                if cov_x <= 0:
                    continue
                a = cov_x * cov_y
                i = base + px * 3
                if a >= 1.0:
                    buf[i], buf[i + 1], buf[i + 2] = cr, cg, cb
                else:
                    n = 1.0 - a
                    buf[i] = int(buf[i] * n + cr * a + 0.5)
                    buf[i + 1] = int(buf[i + 1] * n + cg * a + 0.5)
                    buf[i + 2] = int(buf[i + 2] * n + cb * a + 0.5)
    return buf


def png(size):
    """A minimal PNG: 8-bit RGB, one IDAT, no ancillary chunks of any kind."""
    buf = render(size)
    raw = bytearray()
    stride = size * 3
    for y in range(size):
        raw.append(0)                       # filter: none
        raw += buf[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
            + chunk(b'IEND', b''))


def drawing_of(svg_text):
    return [l.strip() for l in svg_text.split('\n') if '<rect' in l]


def main():
    check = '--check' in sys.argv
    changed = []

    want = svg()
    p = os.path.join(ASSETS, 'favicon.svg')
    have = open(p, encoding='utf-8').read() if os.path.exists(p) else ''
    # a copy that has crossed a network may carry added metadata; compare the
    # drawing, not the file
    if drawing_of(have) != drawing_of(want):
        changed.append('favicon.svg')
        if not check:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(want)

    if check:
        try:
            from PIL import Image, ImageChops
        except ImportError:
            sys.exit('--check needs Pillow (python3 -m pip install pillow).\n'
                     'Writing the icons needs nothing: run without --check.')
        import io
        for name, size in SIZES.items():
            p = os.path.join(ASSETS, name)
            fresh = Image.open(io.BytesIO(png(size))).convert('RGB')
            if os.path.exists(p):
                old = Image.open(p).convert('RGB')
                same = old.size == fresh.size and \
                    ImageChops.difference(old, fresh).getbbox() is None
            else:
                same = False
            if not same:
                changed.append(name)
        print('differs from the drawing: ' + ', '.join(changed) if changed
              else 'every icon matches the drawing')
        raise SystemExit(1 if changed else 0)

    for name, size in SIZES.items():
        p = os.path.join(ASSETS, name)
        data = png(size)
        if not os.path.exists(p) or open(p, 'rb').read() != data:
            changed.append(name)
            with open(p, 'wb') as f:
                f.write(data)

    print('wrote ' + ', '.join(changed) if changed else 'nothing to do — all current')


if __name__ == '__main__':
    main()
