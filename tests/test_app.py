#!/usr/bin/env python3
"""EasyScreenplay — browser tests.

    python3 tests/test_app.py

Runs headless Chromium against index.html and checks the things that would
actually cost you work if they broke: the editor keys, the doctor, the format
round-trips, saving and backups, the story tools, the drills, and the layout at
phone and desktop widths.
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'index.html')
ok, bad = [], []


def chk(c, label, extra=''):
    (ok if c else bad).append(label + (' — ' + str(extra) if extra else ''))


async def page(b, w=1400, h=1000, dark=False):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark' if dark else 'light')
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text[:160])
          if m.type == 'error' and 'ERR_FAILED' not in m.text else None)

    async def route(r):
        if r.request.url.startswith('http'):
            await r.abort()
        else:
            await r.continue_()
    await pg.route('**/*', route)
    await pg.goto(URL)
    await pg.wait_for_timeout(900)
    await pg.add_style_tag(content='html{scroll-behavior:auto !important}')
    return ctx, pg, errs


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ── it opens, and it opens on a page ───────────────────────────
        ctx, pg, errs = await page(b)
        chk(not errs, 'opens with no errors', errs[:3])
        chk(await pg.evaluate("Z.page.isOpen()"), 'a first visit lands on the page, not on the guide')
        chk(await pg.evaluate("!!document.querySelector('.pc-items')"), 'the first-page coach is there')
        r = await pg.evaluate("""(() => {
          var t = Z.$$('.tool[data-tool]');
          return {n: t.length, empty: t.filter(function(e){ return !e.children.length; }).map(function(e){ return e.dataset.tool; })};
        })()""")
        chk(r['n'] >= 25 and not r['empty'], 'every tool renders', r)
        gone = await pg.evaluate("""(() => {
          var txt = document.body.innerText;
          return ['Michener', 'MFA', 'sixty-seven', 'recommender', 'statement of purpose',
                  'thirty-day map', 'recall', 'Step 1 ·'].filter(function(w){ return txt.indexOf(w) > -1; });
        })()""")
        chk(not gone, 'nothing left of the campaign', gone)

        # ── the editor ────────────────────────────────────────────────
        keys = await pg.evaluate("""(() => {
          var s = Z.page.create('Keys', [{t: 'slug', x: ''}]);
          Z.page.open({scriptId: s.id});
          function press(k, opt){
            var ta = document.querySelector('#pgPaper .b.cur textarea') || document.querySelector('#pgPaper textarea');
            ta.focus();
            ta.dispatchEvent(new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, opt || {})));
          }
          function type(v){
            var ta = document.activeElement;
            ta.value = v; ta.dispatchEvent(new Event('input', {bubbles: true}));
          }
          type('INT. BAR - DAY'); press('Enter');
          type('He waits.'); press('Enter'); press('Tab');
          type('BOB'); press('Enter');
          type('You came.');
          return Z.page.current().blocks.map(function(b){ return b.t; });
        })()""")
        chk(keys == ['slug', 'action', 'char', 'dia'], 'Enter and Tab walk the six shapes', keys)

        conv = await pg.evaluate("""(() => {
          var s = Z.page.create('Auto', [{t: 'action', x: ''}]);
          Z.page.open({scriptId: s.id});
          var ta = document.querySelector('#pgPaper textarea'); ta.focus();
          ta.value = 'int. kitchen - night'; ta.dispatchEvent(new Event('input', {bubbles: true}));
          var b = Z.page.current().blocks[0];
          return {t: b.t, x: b.x};
        })()""")
        chk(conv['t'] == 'slug' and conv['x'] == conv['x'].upper(), '"int." makes a scene heading, upper-cased', conv)

        doc = await pg.evaluate("""(() => {
          var s = Z.page.create('Doc', [
            {t: 'slug', x: 'INT. OFFICE - DAY'},
            {t: 'action', x: 'We see SARAH. She is nervous and really wants the job.'},
            {t: 'action', x: 'CLOSE UP ON her hands.'}]);
          var issues = Z.doctor.run(s.blocks);
          return {rules: issues.map(function(i){ return i.rule; }), score: Z.doctor.score(issues).score};
        })()""")
        chk('wesee' in doc['rules'] and 'inner' in doc['rules'] and 'camera' in doc['rules'],
            'the doctor finds "we see", an inner state and a camera direction', doc['rules'][:6])
        chk(doc['score'] < 12, 'a page with mistakes does not score clean', doc['score'])

        fmt = await pg.evaluate("""(() => {
          var sc = {title: 'T', author: 'A', contact: 'a@b.c', blocks: [
            {t: 'slug', x: 'INT. BAR - DAY'}, {t: 'action', x: 'He waits.', n: 'cut? [maybe]'},
            {t: 'char', x: 'BOB'}, {t: 'dia', x: 'You came.'}]};
          var f = Z.parseScript(Z.toFountain(sc)), x = Z.parseFDX(Z.toFDX(sc));
          return {ftypes: f.blocks.map(function(b){ return b.t; }), note: f.blocks[1].n,
                  text: f.blocks[1].x, xtypes: x.blocks.map(function(b){ return b.t; }), contact: x.contact};
        })()""")
        chk(fmt['ftypes'] == ['slug', 'action', 'char', 'dia'], 'fountain round-trips the shapes', fmt['ftypes'])
        chk(fmt['note'] == 'cut? [maybe]' and fmt['text'] == 'He waits.', 'notes survive a round-trip', fmt)
        chk(fmt['xtypes'] == ['slug', 'action', 'char', 'dia'] and fmt['contact'] == 'a@b.c', '.fdx round-trips', fmt)

        pagi = await pg.evaluate("""(() => {
          var b = [];
          for (var i = 0; i < 200; i++) b.push({t: 'action', x: 'A line of action that runs about half the width.'});
          var p = Z.paginate(b);
          return {pages: p.pages, first: p.pageOf[0], last: p.pageOf[199]};
        })()""")
        chk(pagi['pages'] > 1 and pagi['first'] == 1 and pagi['last'] == pagi['pages'], 'pagination counts real pages', pagi)
        await ctx.close()

        # ── saving, backup, restore ───────────────────────────────────
        ctx, pg, errs = await page(b)
        r = await pg.evaluate("""(() => {
          Z.store.set('ideas', '[{"id":"a","t":"ALPHA"}]');
          var snap = Z.store.snapshot();
          Z.store.set('ladder:zz', '{"orphan":1}');
          var on = Z.store.restore(snap);
          return {orphan: Z.store.get('ladder:zz'), on: on, ideas: Z.store.get('ideas')};
        })()""")
        chk(r['orphan'] is None, 'restoring a backup replaces rather than merges', r)
        r = await pg.evaluate("""(() => {
          var made = null, orig = Z.download;
          Z.download = function(n, body){ made = {n: n, body: body}; };
          Z.backup(); Z.download = orig;
          var j = JSON.parse(made.body);
          return {name: made.n, app: j.app, hasSave: 'save' in j.data, keys: Object.keys(j.data).length};
        })()""")
        chk(r['app'] == 'easyscreenplay' and not r['hasSave'] and r['name'].startswith('easyscreenplay-backup'),
            'the backup is an EasyScreenplay file and carries no saving switch', r)
        r = await pg.evaluate("""(async () => {
          Z.page.open();
          var ta = document.querySelector('#pgPaper textarea'); ta.focus();
          for (var i = 0; i < 40; i++) {
            ta.value += 'X'; ta.dispatchEvent(new Event('input', {bubbles: true}));
            await new Promise(r => setTimeout(r, 100));
          }
          var id = Z.store.get('script-cur');
          return (localStorage.getItem('ztf-script:' + id) || '').match(/X/g).length;
        })()""")
        chk(r >= 10, 'typing without a pause still reaches the disk', r)
        await ctx.close()

        # ── the story tools ───────────────────────────────────────────
        ctx, pg, errs = await page(b)
        await pg.evaluate("Z.page.close()")
        r = await pg.evaluate("""(async () => {
          var inp = document.querySelector('#test .tool textarea, #test .tool input[type=text]');
          inp.focus(); inp.value = 'restore the system';
          inp.dispatchEvent(new Event('input', {bubbles: true}));
          await new Promise(r => setTimeout(r, 700));
          return {kept: inp.value, ideas: Z.ladder.ideas().length};
        })()""")
        chk(r['kept'] == 'restore the system' and r['ideas'] == 1,
            'typing into a story tool with no idea yet starts one and keeps the words', r)
        r = await pg.evaluate("""(() => {
          var a = Z.ladder.activeId();
          Z.ladder.set('log.pro', 'a grieving engineer');
          var b = Z.ladder.add({t: 'SECOND'}); Z.ladder.activate(b.id);
          Z.ladder.set('log.pro', 'a bored surveyor');
          Z.ladder.activate(a);
          return Z.ladder.get('log.pro');
        })()""")
        chk(r == 'a grieving engineer', 'each idea keeps its own work', r)
        chk(not errs, 'no errors in the story tools', errs[:3])
        await ctx.close()

        # ── the drills ────────────────────────────────────────────────
        ctx, pg, errs = await page(b)
        await pg.evaluate("Z.page.close()")
        r = await pg.evaluate("""(() => {
          var el = [].slice.call(document.querySelectorAll('.tool[data-tool="drill"]'))
                     .filter(function(e){ return e.dataset.id === 'shapes'; })[0];
          el.querySelector('button.btn.primary').click();
          var q = el.querySelector('.dr-q'), opts = el.querySelectorAll('button.opt');
          var n = opts.length;
          opts[0].click();
          return {asked: !!q.textContent.trim(), options: n, feedback: !!el.querySelector('.dr-fb p')};
        })()""")
        chk(r['asked'] and r['options'] >= 4 and r['feedback'], 'a drill asks, answers and explains', r)
        r = await pg.evaluate("""(() => {
          Z.scores.record('shapes', 18, 18, true);
          return Z.scores.get('shapes');
        })()""")
        chk(r['best'] == 18 and r['pass'], 'drill scores are kept', r)
        chk(not errs, 'no errors in the drills', errs[:3])
        await ctx.close()

        # ── the layout ────────────────────────────────────────────────
        for w, h in [(390, 900), (820, 1100), (1440, 900), (2560, 1400)]:
            ctx, pg, errs = await page(b, w, h)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            iw = await pg.evaluate("document.documentElement.clientWidth")
            chk(sw <= iw + 1, f'{w}px: nothing scrolls sideways', f'{sw} vs {iw}')
            pw = await pg.evaluate("Math.round(document.querySelector('#pg').getBoundingClientRect().width)")
            chk(pw <= iw, f'{w}px: the page fits the window', pw)
            await pg.evaluate("Z.page.close()")
            doc = await pg.evaluate("Math.round(document.querySelector('.doc').getBoundingClientRect().width)")
            rail = await pg.evaluate("(() => {var r = document.querySelector('.rail'); return w > 1000 ? Math.round(r.getBoundingClientRect().width) : 0;})()".replace('w >', str(w) + ' >'))
            chk(doc >= iw - rail - 2, f'{w}px: the guide fills the window', {'doc': doc, 'rail': rail})
            chk(not errs, f'{w}px: no errors', errs[:2])
            await ctx.close()

        # ── printing ──────────────────────────────────────────────────
        ctx, pg, errs = await page(b, 1400, 1000)
        await pg.emulate_media(media='print')
        await pg.set_viewport_size({'width': 794, 'height': 1123})
        await pg.wait_for_timeout(300)
        over = await pg.evaluate("""(() => {const vw = 794, out = [];
          document.querySelectorAll('body *').forEach(el => {
            const cs = getComputedStyle(el); if (cs.display === 'none') return;
            const r = el.getBoundingClientRect();
            if (r.width > 1 && r.right > vw + 2) out.push(el.tagName + '.' + String(el.className).slice(0, 30));
          }); return out.slice(0, 5);})()""")
        chk(not over, 'the guide prints inside the paper', over)
        await ctx.close()

        await b.close()

asyncio.run(main())
for l in ok:
    print('PASS', l)
for l in bad:
    print('FAIL', l)
print('\n%d / %d passed' % (len(ok), len(ok) + len(bad)))
sys.exit(1 if bad else 0)
