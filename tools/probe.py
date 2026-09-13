import asyncio, sys, json, os
from playwright.async_api import async_playwright
async def main(js, pre=None):
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':1440,'height':1000}); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.on('console', lambda m: errs.append(m.type+': '+m.text[:200]) if m.type in ('error','warning') else None)
        async def route(r):
            if r.request.url.startswith('http'): await r.abort()
            else: await r.continue_()
        await pg.route("**/*", route)
        await pg.goto('file://' + os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')); await pg.wait_for_timeout(1000)
        if pre: await pg.evaluate(pre); await pg.wait_for_timeout(500)
        print(json.dumps(await pg.evaluate(js), indent=1)[:3000])
        print('ERRORS:', errs[:5])
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv)>2 else None))
