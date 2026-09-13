# Changelog

## Unreleased

- **The published site now lands on the guide.** Arriving at a web address you
  do not yet know what this is, so the guide opens and its first button is
  "Write my first page"; opening the file from your own disk still goes straight
  to the first-page coach, because you came to write. After the first visit both
  remember whichever surface you left.
- Fixed: a link to a section (`…/#format`) opened the writing surface on top of
  the thing it linked to — which covers the whole viewport, so the page scrolled
  somewhere invisible. A deep link now always lands on its section.
- Fixed: **23 links in the guide went nowhere.** Eleven were sections cut with
  the funding campaign (the 30-day map, the daily loop, the glossary, the HUD
  card, the contest-target tables) and twelve were the format doctor's rule
  references, still pointing at ids from the file this was lifted out of. Every
  link now resolves, and `tests/test_app.py` checks it so this cannot come back.
- Fixed: turning auto-save off and on again left it off, while the toast said it
  was on — and it stayed stuck until a reload, because the in-memory flag was
  written back over the one that had just been set. Everything typed after that
  lived only until the tab closed.
- Fixed: Escape closed the writing page from anywhere in the document, so
  clearing the guide's search box or cancelling the "new script" prompt also
  shut the page you were writing on.
- Fixed: the doctor's rule references now uncover the guide before scrolling to
  it — side by side where there is room, otherwise closing the page (which
  saves). They previously scrolled a guide the reader could not see.
- Fixed: "COP 1 / COP 2" was reported as one character misspelt, which also made
  a legitimate scene unable to reach a clean twelve. Numbered and functional
  names are exempt, and a one-character difference (JIM / TIM) is now a "look at
  this" rather than a "fix this"; the same name typed two ways (MARY JANE /
  MARY-JANE) is still a hard fix.
- Fixed: a character name with an accent could never be found in an action line
  (`\b` only knows ASCII), so ÉLODIE got a permanent "speaks before we meet
  them" and her capitalisation was never checked at all.
- Fixed: on Windows layouts where AltGr reports as Ctrl+Alt, AltGr+2 and AltGr+3
  silently changed the element instead of typing @ or #.
- Fixed: only the screenplay page flushed its pending write when the tab closed.
  Every story-tool field, ledger note and drill answer relied on the timer, so
  up to ~2.5s of typing — a whole logline — could die with the tab.
- Removed the last five traces of the campaign elsewhere: the "P1 gate" and
  "P3 gate" labels on the reading log and the beat meter, a registration fee
  quoted in dollars beside a pointer to a section that no longer exists, and a
  "live through August 2026" claim about a blog — a currency claim with a date
  in it is stale the moment it is written.
- The readers section lost the last of the funding campaign: gate dates, service
  fees, contest portal mechanics and 2026–27 deadlines. What it kept is the
  craft — how to find readers who read you twice, what to ask, and the table
  read. No fee is quoted anywhere, because they change every year.

- Added `LICENSE`: all rights reserved, with third-party notices for the
  typefaces, the .fdx and .fountain formats, and the craft references.
- Ready for GitHub Pages: a build-and-deploy workflow, a service worker that
  makes the site work offline and installable, a web app manifest with icons,
  a social card with Open Graph tags, a 404 page, `.nojekyll`, `robots.txt`,
  theme colours and an SVG favicon. `build.py` now also writes `sw.js`, and
  takes `--site URL` to emit absolute social-card and canonical URLs — those
  two only: every icon, script and link in the page stays relative, so the same
  file works from disk, from a project sub-path and from a custom domain.
- Added `tools/make_icons.py`: the icon family is now drawn from one described
  mark rather than committed as binaries with no origin. Every shape is an
  axis-aligned rectangle, so each pixel is the exact area the rectangles cover
  in it — computed, not sampled. That needs no image library (the standard
  library only), renders in about 0.1s, drops the icons to a third of their
  size, and is visibly sharper at 32px than the supersampled render it replaces,
  which haloed the page edge. `--check` reports drift and is the only part that
  wants Pillow.
- Fixed: the service worker's cache name hashed only `index.html`, so a changed
  icon or manifest would have sat behind a cache that still looked current. It
  now hashes every file the worker precaches.
- Added `setup-pages.py` and `docs/pages-workflow.yml`: the publish workflow,
  readable on its own and installed into `.github/workflows/` by one command.
- Fixed: `.gitignore` excluded `*.png`, so none of the icons or the social card
  would have been committed — the published site would have had no favicon, no
  installable manifest and no link preview. Site images are now kept; stray
  screenshots are still ignored.
- Added `tests/test_pages.py`: serves the repo under a sub-path the way Pages
  does, then checks the icons, manifest, service-worker scope, precache, the
  404 page and the social card — and pulls the network out to prove the app
  still opens. Eleven checks, green against both the folder on disk and the
  pruned artifact the workflow uploads.

## 1.0.0 — 13 September 2026

First release. EasyScreenplay is the writing half of a larger personal
screenwriting plan, lifted out and made into a tool.

**In**
- The screenplay page as the app: Final Draft's keys, honest pagination,
  auto-uppercase, name completion, notes that never print, undo across
  structure, read-aloud with a voice per character, multiple scripts.
- The format doctor: ~30 rules mapped to the twelve mistakes, each one named,
  explained and one click from the line.
- Import and export: `.fountain`, `.fdx`, plain text, print → PDF.
- The story tools: ideas, the story test, logline builder with live linting,
  character cards, five beats, scene cards — all kept per idea.
- Fifteen scored drills, including retype-from-memory and the scene spinner.
- The craft guide, rewritten as a searchable reference in five groups.
- Saving in the browser, a one-file backup, a restore that replaces, a
  non-destructive backup test, a plain-text export of everything.

**Out** (this is the half that was cut)
- The sixty-seven-week funding campaign, programme targets, deadlines, fees,
  application components, recommenders, the statement of purpose, the
  verification ledger and the calendar export.
- The thirty-day map, the daily desk, the session timer, the streak, the
  self-tests, the day-25 exam and the spaced-repetition deck.

**Kept from the parent file's history**: the layout that fills any screen, the
quiet flat design, the warm palette, and 41 defect fixes — chiefly that the
page saves while you type, that restoring a backup replaces rather than merges,
and that typing into a story tool before an idea exists no longer blanks the
field.
