#!/usr/bin/env python3
"""Assemble index.html from src/.

    python3 build.py            → writes index.html
    python3 build.py --check    → builds to a temp file and reports the size only

Everything in src/ is plain CSS, plain JS and plain HTML fragments; this script
only concatenates them in a fixed order and drops them into src/shell.html.
There is no minifier, no bundler and no dependency: the output is meant to be
readable, and to keep working with no toolchain at all.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'index.html')

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


def build():
    css = '\n'.join('/* ── ' + f + ' ── */\n' + read('css', f) for f in ordered('css', '.css'))
    js = '\n'.join(read('js', f) + '\n' for f in ordered('js', '.js'))
    page = read('page.html')

    html = read('shell.html')
    for group, names in GROUPS.items():
        frag = '\n'.join(read('guide', n + '.html') for n in names)
        html = html.replace('{{' + group + '}}', frag)
    html = html.replace('{{css}}', css).replace('{{js}}', js).replace('{{page}}', page)

    left = re.findall(r'\{\{(\w+)\}\}', html)
    if left:
        sys.exit('unfilled placeholder(s): ' + ', '.join(sorted(set(left))))

    # square corners everywhere: one sweep, so no rule can forget
    html = square_corners(html)
    return html


def square_corners(html):
    def sweep(css):
        return re.sub(r'border-radius:\s*([^;}]+)',
                      lambda m: m.group(0) if '%' in m.group(1) else 'border-radius:0', css)
    parts = html.split('<style>')
    return parts[0] + ''.join(
        ('<style>' + sweep(p[:p.index('</style>')]) + p[p.index('</style>'):]) if '</style>' in p
        else ('<style>' + p) for p in parts[1:])


if __name__ == '__main__':
    out = build()
    if '--check' in sys.argv:
        print('would write', len(out), 'bytes')
    else:
        with open(OUT, 'w', encoding='utf-8') as f:
            f.write(out)
        print('built', OUT, len(out), 'bytes')
