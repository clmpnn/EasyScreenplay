#!/usr/bin/env python3
"""EasyScreenplay — the published-site checks.

    python3 tests/test_pages.py

Serves the repo over HTTP the way GitHub Pages would (including a sub-path, so
nothing may assume it sits at the root) and checks the service worker, offline
loading, the manifest, the icons, the social card and the 404 page.
"""
import asyncio, functools, http.server, os, socketserver, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Pages serves a project repository under its own name. Nothing in the app may
# depend on that name, so pass any other to prove it:  test_pages.py /whatever/
BASE = sys.argv[1] if len(sys.argv) > 1 else '/easysp/'
if not (BASE.startswith('/') and BASE.endswith('/')): sys.exit('sub-path must be /like-this/')
ok, bad = [], []

def chk(c, label, extra=''):
    (ok if c else bad).append(label + (' — ' + str(extra) if extra else ''))

# The page asks Google Fonts for four faces. A machine with no route to the
# internet (this container, a plane, a locked-down office) refuses that request
# and Chromium logs it. That is the fallback stack doing its job, not a fault,
# so it is not counted — anything else is.
BLOCKED = ('ERR_FAILED', 'ERR_TUNNEL_CONNECTION_FAILED', 'ERR_NAME_NOT_RESOLVED',
           'ERR_INTERNET_DISCONNECTED', 'ERR_PROXY_CONNECTION_FAILED',
           'ERR_CONNECTION_REFUSED', 'ERR_BLOCKED_BY_CLIENT')

def offsite(text):
    return any(e in text for e in BLOCKED)

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]
        if p.startswith(BASE): p = p[len(BASE) - 1:]
        return os.path.normpath(os.path.join(ROOT, p.lstrip('/')))
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            self.send_response(404); self.send_header('Content-Type', 'text/html'); self.end_headers()
            with open(os.path.join(ROOT, '404.html'), 'rb') as f: self.wfile.write(f.read())
            return
        super().send_error(code, message, explain)
    def log_message(self, *a): pass

def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]

async def main():
    httpd, port = serve()
    site = f'http://127.0.0.1:{port}{BASE}'
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1200, 'height': 900})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text[:160])
               if m.type == 'error' and not offsite(m.text) else None)
        await pg.goto(site)
        await pg.wait_for_timeout(1200)
        chk(not errs, 'the served site opens with no errors', errs[:3])

        # Everything the browser fetches for itself: all of it must be there, and
        # all of it must be relative, or the site breaks under a project sub-path.
        assets = await pg.evaluate("""(async () => {
          var urls = [].slice.call(document.querySelectorAll('link[rel*=icon], link[rel=manifest]'))
                       .map(function(l){ return l.getAttribute('href'); })
                       .concat(['sw.js', 'robots.txt', '.nojekyll']);
          var out = {};
          for (var i = 0; i < urls.length; i++) {
            try { var r = await fetch(urls[i]); out[urls[i]] = r.status; }
            catch (e) { out[urls[i]] = 'ERR'; }
          }
          return out;
        })()""")
        chk(all(v == 200 for v in assets.values()), 'every icon and the manifest are served', assets)
        chk(all(not str(u).startswith(('/', 'http')) for u in assets),
            'the browser fetches nothing absolute — it works under a sub-path', list(assets))

        # The social card is the one URL that must be absolute on a deploy (a
        # crawler has no page to resolve it against) and relative on disk. Either
        # way the file itself has to exist, so the absolute form is checked by
        # its path, not by leaving the machine.
        card = await pg.evaluate("document.querySelector('meta[property=\"og:image\"]').getAttribute('content')")
        tail = card.split(BASE, 1)[1] if card.startswith('http') and BASE in card else card
        got = await pg.evaluate("(async (u) => { try { return (await fetch(u)).status; } catch (e) { return 'ERR'; } })(%r)" % tail)
        chk(got == 200, 'the social card is served', {'meta': card, 'fetched': tail, 'status': got})
        chk(card == 'assets/social-card.png' or (card.startswith('https://') and card.endswith(BASE + 'assets/social-card.png')),
            'the card URL is relative on disk, absolute on a deploy', card)

        man = await pg.evaluate("(async () => (await (await fetch('manifest.webmanifest')).json()))()")
        chk(man.get('start_url') == './' and man.get('scope') == './', 'the manifest is sub-path safe', man.get('start_url'))
        chk(len(man.get('icons', [])) >= 2 and any(i.get('purpose') == 'maskable' for i in man['icons']),
            'the manifest has icons, including a maskable one')

        reg = await pg.evaluate("""(async () => {
          var r = await navigator.serviceWorker.ready;
          return {scope: r.scope, active: !!r.active};
        })()""")
        chk(reg['active'] and reg['scope'].endswith(BASE), 'the service worker registers, scoped to the site', reg)

        cached = await pg.evaluate("""(async () => {
          var names = await caches.keys();
          var c = await caches.open(names[0]);
          var keys = await c.keys();
          return {names: names, files: keys.length};
        })()""")
        chk(cached['files'] >= 6 and cached['names'][0].startswith('easyscreenplay-'),
            'the app shell is precached', cached)

        # the real test: pull the plug
        await ctx.set_offline(True)
        pg2 = await ctx.new_page()
        off = []
        pg2.on('pageerror', lambda e: off.append(str(e)))
        await pg2.goto(site)
        await pg2.wait_for_timeout(1200)
        title = await pg2.title()
        works = await pg2.evaluate("!!(window.ZTF && ZTF.page && document.querySelector('#pgPaper'))")
        chk(title == 'EasyScreenplay' and works, 'offline, the whole app still loads', {'title': title, 'app': works})
        await ctx.set_offline(False)
        await pg2.close()

        # a link nobody typed correctly
        r404 = await pg.goto(site + 'does/not/exist')
        body = await pg.inner_text('h1')
        chk(r404.status == 404 and 'no page here' in body.lower(), 'the 404 page answers', body[:40])

        await b.close()
    httpd.shutdown()

asyncio.run(main())
for l in ok: print('PASS', l)
for l in bad: print('FAIL', l)
print('\n%d / %d passed' % (len(ok), len(ok) + len(bad)))
sys.exit(1 if bad else 0)
