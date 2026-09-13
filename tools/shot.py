import asyncio, sys, os
from playwright.async_api import async_playwright
async def main(out, sel, w=1440, h=1000, dark=False, pre=None):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark' if dark else 'light')
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: ' + str(e)))
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text[:160]) if m.type == 'error' and 'ERR_' not in m.text else None)
        async def route(r):
            if r.request.url.startswith('http'): await r.abort()
            else: await r.continue_()
        await pg.route("**/*", route)
        await pg.goto('file://' + os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')); await pg.wait_for_timeout(1000)
        await pg.add_style_tag(content='html{scroll-behavior:auto !important}')
        if pre and pre != 'none':
            await pg.evaluate(pre); await pg.wait_for_timeout(800)
        if sel and sel != 'none':
            await pg.evaluate(f"var e=document.querySelector({sel!r}); if(e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 8)")
            await pg.wait_for_timeout(500)
        await pg.screenshot(path=out)
        for e in errs: print(e)
        await b.close()
a = sys.argv
asyncio.run(main(a[1], a[2], int(a[3]) if len(a) > 3 else 1440, int(a[4]) if len(a) > 4 else 1000,
                 (a[5] == 'dark') if len(a) > 5 else False, a[6] if len(a) > 6 else None))
