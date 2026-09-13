#!/usr/bin/env python3
"""Install the GitHub Pages workflow.

    python3 setup-pages.py

Copies docs/pages-workflow.yml to .github/workflows/pages.yml, which is the one
file that has to sit in that exact place for GitHub to run it. Read
docs/pages-workflow.yml first if you like — it is the whole of what gets
installed, and it only builds and publishes this folder.

Safe to run twice: if the file is already there and identical, it says so and
changes nothing.
"""
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'docs', 'pages-workflow.yml')
DST = os.path.join(ROOT, '.github', 'workflows', 'pages.yml')

if not os.path.exists(SRC):
    sys.exit('missing ' + SRC)

if os.path.exists(DST):
    with open(SRC, 'rb') as a, open(DST, 'rb') as b:
        if a.read() == b.read():
            print('already installed, unchanged:', os.path.relpath(DST, ROOT))
            raise SystemExit(0)
    print('replacing the existing', os.path.relpath(DST, ROOT))

os.makedirs(os.path.dirname(DST), exist_ok=True)
shutil.copyfile(SRC, DST)
print('installed', os.path.relpath(DST, ROOT))
print()
print('Next: commit and push, then on GitHub set')
print('  Settings -> Pages -> Build and deployment -> Source: GitHub Actions')
print('Your site will be https://clmpnn.github.io/easysp/')
