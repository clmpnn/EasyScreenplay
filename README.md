# EasyScreenplay

A screenplay page that formats itself, a format doctor that reads what you wrote,
and a short craft guide — in **one HTML file** that works offline, with nothing installed.

Open `index.html` in any browser and start writing.

```
EasyScreenplay/
├── index.html        ← the whole app. This is the thing you open.
├── build.py          ← rebuilds index.html from src/
├── init-repo.cmd     ← double-click once to make this folder a git repo
├── src/              ← the real source: shell, css, js, guide
├── tests/            ← browser tests (Playwright)
├── tools/            ← screenshot + probe helpers, and the one-time extractor
└── docs/             ← the keyboard map
```

## Making it a repository

The folder ships without git metadata. Run **`init-repo.cmd`** once (or `./init-repo.sh`
on mac/Linux) and it becomes a git repo on `main` with one initial commit, under your own
git identity. After that it is an ordinary repository: commit when you change something,
`git log` to see what you changed, `git checkout` to go back.

## What it does

**Write.** A real screenplay page. You press <kbd>Enter</kbd> and <kbd>Tab</kbd>; it decides
whether a line is a scene heading, action, a character cue, a parenthetical, dialogue or a
transition, and puts it where it belongs. <kbd>Ctrl</kbd>/<kbd>Alt</kbd> + <kbd>1</kbd>–<kbd>6</kbd>
forces an element. Typing `int.` at the start of a line turns it into a heading. Names
auto-complete. Page breaks are drawn where they will really fall, so the page count is honest.

**Check.** The doctor reads your pages against the rules a reader notices first — camera
directions, inner states in action lines, "we see", bloated parentheticals, on-the-nose
dialogue, typed `(CONT'D)`, inconsistent character names, unfilmable description — names each
hit, explains it, and takes you to the line.

**Take it out.** `.fdx` (opens in Final Draft), `.fountain`, plain text, and print → PDF with
real 55-line pages. Import the same formats by dragging a file onto the page.

**Before you write.** Ideas, the four-box story test, a logline builder that lints as you type,
character cards, five beats, scene cards with a value charge — each one attached to the idea it
belongs to, so two ideas never overwrite each other.

**Practice.** Fifteen short drills that score themselves: name the shape, the camera test, the
keys, slug sprint, new heading or not, V.O. vs O.S., parentheticals, the logline doctor, does the
scene turn, enter late/exit early, subtext, compression, the twelve mistakes, retype-from-memory,
and a scene-pattern spinner that hands you a prompt and a constraint.

**The guide.** The craft, written to be searched rather than read: the six shapes, the complete
format rulebook, dialogue and subtext, the twelve mistakes, how to finish and rewrite, how to
brief a reader, how to read a script like a writer.

## Your work is yours

Everything you type is saved in **your browser, on your computer**, as you type. There is no
account, no server, and no network call anywhere in this file. That also means nothing else is
backing it up: use **⤓ Download a backup** (one small `.json` holding everything), keep it in a
cloud-synced folder, and use **✓ Test a backup file** once to prove it restores. A backup is also
how you move your work to another machine.

## Putting it on the web (GitHub Pages)

The repository is already shaped for it — `index.html` at the root is the site. This copy is
already a repo, already pushed to **github.com/clmpnn/easysp**, so three short steps are left:

1. `python3 setup-pages.py` — installs the build-and-publish workflow at
   `.github/workflows/pages.yml`. It is a copy of `docs/pages-workflow.yml`, which you can read
   first; that one step is separate only because a workflow file has to sit in that exact folder.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Commit and push what is here. `.github/workflows/pages.yml` then builds `index.html` from
   `src/` on every push to `main`, rewrites the social-card and canonical URLs to absolute ones,
   drops `src/`, `tests/`, `tools/`, `build.py` and the workflow from the published copy, and
   deploys. Your site will be **https://clmpnn.github.io/easysp/**.

A visitor who lands on that address gets the guide, with **▶ Write my first page** as its first
button. The copy you open from your own disk still goes straight into the first-page coach — you
came to write, they came to find out what this is. After the first visit, both reopen whichever
surface you left, and a link to a section (`…/#format`) always lands on that section.

Nothing in the page assumes that address. Every icon, script and link it fetches is relative, so
the same file works opened from disk, served from `/easysp/`, and served from a custom domain,
with no rebuild. Only two URLs are made absolute at deploy time — the social card and the
canonical link — because a crawler has no page to resolve them against.

What is already done for you:

