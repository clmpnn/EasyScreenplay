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
python3 tests/test_app.py   # ~60 checks in a headless browser
```

## Editing the guide

Each section is one file in `src/guide/`, named `<group>-<slug>.html`, and its `id` is the slug
that the contents and every in-file link use. Add one by dropping in a file and adding its name
to `GROUPS` in `build.py`.

## Credits and provenance

The craft material was written for a personal screenwriting plan and extracted from it by
`tools/extract_guide.py`; it paraphrases and cites standard references (Field, Snyder, McKee,
Egri, Yorke, Truby, Riley) the way a set of notes does. Final Draft is a trademark of Final
Draft, Inc.; this project is not affiliated with it and only reads and writes its file format.

Personal project — no licence granted, all rights reserved.
