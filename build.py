#!/usr/bin/env python3
"""Assemble index.html (and sw.js) from src/.

    python3 build.py                 → writes index.html and sw.js
    python3 build.py --check         → builds without writing, prints the size
    python3 build.py --site URL      → absolute social-card / canonical URLs,
                                       for a deploy (the Pages workflow does this)

Everything in src/ is plain CSS, plain JS and plain HTML fragments; this script
only concatenates them in a fixed order and drops them into src/shell.html.
There is no minifier, no bundler and no dependency: the output is meant to be
readable, and to keep working with no toolchain at all.
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'index.html')
SW = os.path.join(ROOT, 'sw.js')

# the guide, in reading order, by group
GROUPS = {
    'start': ['craft-first-page', 'craft-six-shapes', 'craft-vocabulary', 'craft-keeping'],
    'story': ['story-catch', 'story-test', 'story-logline', 'story-people', 'story-shape', 'story-cards'],
    'craft': ['craft-pages', 'craft-format', 'craft-words', 'craft-mistakes', 'craft-rewrite',
              'craft-readers', 'craft-read', 'craft-scripts'],
}


def read(*parts):
    with open(os.path.join(SRC, *parts), encoding='utf-8') as f:
        return f.read()


def ordered(dirname, ext):
    return sorted(f for f in os.listdir(os.path.join(SRC, dirname)) if f.endswith(ext))


def build(site=''):
    css = '\n'.join('/* ── ' + f + ' ── */\n' + read('css', f) for f in ordered('css', '.css'))
    js = '\n'.join(read('js', f) + '\n' for f in ordered('js', '.js'))
    page = read('page.html')

    html = read('shell.html')
    for group, names in GROUPS.items():
        frag = '\n'.join(read('guide', n + '.html') for n in names)
        html = html.replace('{{' + group + '}}', frag)
    html = html.replace('{{css}}', css).replace('{{js}}', js).replace('{{page}}', page)

    # {{site}} prefixes the social-card URL: empty (relative) for the file you
    # open from disk, absolute when a deploy passes --site.
    base = site.rstrip('/') + '/' if site else ''
    canon = ('<link rel="canonical" href="' + base + '">\n'
             '<meta property="og:url" content="' + base + '">') if site else ''
    html = html.replace('{{site}}', base).replace('{{canonical}}', canon)

    left = re.findall(r'\{\{(\w+)\}\}', html)
    if left:
        sys.exit('unfilled placeholder(s): ' + ', '.join(sorted(set(left))))

    # square corners everywhere: one sweep, so no rule can forget
    return square_corners(html)


def square_corners(html):
    def sweep(css):
        return re.sub(r'border-radius:\s*([^;}]+)',
                      lambda m: m.group(0) if '%' in m.group(1) else 'border-radius:0', css)
    parts = html.split('<style>')
    return parts[0] + ''.join(
        ('<style>' + sweep(p[:p.index('</style>')]) + p[p.index('</style>'):]) if '</style>' in p
        else ('<style>' + p) for p in parts[1:])


def service_worker(html):
    """The cache name is a hash of everything the worker precaches — the page and
    every file it names — so any change to any of them invalidates the old cache,
    and nothing else does. Hashing the page alone would leave a new icon or a
    changed manifest sitting behind a cache that still looked current.
    A file that is named but missing is hashed as absent rather than skipped, so
    adding it later still counts as a change."""
    src = read('sw.js')
    shell = re.findall(r"'\./([^']*)'", src[src.index('var SHELL'):src.index('];')])
    h = hashlib.sha256(html.encode('utf-8'))
    for name in sorted(set(n for n in shell if n and n != 'index.html')):
        path = os.path.join(ROOT, name)
        h.update(name.encode('utf-8'))
        h.update(open(path, 'rb').read() if os.path.exists(path) else b'<absent>')
    version = h.hexdigest()[:12]
    return src.replace('{{version}}', version), version


if __name__ == '__main__':
    site = ''
    if '--site' in sys.argv:
        site = sys.argv[sys.argv.index('--site') + 1]
    out = build(site)
    sw, version = service_worker(out)
    if '--check' in sys.argv:
        print('would write index.html', len(out), 'bytes · sw version', version)
    else:
        with open(OUT, 'w', encoding='utf-8') as f:
            f.write(out)
        with open(SW, 'w', encoding='utf-8') as f:
            f.write(sw)
        print('built', OUT, len(out), 'bytes · sw', version + (' · site ' + site if site else ''))
