/* ══ 20 · rail: theme, contents, scroll-spy, search, filters, drawer ═════ */
(function(){
  var S = Z.store;

  /* theme */
  var root = document.documentElement;
  var saved = S.get('theme');
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  Z.initTheme = function(){
    var b = Z.$('#themeBtn'); if (!b) return;
    b.addEventListener('click', function(){
      var cur = root.getAttribute('data-theme');
      if (!cur) cur = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      S.set('theme', next);
    });
  };

  /* column width — full screen, or a narrower column for long reading */
  var wsaved = S.get('width');
  if (wsaved === 'snug') root.setAttribute('data-width', 'snug');
  Z.initWidth = function(){
    var b = Z.$('#widthBtn'); if (!b) return;
    function paint(){
      var snug = root.getAttribute('data-width') === 'snug';
      b.textContent = snug ? '⇔ snug' : '⇔ full';
      b.setAttribute('aria-pressed', snug ? 'true' : 'false');
      b.title = snug ? 'A narrower column. Click for the full screen.' : 'The full screen. Click for a narrower column.';
    }
    b.addEventListener('click', function(){
      var snug = root.getAttribute('data-width') === 'snug';
      if (snug) { root.removeAttribute('data-width'); S.set('width', 'full'); }
      else { root.setAttribute('data-width', 'snug'); S.set('width', 'snug'); }
      paint();
    });
    paint();
  };

  function strip(t){ return t.replace(/\s*[✅⚠️❓❌💰★🔒◇⚑]\s*/g, ' ').trim(); }
  function textOf(node){
    if (!node) return '';
    var c = node.cloneNode(true);
    Z.$$('.tool, .tryit', c).forEach(function(n){ n.remove(); });
    return c.textContent || '';
  }

  Z.initRail = function(){
    var toc = Z.$('#toc'), links = [], subs = [], spyHeads = [];

    Z.$$('#doc .part-head h1, #doc .sec-head h2, #doc .sec-body h3').forEach(function(h){
      var isPart = h.tagName === 'H1', isStep = h.tagName === 'H2';
      var host = h.closest(isPart ? '.part' : '.sec');
      if (!host || !host.id) return;
      if (!isPart && !isStep && h.closest('.tool')) return;
      var a = document.createElement('a');
      a.href = '#' + (isPart || isStep ? host.id : h.id);
      var text = strip(h.textContent);
      if (isPart) {
        a.className = 'l1';
        var kick = host.querySelector('.part-kick span');
        a.textContent = (kick ? kick.textContent + ' · ' : '') + text;
      } else if (isStep) {
        a.className = 'lstep';
        var sp = document.createElement('span');
        sp.textContent = text;
        a.appendChild(sp);
      } else {
        a.className = 'l3';
        a.textContent = text;
      }
      a.dataset.k = text.toLowerCase();
      var scope = isPart ? host.querySelector('.part-lead') : (isStep ? host.querySelector('.sec-body') : null);
      var bodyTxt = '';
      if (scope) bodyTxt = textOf(scope);
      else { var n = h.nextElementSibling; while (n && !/^H[23]$/.test(n.tagName)) { bodyTxt += ' ' + textOf(n); n = n.nextElementSibling; } }
      a.dataset.b = bodyTxt.toLowerCase().replace(/\s+/g, ' ').slice(0, 24000);
      toc.appendChild(a);
      if (a.className === 'l3') subs.push(a); else { links.push(a); spyHeads.push(host); }
    });
    var none = Z.h('div.toc-none', null, 'Nothing in this file matches that. Try a shorter word.');
    toc.appendChild(none);

    /* scroll-spy */
    var byId = {}; links.forEach(function(a){ byId[a.getAttribute('href').slice(1)] = a; });
    var current = null;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (!e.isIntersecting) return;
          var a = byId[e.target.id];
          if (!a || a === current) return;
          if (current) current.classList.remove('active');
          a.classList.add('active'); current = a;
          var r = a.getBoundingClientRect(), rr = toc.getBoundingClientRect();
          if (r.top < rr.top + 40 || r.bottom > rr.bottom - 40) toc.scrollTop += r.top - rr.top - rr.height / 2;
        });
      }, {rootMargin: '0px 0px -78% 0px', threshold: 0});
      spyHeads.forEach(function(h){ if (h) io.observe(h); });
    }

    /* back to top */
    var t = Z.$('#totop');
    t.addEventListener('click', function(){ window.scrollTo({top: 0, behavior: 'smooth'}); });
    var tick = false;
    addEventListener('scroll', function(){ if (tick) return; tick = true; requestAnimationFrame(function(){ t.classList.toggle('on', scrollY > 900); tick = false; }); }, {passive: true});

    /* search */
    var q = Z.$('#q'), allLinks = Z.$$('a', toc);
    function snippet(body, v){
      var i = body.indexOf(v); if (i < 0) return '';
      var from = Math.max(0, i - 34), to = Math.min(body.length, i + v.length + 46);
      return (from ? '…' : '') + body.slice(from, to).trim() + (to < body.length ? '…' : '');
    }
    function paintSnip(a, text){
      var el = a.nextElementSibling;
      if (el && el.className === 'toc-snip') el.remove();
      if (!text) return;
      a.after(Z.h('div.toc-snip', null, text));
    }
    function runSearch(){
      var v = q.value.trim().toLowerCase(), any = !v, firstTitle = null, firstBody = null;
      allLinks.forEach(function(a){
        var inTitle = !!v && (a.dataset.k || '').indexOf(v) !== -1;
        var inBody = !!v && v.length >= 3 && (a.dataset.b || '').indexOf(v) !== -1;
        var hit = !v || inTitle || inBody;
        if (a.classList.contains('l3')) a.classList.toggle('show', !!v && hit);
        else a.classList.toggle('hide', !hit);
        if (v && hit) { any = true; if (inTitle && !firstTitle) firstTitle = a; else if (!firstBody) firstBody = a; }
        paintSnip(a, (v && inBody && !inTitle) ? snippet(a.dataset.b, v) : '');
      });
      none.classList.toggle('show', !!v && !any);
      runSearch._first = firstTitle || firstBody;
    }
    q.addEventListener('input', runSearch);
    q.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && runSearch._first) { e.preventDefault(); runSearch._first.click(); }
      if (e.key === 'Escape') { q.value = ''; runSearch(); q.blur(); }
    });

    /* any in-file link opens the folds around its target and reveals a folded part */
    document.addEventListener('click', function(e){
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href').slice(1); if (!id) return;
      var tg = document.getElementById(id); if (!tg) return;
      Z.emit('reveal', tg);
      var n = tg; while (n) { if (n.tagName === 'DETAILS') n.open = true; n = n.parentElement; }
    });

    /* print: every fold opens (unless printing the script) */
    var wasOpen = null;
    addEventListener('beforeprint', function(){
      if (document.body.classList.contains('printing-script')) return;
      var ds = document.querySelectorAll('#doc details');
      wasOpen = Array.prototype.map.call(ds, function(d){ return d.open; });
      Array.prototype.forEach.call(ds, function(d){ d.open = true; });
    });
    addEventListener('afterprint', function(){
      if (!wasOpen) return;
      var ds = document.querySelectorAll('#doc details');
      Array.prototype.forEach.call(ds, function(d, i){ d.open = wasOpen[i]; });
      wasOpen = null;
    });

    /* mobile drawer */
    var rail = Z.$('#rail'), scrim = Z.$('#scrim'), btn = Z.$('#railbtn');
    function drawer(open){ rail.classList.toggle('open', open); scrim.classList.toggle('on', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    btn.addEventListener('click', function(){ drawer(!rail.classList.contains('open')); });
    scrim.addEventListener('click', function(){ drawer(false); });
    rail.addEventListener('click', function(e){ if (e.target.closest('a, [data-go]') && innerWidth <= 1000) drawer(false); });
    addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        if (document.activeElement === q && q.value) { q.value = ''; runSearch(); q.blur(); return; }
        drawer(false);
      }
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.isContentEditable && !(Z.page && Z.page.isOpen() && e.target.closest && e.target.closest('#pg'))) {
        e.preventDefault(); q.focus(); q.select();
      }
    });

  };
})();