- **`.nojekyll`** so Pages serves the files as they are instead of running Jekyll over them.
- **A service worker** (`sw.js`, generated by the build) — after the first visit the site opens
  with no network at all, and updates itself the next time you load it. Its cache name is a hash
  of `index.html`, so a rebuild always invalidates the old one and nothing else does.
- **A web app manifest** and icons, so a phone can install it to the home screen and open it
  full-screen, offline.
- **A social card** (`assets/social-card.png`) with Open Graph and Twitter tags, so a pasted link
  shows the app rather than a blank rectangle.
- **A 404 page** that explains itself and points back at the app.
- **Light and dark `theme-color`**, an SVG favicon, `robots.txt`.

Three things worth knowing before you publish:

- **The repository is already public, so the guide is already readable** — by anyone who finds
  `github.com/clmpnn/easysp`, with or without Pages. The licence still holds: people may read it,
  they may not copy or redistribute it. But the reason that licence is closed is that the guide
  paraphrases named craft books, and a public repo puts that in front of everyone. If that was
  not deliberate, **Settings → General → Danger Zone → Change visibility → Private** fixes it —
  bearing in mind that Pages from a private repo needs a paid GitHub plan. `robots.txt` has a
  commented-out `Disallow` if you would rather publish but not be indexed.
- **Anything you write on the site is stored in the browser, per origin.** On
  `clmpnn.github.io/easysp/` that origin is `clmpnn.github.io` — shared with every other Pages
  project on the account. Your scripts still never leave your machine, but if you want them fully
  walled off, use a custom domain or a `clmpnn.github.io` repo of its own.
- **Two copies, two stores.** The `index.html` you open from disk and the published site are
  different origins, so they do not share what you have written. Move work between them with
  **⤓ Download a backup** → **⤒ Restore from a backup**.

## Building

`index.html` is committed, so you never *have* to build. If you change anything in `src/`:

```bash
python3 build.py          # writes index.html
python3 build.py --check  # builds without writing, prints the size
```

The build only concatenates: `src/css/*.css` in name order, `src/js/*.js` in name order, the
guide fragments in the order set at the top of `build.py`, all dropped into `src/shell.html`.
No bundler, no minifier, no dependencies — the output stays readable, and the project keeps
working with no toolchain at all.

```bash
python3 -m pip install playwright && python3 -m playwright install chromium
python3 tests/test_app.py     # 39 checks: the app, in a headless browser
python3 tests/test_pages.py   # 11 checks: the published site, offline included
```

`test_pages.py` serves the repo under `/easysp/` the way Pages serves a project
repository, so anything that quietly assumed the site root fails there rather than after a
deploy. It also switches the network off mid-run to prove the service worker holds.

## The icons

`assets/` is drawn, not collected. `python3 tools/make_icons.py` regenerates the favicon and the
three PNG icons from one description of the mark at the top of that file — the palette is the
app's own, so changing a colour there and in `src/css` keeps them in step. It imports nothing but
the standard library and takes about a tenth of a second, so it is also the way to get icons that
have never left this machine: a file that crosses a network can arrive carrying provenance
metadata it did not start with, and a regenerated one cannot. `--check` compares what is
committed against the drawing and is the only part that wants Pillow. The social card is the
exception: it sets type in four faces, so it is kept as a finished file rather than rebuilt.

## Editing the guide

Each section is one file in `src/guide/`, named `<group>-<slug>.html`, and its `id` is the slug
that the contents and every in-file link use. Add one by dropping in a file and adding its name
to `GROUPS` in `build.py`.

## Licence

**Copyright © 2026 Claudia. All rights reserved.** See [LICENSE](LICENSE).

This is a personal project, not an open-source one: the source is readable, but no permission
to copy, modify or redistribute it is granted. Everything you *write* with it is yours alone —
the program claims nothing over your scripts, sends nothing anywhere, and stores nothing outside
your own browser.

Closed now is not closed forever: any version can be released under an open licence later. The
other direction does not work, which is why it starts here.

## Credits and provenance

The craft material was written for a personal screenwriting plan and extracted from it by
`tools/extract_guide.py`; it paraphrases and cites standard references (Field, Snyder, McKee,
Egri, Yorke, Truby, Riley) the way a set of working notes does — those authors retain all rights
in their own work. Final Draft is a trademark of Final Draft, Inc.; this project is not
affiliated with it and only reads and writes its file format. The four typefaces are
open-licensed and loaded from Google Fonts at runtime; none is bundled here.
