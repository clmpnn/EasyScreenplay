/* ══ 90 · go ════════════════════════════════════════════════════════════ */
(function(){
  function safe(name, fn){ try { fn(); } catch (e) { console.error('[es] ' + name + ' failed', e); } }

  /* the rail foot says what you have, not what you owe */
  function paintCount(){
    var el = Z.$('#prog'); if (!el || !Z.page) return;
    var list = Z.page.list(), pages = 0;
    list.forEach(function(r){
      var sc = Z.page.load(r.id); if (!sc) return;
      pages += Z.paginate(sc.blocks.filter(function(b){ return b.x.trim(); })).pages;
    });
    el.textContent = list.length
      ? Z.plural(list.length, 'script') + ' · ' + Z.plural(pages, 'page')
      : 'no pages yet';
  }
  /* listeners first: the app opens a page during init, and that repaint counts */
  ['page:change', 'page:close', 'page:open'].forEach(function(ev){ Z.on(ev, paintCount); });

  safe('theme', Z.initTheme);
  safe('width', Z.initWidth);
  safe('rail', Z.initRail);
  safe('tools', function(){ Z.$$('.tool[data-tool]').forEach(Z.renderTool); });
  safe('examples', function(){ Z.initExamples && Z.initExamples(); });
  safe('bind', function(){ Z.bindFields(document); });
  safe('count', paintCount);
  safe('app', Z.initApp);
  safe('hash', function(){
    if (!location.hash) return;
    var t = document.getElementById(location.hash.slice(1));
    if (!t) return;
    var n = t; while (n) { if (n.tagName === 'DETAILS') n.open = true; n = n.parentElement; }
    setTimeout(function(){ t.scrollIntoView(); }, 50);
  });
})();
