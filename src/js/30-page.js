/* ══ 30 · the practice page ════════════════════════════════════════════
   A screenplay page you can type on with nothing installed. It drives like
   Final Draft — Enter and Tab walk the writing the pages state machine, Ctrl/Alt+1–6
   force an element — so the keystrokes you drill here are the ones you will
   use there. Autosaves; exports .fountain / .fdx / .txt; prints to PDF.   */
(function(){
  var T = Z.T = {
    slug:   {name: 'Scene heading', short: 'Scene',     key: 1, width: 57},
    action: {name: 'Action',        short: 'Action',    key: 2, width: 57},
    char:   {name: 'Character',     short: 'Character', key: 3, width: 33},
    paren:  {name: 'Parenthetical', short: 'Paren',     key: 4, width: 19},
    dia:    {name: 'Dialogue',      short: 'Dialogue',  key: 5, width: 34},
    trans:  {name: 'Transition',    short: 'Transition',key: 6, width: 57}
  };
  var ORDER = ['slug', 'action', 'char', 'paren', 'dia', 'trans'];
  /* the writing the pages state machine */
  var ENTER_NEXT = Z.ENTER_NEXT = {slug: 'action', action: 'action', char: 'dia', paren: 'dia', dia: 'action', trans: 'slug'};
  var TAB_EMPTY  = Z.TAB_EMPTY  = {action: 'char', char: 'trans', dia: 'paren', paren: 'dia', slug: 'action', trans: 'slug'};
  var ENTER_EMPTY = {char: 'action', dia: 'action', paren: 'dia', slug: 'action', trans: 'slug'};
  var UPPER = {slug: 1, char: 1, trans: 1};
  var SPACE_BEFORE = {slug: 1, action: 1, char: 1, paren: 0, dia: 0, trans: 1};
  var LINES_PER_PAGE = 55;

  /* ── wrap text to a line length, the way a typewriter would ── */
  function wrapCount(text, width){
    var paras = String(text || '').split('\n'), n = 0;
    paras.forEach(function(p){
      if (!p.length) { n++; return; }
      var line = 0, words = p.split(/(\s+)/), lines = 1;
      words.forEach(function(w){
        if (!w) return;
        if (/^\s+$/.test(w)) { if (line) line += w.length; return; }
        while (w.length > width) { if (line) { lines++; line = 0; } w = w.slice(width); lines++; }
        if (line + w.length > width && line > 0) { lines++; line = w.length; }
        else line += w.length;
      });
      n += lines;
    });
    return Math.max(1, n);
  }
  Z.wrapCount = wrapCount;
  function blockLines(b){ return wrapCount(b.x, T[b.t].width); }
  Z.blockLines = blockLines;

  /* ── pagination estimate: 55 lines of script per page ── */
  function paginate(blocks){
    var page = 1, used = 0, pages = [];
    for (var i = 0; i < blocks.length; i++){
      var b = blocks[i], L = blockLines(b), sp = used ? SPACE_BEFORE[b.t] : 0;
      var need = sp + L;
      /* keep a heading or a character cue with what follows it */
      if ((b.t === 'slug' || b.t === 'char') && i + 1 < blocks.length) need += Math.min(2, blockLines(blocks[i + 1])) + (b.t === 'slug' ? 1 : 0);
      if (used + need > LINES_PER_PAGE && used > 0) { page++; used = 0; sp = 0; }
      pages[i] = page;
      used += sp + L;
      while (used > LINES_PER_PAGE) { page++; used -= LINES_PER_PAGE; }
    }
    var total = blocks.length ? (page - 1) + used / LINES_PER_PAGE : 0;
    return {pageOf: pages, pages: page, exact: total};
  }
  Z.paginate = paginate;

  function cueName(x){ return String(x || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase(); }
  Z.cueName = cueName;

  function stats(blocks){
    var p = paginate(blocks), words = 0, scenes = 0, names = {};
    blocks.forEach(function(b){
      if (b.t === 'action' || b.t === 'dia') words += Z.words(b.x);
      if (b.t === 'slug' && b.x.trim()) scenes++;
      if (b.t === 'char' && b.x.trim()) names[cueName(b.x)] = (names[cueName(b.x)] || 0) + 1;
    });
    return {pages: p.pages, exact: p.exact, words: words, scenes: scenes, names: names, pageOf: p.pageOf};
  }
  Z.scriptStats = stats;

  /* ══ storage of scripts ══ */
  var S = Z.store;
  function index(){ return S.getJSON('scripts', []); }
  function saveIndex(ix){ S.setJSON('scripts', ix); }
  function load(id){ return S.getJSON('script:' + id, null); }
  function persist(sc){
    sc.updated = Date.now();
    S.setJSON('script:' + sc.id, sc);
    var ix = index(), found = false;
    ix.forEach(function(r){ if (r.id === sc.id) { r.title = sc.title; r.updated = sc.updated; found = true; } });
    if (!found) ix.push({id: sc.id, title: sc.title, updated: sc.updated});
    saveIndex(ix);
  }
  function create(title, blocks, meta){
    var sc = {id: Z.uid(), title: title || 'Untitled', author: S.get('author') || '', contact: '', blocks: blocks && blocks.length ? blocks : [{t: 'slug', x: ''}], created: Date.now()};
    if (meta) Object.keys(meta).forEach(function(k){ sc[k] = meta[k]; });
    persist(sc);
    return sc;
  }
  function remove(id){
    S.del('script:' + id);
    saveIndex(index().filter(function(r){ return r.id !== id; }));
  }

  /* ══ the editor ══ */
  var root, paper, sel, titleIn, elBadge, statusEl, sideEl, coachEl, scrollEl, sugEl;
  var sc = null, cur = 0, undo = [], redo = [], typingOpen = false, typingT = null, openFlag = false;
  var mirror = null, covers = {names: false, dia: false, action: false};
  var fieldSizing = window.CSS && CSS.supports && CSS.supports('field-sizing', 'content');

  function snapshot(){ return {blocks: JSON.parse(JSON.stringify(sc.blocks)), cur: cur, pos: caretPos()}; }
  /* every undo step is a full copy of the script, so the depth has to come
     down as the script grows — 300 copies of a feature is a lot of memory
     for something you will never walk back that far */
  function undoCap(){
    var n = sc ? sc.blocks.length : 0;
    return n > 1500 ? 40 : n > 500 ? 120 : 300;
  }
  function pushUndo(){ undo.push(snapshot()); while (undo.length > undoCap()) undo.shift(); redo = []; }
  function caretPos(){ var ta = taAt(cur); return ta ? ta.selectionStart : 0; }
  function taAt(i){ var d = paper && paper.children.length ? paper.querySelector('.b[data-i="' + i + '"] textarea') : null; return d; }

  var saveSoon = Z.debounce(function(){ if (!sc) return; persist(sc); setStatusSaved(); Z.emit('page:change', sc); }, 450, 2500);
  var repaintSoon = Z.debounce(function(){ paintBreaks(); paintStatus(); runCoach(); if (sidePanel === 'doctor') renderDoctor(); if (sidePanel === 'scenes') renderScenes(); }, 220);
  function changed(){ saveSoon(); repaintSoon(); }

  function setStatusSaved(){
    var s = Z.$('#pgSaved'); if (!s) return;
    s.textContent = S.saving() ? 'saved on this device' : 'not saving — download a backup';
    s.className = 'pg-saved' + (S.saving() ? '' : ' warn');
  }

  function build(){
    if (root) return;
    root = Z.$('#pg');
    paper = Z.$('#pgPaper', root);
    sel = Z.$('#pgScript', root);
    titleIn = Z.$('#pgTitle', root);
    elBadge = Z.$('#pgEl', root);
    statusEl = Z.$('#pgStatus', root);
    sideEl = Z.$('#pgSide', root);
    coachEl = Z.$('#pgCoach', root);
    scrollEl = Z.$('#pgScroll', root);
    sugEl = Z.h('div.pg-sug', {hidden: true});
    root.appendChild(sugEl);

    /* element buttons */
    var els = Z.$('#pgEls', root);
    ORDER.forEach(function(t){
      els.appendChild(Z.h('button.pg-elb', {type: 'button', dataset: {t: t}, title: T[t].name + ' — Ctrl+' + T[t].key + ' (or Alt+' + T[t].key + ')', onmousedown: function(e){ e.preventDefault(); }, onclick: function(){ setType(cur, t, true); }},
        Z.h('span', null, T[t].short), Z.h('kbd', null, String(T[t].key))));
    });

    sel.addEventListener('change', function(){
      if (sel.value === '__new') { newScriptPrompt(); return; }
      openScript(sel.value);
    });
    titleIn.addEventListener('input', function(){
      if (!sc) return;
      sc.title = titleIn.value || 'Untitled';
      var m = Z.$('#pgMoreTitle', root); if (m && m !== document.activeElement) m.value = titleIn.value;
      saveSoon(); fillSelect();
    });

    root.addEventListener('click', function(e){
      var b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
      var a = b.dataset.act;
      if (a === 'close') close();
      else if (a === 'mode') setMode(root.classList.contains('full') ? 'dock' : 'full');
      else if (a === 'undo') doUndo();
      else if (a === 'redo') doRedo();
      else if (a === 'doctor') toggleSide('doctor');
      else if (a === 'scenes') toggleSide('scenes');
      else if (a === 'read') toggleSide('read');
      else if (a === 'more') toggleSide('more');
      else if (a === 'cover-names' || a === 'cover-dia' || a === 'cover-action') toggleCover(a.slice(6), b);
      else if (a === 'coach-close') endCoach();
    });

    paper.addEventListener('keydown', onKey);
    paper.addEventListener('input', onInput);
    paper.addEventListener('focusin', function(e){
      var d = e.target.closest('.b'); if (!d) return;
      cur = +d.dataset.i; paintBadge(); suggest();
    });
    paper.addEventListener('paste', onPaste);
    paper.addEventListener('click', function(e){
      var n = e.target.closest('.b-flag'); if (n) { var d = n.closest('.b'); editNote(+d.dataset.i); return; }
      if (e.target === paper) {
        var y = e.clientY, best = null, bestD = Infinity;
        Z.$$('.b', paper).forEach(function(el){
          var r = el.getBoundingClientRect(), d = y < r.top ? r.top - y : (y > r.bottom ? y - r.bottom : 0);
          if (d < bestD) { bestD = d; best = el; }
        });
        var ta = best && best.querySelector('textarea');
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      }
    });
    /* drag a .fountain / .txt / .fdx onto the page */
    root.addEventListener('dragover', function(e){ e.preventDefault(); root.classList.add('drop'); });
    root.addEventListener('dragleave', function(e){ if (e.target === root) root.classList.remove('drop'); });
    root.addEventListener('drop', function(e){
      e.preventDefault(); root.classList.remove('drop');
      var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function(){ importText(String(r.result), f.name); }; r.readAsText(f);
    });
    document.addEventListener('keydown', function(e){
      if (!openFlag) return;
      if (e.key !== 'Escape') return;
      if (!sugEl.hidden) { sugEl.hidden = true; return; }
      if (sidePanel) { toggleSide(sidePanel); return; }   /* panel first, then the page */
      /* Tab belongs to the state machine, so Escape is the way out of the
         page by keyboard — it saves on the way, like the ✕ does */
      close();
    });
    window.addEventListener('pagehide', flushSave);
    window.addEventListener('beforeunload', flushSave);
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') flushSave(); });
    setMode(S.get('pg-mode') || 'dock', true);
  }
  /* write anything the debounce is still holding, for this script, now */
  function flushSave(){ try { saveSoon.flush(); } catch (e) {} }

  /* ── render the whole script ── */
  function render(focusI, pos){
    paper.innerHTML = '';
    var frag = document.createDocumentFragment();
    sc.blocks.forEach(function(b, i){ frag.appendChild(blockEl(b, i)); });
    paper.appendChild(frag);
    if (!fieldSizing) sizeAll();
    paintBreaks(); paintStatus(); paintBadge();
    if (focusI != null) focusAt(focusI, pos);
  }
  function blockEl(b, i){
    var ta = Z.h('textarea', {rows: 1, spellcheck: 'true', 'aria-label': T[b.t].name});
    ta.value = b.x;
    var d = Z.h('div.b.b-' + b.t, {dataset: {i: i}}, ta);
    if (b.n) d.appendChild(Z.h('button.b-flag', {type: 'button', title: 'Note: ' + b.n, 'aria-label': 'Note on this line'}, '⚑'));
    return d;
  }
  function sizeAll(){
    var tas = Z.$$('textarea', paper);
    tas.forEach(function(t){ t.style.height = 'auto'; });
    var hs = tas.map(function(t){ return t.scrollHeight; });
    tas.forEach(function(t, i){ t.style.height = hs[i] + 'px'; });
  }
  function size(ta){ if (fieldSizing || !ta) return; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  function focusAt(i, pos){
    i = Z.clamp(i, 0, sc.blocks.length - 1);
    var ta = taAt(i); if (!ta) return;
    ta.focus({preventScroll: true});
    var p = pos == null ? ta.value.length : Z.clamp(pos, 0, ta.value.length);
    ta.setSelectionRange(p, p);
    cur = i; paintBadge();
    var r = ta.getBoundingClientRect(), sr = scrollEl.getBoundingClientRect();
    if (r.top < sr.top + 40 || r.bottom > sr.bottom - 60) ta.scrollIntoView({block: 'center'});
  }
  function paintBadge(){
    if (!sc || !elBadge) return;
    var t = sc.blocks[cur] ? sc.blocks[cur].t : 'action';
    elBadge.textContent = T[t].name;
    Z.$$('.pg-elb', root).forEach(function(b){ b.classList.toggle('on', b.dataset.t === t); });
    Z.$$('.b.cur', paper).forEach(function(d){ d.classList.remove('cur'); });
    var d = paper.querySelector('.b[data-i="' + cur + '"]'); if (d) d.classList.add('cur');
  }
  function paintBreaks(){
    Z.$$('.pbreak', paper).forEach(function(n){ n.remove(); });
    var p = paginate(sc.blocks), last = 1;
    p.pageOf.forEach(function(pg, i){
      if (pg > last) {
        var d = paper.querySelector('.b[data-i="' + i + '"]');
        if (d) paper.insertBefore(Z.h('div.pbreak', {'aria-hidden': 'true'}, Z.h('span', null, 'page ' + pg)), d);
        last = pg;
      }
    });
  }
  function paintStatus(){
    if (!sc || !statusEl) return;
    var s = stats(sc.blocks);
    var pages = s.exact, mins = Math.max(0, Math.round(pages * 10) / 10);
    Z.$('#pgStat', root).textContent = 'p. ' + ((sc.blocks.length && paginate(sc.blocks).pageOf[cur]) || 1) + ' of ' + s.pages +
      ' · ≈ ' + (pages < 0.95 ? pages.toFixed(1) : pages.toFixed(1)) + ' pages ≈ ' + mins + ' min · ' + Z.plural(s.scenes, 'scene') + ' · ' + s.words + ' words';
    var dc = Z.$('#pgDocN', root);
    if (dc && Z.doctor) { var iss = Z.doctor.run(sc.blocks).filter(function(x){ return x.sev !== 'info'; }); dc.textContent = iss.length ? String(iss.length) : ''; dc.hidden = !iss.length; }
  }

  /* ── type changes ── */
  function setType(i, t, userAction){
    if (!sc.blocks[i]) return;
    var b = sc.blocks[i];
    if (b.t === t) { focusAt(i, caretPos()); return; }
    pushUndo();
    var pos = caretPos(), from = b.t;
    b.t = t;
    if (UPPER[t]) b.x = b.x.toUpperCase();
    if (t === 'paren' && !/^\(/.test(b.x)) { b.x = '(' + b.x.replace(/^\(|\)$/g, '') + ')'; pos = b.x.length - 1; }
    if (from === 'paren' && t !== 'paren' && /^\(.*\)$/.test(b.x)) { b.x = b.x.slice(1, -1); pos = Math.max(0, pos - 1); }
    render(i, pos);
    changed();
    if (userAction) Z.emit('page:keys', {kind: 'type', t: t});
  }

  function insertAfter(i, blk, focusPos){
    pushUndo();
    sc.blocks.splice(i + 1, 0, blk);
    render(i + 1, focusPos == null ? blk.x.length : focusPos);
    changed();
  }

  /* ── keys ── */
  function onKey(e){
    var ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    var d = ta.closest('.b'); if (!d || !d.classList.contains('b')) return;
    var i = +d.dataset.i, b = sc.blocks[i];
    cur = i;
    var mod = e.ctrlKey || e.metaKey;
    if (e.isComposing) return;

    /* element shortcuts: Ctrl+1–6 as in Final Draft; Alt+1–6 always works */
    var dg = /^[1-6]$/.test(e.key) ? e.key : ((/^Digit([1-6])$/.exec(e.code || '') || [])[1]);
    if ((mod || e.altKey) && !e.shiftKey && dg) {
      e.preventDefault(); setType(i, ORDER[+dg - 1], true); return;
    }
    if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); doUndo(); return; }
    if (mod && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { e.preventDefault(); doRedo(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); persist(sc); setStatusSaved(); Z.toast(S.saving() ? 'Saved on this device.' : 'Saving is off — download a backup from the setup step.'); return; }
    if ((mod || e.altKey) && (e.key === 'j' || e.key === 'J')) { e.preventDefault(); editNote(i); return; }

    if (e.key === 'ArrowRight' && !sugEl.hidden && ta.selectionStart === ta.value.length) { e.preventDefault(); acceptSuggestion(); return; }

    if (e.key === 'Enter') {
      e.preventDefault(); sugEl.hidden = true;
      var s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      if (!v.trim()) {
        var to = ENTER_EMPTY[b.t];
        if (to) { setType(i, to); Z.emit('page:keys', {kind: 'enter', t: to}); }
        else hint('No blank lines — the page spaces itself.');
        return;
      }
      if (s === 0 && en === 0) { /* Enter at the very start opens a line above */
        pushUndo(); sc.blocks.splice(i, 0, {t: 'action', x: ''}); render(i + 1, 0); changed(); return;
      }
      var left = v.slice(0, s), right = v.slice(en);
      if (b.t === 'paren') { if (right.charAt(0) === ')') { right = right.slice(1); left = left + ')'; } if (!/\)$/.test(left)) left = left.replace(/\s+$/, '') + ')'; }
      pushUndo();
      b.x = UPPER[b.t] ? left.toUpperCase() : left.replace(/\s+$/, '');
      var nt = ENTER_NEXT[b.t];
      var nb = {t: nt, x: UPPER[nt] ? right.toUpperCase() : right.replace(/^\s+/, '')};
      sc.blocks.splice(i + 1, 0, nb);
      render(i + 1, 0);
      changed();
      Z.emit('page:keys', {kind: 'enter', t: nt});
      return;
    }

    if (e.key === 'Tab' && !mod && !e.altKey) {
      e.preventDefault(); sugEl.hidden = true;
      var val = ta.value, atEnd = ta.selectionStart === val.length;
      if (e.shiftKey) { if (!val.trim()) { var k = ORDER.indexOf(b.t); setType(i, ORDER[(k + ORDER.length - 1) % ORDER.length]); } return; }
      if (!val.trim()) { var tt = TAB_EMPTY[b.t]; setType(i, tt); Z.emit('page:keys', {kind: 'tab', t: tt}); return; }
      if (b.t === 'slug' && atEnd) {
        if (!/\s-\s/.test(val)) { pushUndo(); b.x = val.replace(/\s+$/, '') + ' - '; ta.value = b.x; ta.setSelectionRange(b.x.length, b.x.length); changed(); return; }
        insertAfter(i, {t: 'action', x: ''}, 0); return;
      }
      if (b.t === 'action' && atEnd) { insertAfter(i, {t: 'char', x: ''}, 0); Z.emit('page:keys', {kind: 'tab', t: 'char'}); return; }
      if (b.t === 'dia') {
        var p0 = ta.selectionStart, L = val.slice(0, p0).replace(/\s+$/, ''), R = val.slice(p0).replace(/^\s+/, '');
        pushUndo();
        b.x = L || val;
        var add = [{t: 'paren', x: '()'}];
        if (L && R) add.push({t: 'dia', x: R});
        Array.prototype.splice.apply(sc.blocks, [i + 1, 0].concat(add));
        render(i + 1, 1); changed(); Z.emit('page:keys', {kind: 'tab', t: 'paren'}); return;
      }
      if (b.t === 'char' && atEnd) { insertAfter(i, {t: 'paren', x: '()'}, 1); return; }
      if (b.t === 'paren' && atEnd) { insertAfter(i, {t: 'dia', x: ''}, 0); return; }
      if (b.t === 'trans' && atEnd) { insertAfter(i, {t: 'slug', x: ''}, 0); return; }
      return;
    }

    if (e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
      if (i === 0) return;
      e.preventDefault();
      var prev = sc.blocks[i - 1];
      pushUndo();
      if (!ta.value.length) { carryNote(sc.blocks[i], prev); sc.blocks.splice(i, 1); render(i - 1, prev.x.length); changed(); return; }
      var join = prev.x.length;
      prev.x = prev.x + (prev.x && !/\s$/.test(prev.x) && prev.t !== 'paren' ? ' ' : '') + ta.value;
      if (prev.x.length > join && prev.x.charAt(join) === ' ') join++;
      carryNote(sc.blocks[i], prev);
      sc.blocks.splice(i, 1);
      render(i - 1, join); changed(); return;
    }
    if (e.key === 'Delete' && ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length && i < sc.blocks.length - 1) {
      e.preventDefault();
      var nx = sc.blocks[i + 1]; pushUndo();
      var at = b.x.length;
      b.x = b.x + (b.x && nx.x ? ' ' : '') + nx.x;
      carryNote(nx, b);
      sc.blocks.splice(i + 1, 1); render(i, at); changed(); return;
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !mod && !e.altKey) {
      var info = caretLine(ta);
      if (e.key === 'ArrowUp' && info.line === 0 && i > 0) { e.preventDefault(); focusAt(i - 1); }
      else if (e.key === 'ArrowDown' && info.line >= info.lines - 1 && i < sc.blocks.length - 1) { e.preventDefault(); focusAt(i + 1, 0); }
    }
  }

  function hint(msg){
    var h = Z.$('#pgHint', root); if (!h) return;
    h.textContent = msg; h.hidden = false; clearTimeout(hint.t);
    hint.t = setTimeout(function(){ h.hidden = true; }, 2600);
  }

  /* visual line of the caret, measured on a mirror */
  function caretLine(ta){
    if (!mirror) { mirror = Z.h('div.pg-mirror', {'aria-hidden': 'true'}); document.body.appendChild(mirror); }
    var cs = getComputedStyle(ta);
    ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'borderLeftWidth', 'borderRightWidth', 'boxSizing', 'textTransform', 'wordSpacing'].forEach(function(p){ mirror.style[p] = cs[p]; });
    mirror.style.width = ta.offsetWidth + 'px';
    var pos = ta.selectionStart, v = ta.value;
    mirror.textContent = v.slice(0, pos);
    var mark = Z.h('span', null, '​'); mirror.appendChild(mark);
    var lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.3);
    var top = mark.offsetTop - (parseFloat(cs.paddingTop) || 0);
    var line = Math.max(0, Math.round(top / lh));
    mirror.textContent = v + '​';
    var lines = Math.max(1, Math.round((mirror.scrollHeight - (parseFloat(cs.paddingTop) || 0) * 2) / lh));
    return {line: line, lines: lines};
  }

  function onInput(e){
    var ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    var d = ta.closest('.b'); if (!d) return;
    var i = +d.dataset.i, b = sc.blocks[i]; if (!b) return;
    if (!typingOpen) { undo.push({blocks: JSON.parse(JSON.stringify(sc.blocks)), cur: i, pos: ta.selectionStart}); while (undo.length > undoCap()) undo.shift(); redo = []; typingOpen = true; }
    clearTimeout(typingT); typingT = setTimeout(function(){ typingOpen = false; }, 900);
    var v = ta.value;
    /* int. / ext. at the start of an action line converts it to a heading */
    if (b.t === 'action' && /^(int\.|ext\.|est\.|i\/e\.?|int\.\/ext\.|ext\.\/int\.)\s/i.test(v)) {
      b.t = 'slug'; d.className = 'b b-slug cur'; ta.setAttribute('aria-label', T.slug.name); paintBadge();
      Z.emit('page:keys', {kind: 'auto', t: 'slug'});
    }
    if (UPPER[b.t] && v !== v.toUpperCase()) {
      var s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = v = v.toUpperCase(); ta.setSelectionRange(s, en);
    }
    b.x = v;
    size(ta);
    suggest();
    changed();
  }

  function carryNote(from, to){
    if (from && from.n && to) to.n = (to.n ? to.n + ' · ' : '') + from.n;
  }
  function onPaste(e){
    var ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text || text.indexOf('\n') < 0) return;
    var parsed = Z.parseScript(text).blocks;
    if (!parsed.length) {
      /* nothing the screenplay parser recognised — keep the words rather than
         eating the paste: every non-empty line becomes an action line */
      parsed = text.split(/\r?\n/).map(function(l){ return l.trim(); })
                   .filter(Boolean).map(function(l){ return {t: 'action', x: l}; });
    }
    if (!parsed.length) return;
    e.preventDefault();
    var d = ta.closest('.b'), i = +d.dataset.i, b = sc.blocks[i];
    pushUndo();
    var s = ta.selectionStart, left = ta.value.slice(0, s), right = ta.value.slice(ta.selectionEnd);
    var add = parsed.slice();
    if (right.trim()) add.push({t: b.t, x: right});
    if (!left.trim()) { carryNote(b, add[0]); sc.blocks.splice.apply(sc.blocks, [i, 1].concat(add)); render(i + add.length - 1); }
    else { b.x = left; sc.blocks.splice.apply(sc.blocks, [i + 1, 0].concat(add)); render(i + add.length); }
    changed();
    Z.toast('Pasted as ' + Z.plural(parsed.length, 'screenplay line') + '.');
  }

  /* ── SmartType-style suggestion: → accepts ── */
  function suggest(){
    sugEl.hidden = true;
    var b = sc && sc.blocks[cur]; if (!b || (b.t !== 'char' && b.t !== 'slug')) return;
    var v = b.x.toUpperCase(); if (!v.trim()) return;
    var pool = {};
    sc.blocks.forEach(function(o, j){
      if (j === cur || o.t !== b.t || !o.x.trim()) return;
      var k = b.t === 'char' ? cueName(o.x) : o.x.trim().toUpperCase();
      pool[k] = (pool[k] || 0) + 1;
    });
    var best = Object.keys(pool).filter(function(k){ return k.indexOf(v) === 0 && k !== v; }).sort(function(a, c){ return pool[c] - pool[a]; })[0];
    if (!best) return;
    var ta = taAt(cur); if (!ta) return;
    sugEl.textContent = '→ ' + best;
    sugEl.dataset.v = best;
    var r = ta.getBoundingClientRect(), rr = root.getBoundingClientRect();
    sugEl.style.top = (r.bottom - rr.top + 2) + 'px';
    sugEl.style.left = (r.left - rr.left) + 'px';
    sugEl.hidden = false;
  }
  function acceptSuggestion(){
    var v = sugEl.dataset.v; if (!v) return;
    var ta = taAt(cur); pushUndo();
    sc.blocks[cur].x = v; ta.value = v; ta.setSelectionRange(v.length, v.length);
    sugEl.hidden = true; changed();
  }

  /* ── notes (the ScriptNote equivalent — never printed, never exported to PDF) ── */
  function editNote(i){
    var d = paper.querySelector('.b[data-i="' + i + '"]'); if (!d) return;
    var ex = Z.$('.b-noteedit', paper); if (ex) ex.remove();
    var inp = Z.h('input', {type: 'text', value: sc.blocks[i].n || '', placeholder: 'Note to self — placeholder, misgiving, "fix later"…', 'aria-label': 'Note'});
    var box = Z.h('div.b-noteedit', null, Z.h('span', null, '⚑'), inp,
      Z.h('button', {type: 'button', onclick: function(){ commit(); }}, 'Save'),
      Z.h('button', {type: 'button', onclick: function(){ inp.value = ''; commit(); }}, 'Remove'));
    function commit(){ pushUndo(); var v = inp.value.trim(); if (v) sc.blocks[i].n = v; else delete sc.blocks[i].n; box.remove(); render(i); changed(); }
    inp.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.stopPropagation(); box.remove(); focusAt(i); }
    });
    inp.addEventListener('blur', function(e){
      var to = e.relatedTarget;
      if (to && box.contains(to)) return;           /* Save / Remove was clicked */
      if (box.isConnected) commit();                /* typing elsewhere keeps it */
    });
    d.after(box); inp.focus();
  }

  /* ── undo / redo ── */
  function doUndo(){
    typingOpen = false;
    var s = undo.pop(); if (!s) { hint('Nothing to undo.'); return; }
    redo.push(snapshot()); sc.blocks = s.blocks; render(s.cur, s.pos); changed();
  }
  function doRedo(){
    var s = redo.pop(); if (!s) { hint('Nothing to redo.'); return; }
    undo.push(snapshot()); sc.blocks = s.blocks; render(s.cur, s.pos); changed();
  }

  /* ── covers: the cover-the-names test and friends ── */
  function toggleCover(k, btn){
    covers[k] = !covers[k];
    paper.classList.toggle('cover-' + k, covers[k]);
    if (btn) btn.setAttribute('aria-pressed', covers[k] ? 'true' : 'false');
  }

  /* ── modes ── */
  function setMode(m, quiet){
    if (!quiet) autoFull = false;
    root.classList.toggle('full', m === 'full');
    root.classList.toggle('dock', m !== 'full');
    document.body.classList.toggle('pg-docked', openFlag && m !== 'full');
    if (!quiet) S.set('pg-mode', m);
    var b = Z.$('[data-act="mode"]', root); if (b) b.textContent = m === 'full' ? '⇲ Dock' : '⛶ Full';
  }

  /* ── side panels: doctor, scenes, read aloud, more (export/import/scripts) ── */
  var sidePanel = null, autoFull = false;
  function toggleSide(which){
    /* a panel beside a docked page squeezes the paper — give it the whole screen instead */
    if (sidePanel !== which && !root.classList.contains('full') && window.innerWidth >= 1000) { autoFull = true; setMode('full', true); }
    if (sidePanel === which) {
      sidePanel = null; sideEl.hidden = true; root.classList.remove('has-side'); markSideBtns();
      if (autoFull) { autoFull = false; setMode('dock', true); }
      return;
    }
    sidePanel = which; sideEl.hidden = false; root.classList.add('has-side'); markSideBtns();
    if (which === 'doctor') renderDoctor();
    if (which === 'scenes') renderScenes();
    if (which === 'read') renderRead();
    if (which === 'more') renderMore();
    if (which === 'compare') {/* rendered by compare() */}
  }
  function refreshSide(){
    if (sidePanel === 'doctor') renderDoctor();
    else if (sidePanel === 'scenes') renderScenes();
    else if (sidePanel === 'read') renderRead();
    else if (sidePanel === 'more') renderMore();
    else if (sidePanel === 'compare') { sidePanel = null; sideEl.hidden = true; root.classList.remove('has-side'); markSideBtns(); }
  }
  function markSideBtns(){ Z.$$('[data-act="doctor"],[data-act="scenes"],[data-act="read"],[data-act="more"]', root).forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.act === sidePanel ? 'true' : 'false'); }); }
  function sideHead(title, sub){
    sideEl.innerHTML = '';
    sideEl.appendChild(Z.h('div.ps-head', null, Z.h('b', null, title), sub ? Z.h('span', null, sub) : null,
      Z.h('button.ps-x', {type: 'button', 'aria-label': 'Close panel', onclick: function(){ toggleSide(sidePanel); }}, '✕')));
  }

  function renderDoctor(){
    if (!Z.doctor) return;
    var filter = renderDoctor.filter || 'all';
    var all = Z.doctor.run(sc.blocks);
    var score = Z.doctor.score(all);
    sideHead('Format doctor', score.label);
    var f = Z.h('div.ps-filter');
    [['all', 'All'], ['action', 'Action'], ['dialogue', 'Dialogue'], ['format', 'Format']].forEach(function(p){
      f.appendChild(Z.h('button', {type: 'button', 'aria-pressed': filter === p[0] ? 'true' : 'false', onclick: function(){ renderDoctor.filter = p[0]; renderDoctor(); }}, p[1]));
    });
    sideEl.appendChild(f);
    var list = all.filter(function(x){ return filter === 'all' || x.cat === filter; });
    if (!list.length) {
      sideEl.appendChild(Z.h('p.ps-empty', null, all.length ? 'Nothing in this category.' : 'Clean. No rule in the doctor fires on these pages. (It cannot judge whether a scene turns — that is still your job, and the card\'s.)'));
      return;
    }
    var groups = {};
    list.forEach(function(x){ (groups[x.rule] = groups[x.rule] || []).push(x); });
    Object.keys(groups).sort(function(a, b){ return Z.doctor.rank(groups[a][0]) - Z.doctor.rank(groups[b][0]); }).forEach(function(r){
      var g = groups[r], first = g[0];
      var box = Z.h('div.ps-issue.sev-' + first.sev);
      box.appendChild(Z.h('div.pi-h', null, Z.h('span.pi-sev', null, first.sev === 'fix' ? 'fix' : first.sev === 'check' ? 'check' : 'note'), Z.h('b', null, first.title), Z.h('span.pi-n', null, '×' + g.length)));
      box.appendChild(Z.h('p.pi-why', {html: first.why}));
      var hits = Z.h('div.pi-hits');
      g.slice(0, 12).forEach(function(x){
        hits.appendChild(Z.h('button', {type: 'button', title: 'Go to this line', onclick: function(){ closeIfNarrow(); focusAt(x.i, x.pos || 0); flashBlock(x.i); }}, x.snip));
      });
      if (g.length > 12) hits.appendChild(Z.h('span.pi-more', null, '+ ' + (g.length - 12) + ' more'));
      box.appendChild(hits);
      sideEl.appendChild(box);
    });
  }
  function closeIfNarrow(){ if (window.innerWidth < 760 && sidePanel) toggleSide(sidePanel); }
  function flashBlock(i){ var d = paper.querySelector('.b[data-i="' + i + '"]'); if (!d) return; d.classList.add('hl'); setTimeout(function(){ d.classList.remove('hl'); }, 1500); }

  function renderScenes(){
    var p = paginate(sc.blocks);
    sideHead('Scenes', Z.plural(sc.blocks.filter(function(b){ return b.t === 'slug' && b.x.trim(); }).length, 'scene'));
    var ol = Z.h('ol.ps-scenes');
    sc.blocks.forEach(function(b, i){
      if (b.t !== 'slug') return;
      var next = sc.blocks[i + 1];
      ol.appendChild(Z.h('li', null, Z.h('button', {type: 'button', onclick: function(){ closeIfNarrow(); focusAt(i, 0); flashBlock(i); }},
        Z.h('b', null, b.x || '(empty heading)'), Z.h('span', null, 'p. ' + p.pageOf[i] + (next && next.t === 'action' ? ' · ' + next.x.slice(0, 60) : '')))));
    });
    if (!ol.children.length) sideEl.appendChild(Z.h('p.ps-empty', null, 'No scene headings yet. Ctrl+1 (or Alt+1) starts one.'));
    else sideEl.appendChild(ol);
  }

  /* ── read aloud (the Pass-5 read, with distinct voices) ── */
  var reading = false;
  function voices(){ return (window.speechSynthesis && speechSynthesis.getVoices() || []).filter(function(v){ return /^en/i.test(v.lang); }); }
  function renderRead(){
    sideHead('Read aloud', 'Pass 5 — hear what stumbles');
    if (!window.speechSynthesis) { sideEl.appendChild(Z.h('p.ps-empty', null, 'This browser has no speech engine. Read it aloud yourself — it is the same pass.')); return; }
    var vs = voices();
    if (!vs.length) { sideEl.appendChild(Z.h('p.ps-empty', null, 'Loading voices… (if nothing appears, your browser has no English voices installed).')); speechSynthesis.onvoiceschanged = function(){ if (sidePanel === 'read') renderRead(); }; return; }
    sc.voices = sc.voices || {};
    var names = Object.keys(stats(sc.blocks).names);
    var tbl = Z.h('div.ps-voices');
    function row(label, key){
      var s = Z.h('select', {'aria-label': 'Voice for ' + label});
      vs.forEach(function(v){ s.appendChild(Z.h('option', {value: v.voiceURI}, v.name.replace(/^Microsoft\s+|^Google\s+/, '').replace(/ - English.*| Online.*/, ''))); });
      s.value = sc.voices[key] || autoVoice(key, vs);
      s.addEventListener('change', function(){ sc.voices[key] = s.value; saveSoon(); });
      tbl.appendChild(Z.h('label', null, Z.h('span', null, label), s));
    }
    row('Narrator (headings + action)', '_narr');
    names.forEach(function(n){ row(n, n); });
    sideEl.appendChild(tbl);
    var opts = Z.h('div.ps-readopts', null,
      Z.h('label', null, Z.h('input', {type: 'checkbox', id: 'rdSlug', checked: true}), ' read headings'),
      Z.h('label', null, Z.h('input', {type: 'checkbox', id: 'rdAct', checked: true}), ' read action'));
    sideEl.appendChild(opts);
    sideEl.appendChild(Z.h('div.ps-btns', null,
      Z.h('button.btn.primary', {type: 'button', onclick: function(){ readFrom(cur); }}, '▶ Read from the cursor'),
      Z.h('button.btn', {type: 'button', onclick: function(){ readFrom(0); }}, '▶ From the top'),
      Z.h('button.btn', {type: 'button', onclick: stopRead}, '■ Stop'),
      Z.h('button.btn', {type: 'button', title: 'Mark the line being read — a stumble to fix after the read', onclick: flagReading}, '⚑ Flag this line')));
    sideEl.appendChild(Z.h('p.ps-tip', null, 'The rule from finish, rest, rewrite: don\'t fix during the read. Flag every line that stumbles (⚑ or Alt+J), then repair them all afterwards. Flags are notes — they never print.'));
  }
  function autoVoice(key, vs){
    if (key === '_narr') return vs[0].voiceURI;
    var names = Object.keys(stats(sc.blocks).names), k = names.indexOf(key);
    return vs[(k + 1) % vs.length].voiceURI;
  }
  var readIdx = -1, readRun = 0;
  function readFrom(i){
    stopRead();                 /* bumps readRun, so old callbacks fall away */
    reading = true; var myRun = readRun; readIdx = i - 1;
    var vs = voices(), byURI = {}; vs.forEach(function(v){ byURI[v.voiceURI] = v; });
    var speaker = null;
    function nextLine(){
      if (!reading || myRun !== readRun) return;
      var b = null;
      /* a loop, not recursion: a long run of skipped lines used to grow the
         call stack until it threw */
      for (;;) {
        readIdx++;
        if (readIdx >= sc.blocks.length) { reading = false; Z.toast('End of pages. Now fix every ⚑.'); return; }
        b = sc.blocks[readIdx];
        if (b.t === 'char') { speaker = cueName(b.x); continue; }
        if (b.t === 'paren' || b.t === 'trans' || !b.x.trim()) continue;
        if (b.t === 'slug' && !(Z.$('#rdSlug') || {}).checked) continue;
        if (b.t === 'action' && !(Z.$('#rdAct') || {}).checked) continue;
        break;
      }
      var text = b.x;
      if (b.t === 'slug') text = text.replace(/^INT\.\s*/i, 'Interior. ').replace(/^EXT\.\s*/i, 'Exterior. ').replace(/\s-\s/g, '. ');
      var key = b.t === 'dia' ? speaker : '_narr';
      var u = new SpeechSynthesisUtterance(text);
      var vv = byURI[(sc.voices || {})[key] || autoVoice(key || '_narr', vs)]; if (vv) u.voice = vv;
      u.rate = 1;
      u.onend = function(){ if (myRun !== readRun) return; unmark(); nextLine(); };
      u.onerror = function(){ if (myRun !== readRun) return; unmark(); if (reading) nextLine(); };
      mark(readIdx);
      speechSynthesis.speak(u);
    }
    function mark(j){ unmark(); var d = paper.querySelector('.b[data-i="' + j + '"]'); if (d) { d.classList.add('reading'); d.scrollIntoView({block: 'center', behavior: 'smooth'}); } }
    function unmark(){ Z.$$('.b.reading', paper).forEach(function(d){ d.classList.remove('reading'); }); }
    nextLine();
  }
  function stopRead(){ reading = false; readRun++; if (window.speechSynthesis) speechSynthesis.cancel(); Z.$$('.b.reading', paper || document).forEach(function(d){ d.classList.remove('reading'); }); }
  function flagReading(){
    if (readIdx < 0 || !sc.blocks[readIdx]) { editNote(cur); return; }
    sc.blocks[readIdx].n = (sc.blocks[readIdx].n ? sc.blocks[readIdx].n + ' · ' : '') + 'stumbled in the read-aloud';
    var d = paper.querySelector('.b[data-i="' + readIdx + '"]');
    if (d && !Z.$('.b-flag', d)) d.appendChild(Z.h('button.b-flag', {type: 'button', title: 'Note: stumbled in the read-aloud'}, '⚑'));
    changed();
  }

  /* ── more: scripts, title page, export, import ── */
  function renderMore(){
    sideHead('Script', sc.title);
    var tp = Z.h('div.ps-form');
    [['title', 'Title'], ['author', 'Written by'], ['contact', 'Contact (email / phone)']].forEach(function(f){
      var inp = Z.h('input', {type: 'text', id: f[0] === 'title' ? 'pgMoreTitle' : null, value: sc[f[0]] || '', placeholder: f[1]});
      inp.addEventListener('input', function(){ sc[f[0]] = inp.value; if (f[0] === 'title') { titleIn.value = inp.value; fillSelect(); } if (f[0] === 'author') S.set('author', inp.value); saveSoon(); });
      tp.appendChild(Z.h('label', null, Z.h('span', null, f[1]), inp));
    });
    sideEl.appendChild(Z.h('p.ps-tip', null, 'Title page: four items only — title, "Written by", name, contact. Nothing else (the rulebook).'));
    sideEl.appendChild(tp);
    sideEl.appendChild(Z.h('h4', null, 'Take it out'));
    sideEl.appendChild(Z.h('div.ps-btns', null,
      Z.h('button.btn', {type: 'button', onclick: function(){ Z.download(fileBase() + '.fdx', Z.toFDX(sc), 'application/xml'); }}, '⤓ .fdx — opens in Final Draft'),
      Z.h('button.btn', {type: 'button', onclick: function(){ Z.download(fileBase() + '.fountain', Z.toFountain(sc)); }}, '⤓ .fountain'),
      Z.h('button.btn', {type: 'button', onclick: function(){ Z.download(fileBase() + '.txt', Z.toText(sc)); }}, '⤓ plain text'),
      Z.h('button.btn', {type: 'button', onclick: printScript}, '⎙ Print / Save as PDF')));
    sideEl.appendChild(Z.h('p.ps-tip', null, 'The PDF from your browser is fine for practice and reader swaps. For a submission PDF, export from Final Draft or WriterDuet (the guide) — open the .fdx there first.'));
    sideEl.appendChild(Z.h('h4', null, 'Bring pages in'));
    sideEl.appendChild(Z.h('div.ps-btns', null,
      Z.h('button.btn', {type: 'button', onclick: function(){ Z.pickFile('.fountain,.txt,.fdx,.md,text/plain', function(t, f){ importText(t, f.name); }); }}, '⤒ Open a .fdx / .fountain / .txt'),
      Z.h('span.ps-tip', null, 'or drag the file onto the page. Paste works too.')));
    sideEl.appendChild(Z.h('p.ps-tip', null, 'Writing in Final Draft? Save As .fdx, open it here, and run the doctor on your real pages.'));
    sideEl.appendChild(Z.h('h4', null, 'This script'));
    sideEl.appendChild(Z.h('div.ps-btns', null,
      Z.h('button.btn', {type: 'button', onclick: newScriptPrompt}, '+ New script'),
      Z.h('button.btn', {type: 'button', onclick: function(){
        var copy = create(sc.title + ' (copy)', JSON.parse(JSON.stringify(sc.blocks)), {author: sc.author, contact: sc.contact});
        openScript(copy.id); Z.toast('Copied. You are now in the copy — the original is untouched.');
      }}, '⧉ Save a copy (before a pass)'),
      Z.h('button.btn.danger', {type: 'button', onclick: function(){ confirmInline(this, 'Delete "' + sc.title + '" for good?', function(){ var id = sc.id; remove(id); var ix = index(); if (ix.length) openScript(ix[ix.length - 1].id); else { var n = create('Untitled'); openScript(n.id); } Z.toast('Deleted.'); }); }}, 'Delete…')));
  }
  function fileBase(){
    var t = String(sc.title || 'Untitled');
    try { t = t.replace(/[^\p{L}\p{N}\- ]+/gu, ''); } catch (e) { t = t.replace(/[^\w\- ]+/g, ''); }
    t = t.trim().replace(/\s+/g, '_');
    return (t || 'Untitled') + '_' + Z.todayISO();
  }
  function confirmInline(btn, msg, yes){
    var box = Z.h('div.inline-confirm', null, Z.h('span', null, msg),
      Z.h('button.btn.danger', {type: 'button', onclick: function(){ box.remove(); yes(); }}, 'Yes'),
      Z.h('button.btn', {type: 'button', onclick: function(){ box.remove(); }}, 'No'));
    btn.after(box);
  }
  Z.confirmInline = confirmInline;

  function newScriptPrompt(){
    var box = Z.h('div.pg-newbox');
    var inp = Z.h('input', {type: 'text', placeholder: 'Title — e.g. BACKUP, or "Drill 3"', 'aria-label': 'New script title'});
    box.appendChild(Z.h('span', null, 'New script:'));
    box.appendChild(inp);
    box.appendChild(Z.h('button.btn.primary', {type: 'button', onclick: go}, 'Create'));
    box.appendChild(Z.h('button.btn', {type: 'button', onclick: function(){ box.remove(); fillSelect(); }}, 'Cancel'));
    function go(){ var s = create(inp.value.trim() || 'Untitled'); box.remove(); openScript(s.id); }
    inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); if (e.key === 'Escape') { box.remove(); fillSelect(); } });
    var bar = Z.$('.pg-bar', root); bar.after(box); inp.focus();
  }

  function importText(text, name){
    var parsed = /<FinalDraft/i.test(text) ? Z.parseFDX(text) : Z.parseScript(text);
    if (!parsed.blocks.length) { Z.toast('Nothing in that file looked like screenplay text.', {bad: true}); return; }
    var title = parsed.title || String(name || 'Imported').replace(/\.\w+$/, '');
    var s = create(title, parsed.blocks, {author: parsed.author || '', contact: parsed.contact || ''});
    openScript(s.id);
    Z.toast('Opened "' + title + '" — ' + Z.plural(parsed.blocks.length, 'line') + '. Run the doctor.', {ms: 5000});
  }
  Z.importScriptText = importText;

  function printScript(){
    var host = Z.$('#pgPrint'); host.innerHTML = '';
    if (sc.title) {
      host.appendChild(Z.h('div.pp-page.pp-title', null,
        Z.h('div.pp-t', null, (sc.title || '').toUpperCase()),
        Z.h('div.pp-by', null, 'Written by'),
        Z.h('div.pp-a', null, sc.author || ''),
        Z.h('div.pp-c', null, sc.contact || '')));
    }
    /* explicit pages from the same 55-line estimate the page shows on screen */
    var blocks = sc.blocks.filter(function(b){ return b.x.trim(); });
    var p = paginate(blocks), page = null, lastP = 0;
    blocks.forEach(function(b, i){
      var pg = p.pageOf[i];
      if (pg !== lastP) {
        page = Z.h('div.pp-page', null, Z.h('div.pp-num', null, pg > 1 ? pg + '.' : ''));
        host.appendChild(page); lastP = pg;
        page.dataset.first = '1';
      }
      var el = Z.h('div.pp-' + b.t, null, b.x);
      if (page.dataset.first !== '1' && SPACE_BEFORE[b.t]) el.classList.add('pp-sp');
      page.dataset.first = '0';
      page.appendChild(el);
    });
    document.body.classList.add('printing-script');
    setTimeout(function(){ window.print(); }, 60);
  }
  window.addEventListener('afterprint', function(){ document.body.classList.remove('printing-script'); });

  function fillSelect(){
    var ix = index().slice().sort(function(a, b){ return b.updated - a.updated; });
    sel.innerHTML = '';
    ix.forEach(function(r){ sel.appendChild(Z.h('option', {value: r.id}, r.title || 'Untitled')); });
    sel.appendChild(Z.h('option', {value: '__new'}, '+ New script…'));
    if (sc) sel.value = sc.id;
  }

  function openScript(id){
    build();
    flushSave();                 /* the queued write belongs to the old script */
    var s = load(id); if (!s) return;
    stopRead();
    sc = s; sc.blocks = sc.blocks && sc.blocks.length ? sc.blocks : [{t: 'slug', x: ''}];
    undo = []; redo = [];
    S.set('script-cur', sc.id);
    titleIn.value = sc.title || '';
    fillSelect();
    render(sc.blocks.length - 1);
    refreshSide();
    Z.emit('page:change', sc);
  }

  /* ══ public API ══ */
  var opener = null;
  function open(opts){
    opts = opts || {};
    /* remember what sent us here, so closing puts the keyboard back there */
    if (!openFlag) {
      var a = document.activeElement;
      opener = a && a !== document.body && !(root && root.contains(a)) ? a : null;
    }
    build();
    if (opts.scriptId) openScript(opts.scriptId);
    else if (!sc) {
      var id = S.get('script-cur'), s = id && load(id);
      if (!s) { var ix = index(); s = ix.length ? load(ix[ix.length - 1].id) : null; }
      if (!s) s = create(opts.title || 'My first page');
      openScript(s.id);
    }
    root.hidden = false; openFlag = true;
    if (!fieldSizing) sizeAll();   /* heights are only measurable once visible */
    if (opts.mode) setMode(opts.mode); else setMode(root.classList.contains('full') ? 'full' : 'dock', true);
    document.body.classList.toggle('pg-open', true);
    setStatusSaved();
    if (opts.coach) coach(opts.coach); else if (!coachDef) coachEl.hidden = true;
    if (opts.side) { sidePanel = null; toggleSide(opts.side); }
    setTimeout(function(){ focusAt(opts.focus != null ? opts.focus : cur, opts.pos); }, 30);
    Z.emit('page:open', sc);
  }
  function close(){
    if (!root) return;
    stopRead();
    endCoach();
    flushSave();
    if (sc) persist(sc);
    root.hidden = true; openFlag = false;
    document.body.classList.remove('pg-docked', 'pg-open');
    if (opener && document.body.contains(opener)) { try { opener.focus(); } catch (e) {} }
    opener = null;
    Z.emit('page:close', sc);
  }

  /* ── coach: a live checklist strip for guided exercises ── */
  var coachDef = null, coachTimer = null, coachDone = false;
  function coach(def){
    build();
    if (coachTimer) coachTimer.pause();   /* a new exercise stops the old clock */
    coachDef = def; coachDone = false;
    coachEl.innerHTML = ''; coachEl.hidden = false;
    var head = Z.h('div.pc-head', null, Z.h('b', null, def.title), def.sub ? Z.h('span', null, def.sub) : null);
    if (def.seconds != null) {
      var tEl = Z.h('span.pc-timer', null, '0:00');
      head.appendChild(tEl);
      coachTimer = Z.timer({el: tEl, seconds: def.seconds || 0, onEnd: function(){ Z.chime(); Z.toast('Time. Stop where you are — that\'s the drill.'); }});
      coachTimer.start();
    } else coachTimer = null;
    head.appendChild(Z.h('button.pc-x', {type: 'button', 'data-act': 'coach-close', 'aria-label': 'End this exercise'}, '✕'));
    coachEl.appendChild(head);
    if (def.items) {
      var ul = Z.h('ul.pc-items');
      def.items.forEach(function(it, k){ ul.appendChild(Z.h('li', {dataset: {k: k}}, Z.h('i', null, ''), Z.h('span', {html: it.label}))); });
      coachEl.appendChild(ul);
    }
    if (def.note) coachEl.appendChild(Z.h('p.pc-note', {html: def.note}));
    if (def.actions) {
      var acts = Z.h('div.pc-acts');
      def.actions.forEach(function(a){ acts.appendChild(Z.h('button.btn' + (a.primary ? '.primary' : ''), {type: 'button', onclick: function(){ a.fn(api, coachTimer); }}, a.label)); });
      coachEl.appendChild(acts);
    }
    runCoach();
  }
  function runCoach(){
    if (!coachDef || !sc || !coachDef.items) return;
    var all = true;
    coachDef.items.forEach(function(it, k){
      var ok = false; try { ok = !!it.test(sc.blocks, sc); } catch (e) {}
      var li = coachEl.querySelector('li[data-k="' + k + '"]'); if (li) li.classList.toggle('ok', ok);
      if (!ok && !it.optional) all = false;
    });
    if (all && !coachDone) { coachDone = true; if (coachDef.onComplete) coachDef.onComplete(api, coachTimer); }
  }
  function endCoach(){ coachDef = null; if (coachTimer) coachTimer.pause(); coachEl.hidden = true; coachEl.innerHTML = ''; }

  /* ── compare two scripts (the retype-from-memory drill) ── */
  function compare(model, opts){
    opts = opts || {};
    var res = Z.alignBlocks(model, sc.blocks.filter(function(b){ return b.x.trim(); }));
    sidePanel = 'compare'; sideEl.hidden = false; root.classList.add('has-side'); markSideBtns();
    sideHead(opts.title || 'Compare with the original', res.label);
    var tbl = Z.h('div.ps-compare');
    res.rows.forEach(function(r){
      var st = r.status;
      tbl.appendChild(Z.h('div.pc-row.st-' + st, null,
        Z.h('div.pc-o', null, r.o ? Z.h('span.pc-t', null, T[r.o.t].short) : Z.h('span.pc-t', null, '—'), r.o ? r.o.x : '(nothing here in the original)'),
        Z.h('div.pc-y', null, r.y ? Z.h('span.pc-t', null, T[r.y.t].short) : Z.h('span.pc-t', null, '—'), r.y ? r.y.x : '(you left this out)'),
        Z.h('div.pc-s', null, st === 'same' ? '✓' : st === 'close' ? '≈' : '✗')));
    });
    sideEl.appendChild(Z.h('div.ps-cmphead', null, Z.h('span', null, 'Original'), Z.h('span', null, 'Yours')));
    sideEl.appendChild(tbl);
    sideEl.appendChild(Z.h('p.ps-tip', null, 'Every ✗ is a question to look up in the page in six shapes or the rulebook — that is the drill. ≈ means the words differ but the shape is right.'));
    return res;
  }

  var api = Z.page = {
    open: open, close: close, isOpen: function(){ return openFlag; },
    create: create, load: load, list: index, remove: remove, persist: persist,
    current: function(){ return sc; },
    openScript: function(id, opts){ open(Object.assign({scriptId: id}, opts || {})); },
    append: function(blocks, opts){
      open(opts);
      pushUndo();
      var start = sc.blocks.length;
      if (sc.blocks.length === 1 && !sc.blocks[0].x.trim()) { sc.blocks = []; start = 0; }
      blocks.forEach(function(b){ sc.blocks.push(b); });
      render(sc.blocks.length - 1); changed();
      return start;
    },
    coach: coach, endCoach: endCoach, compare: compare, refresh: function(){ if (sc) { render(cur); } },
    setCover: function(k, on){ build(); if (covers[k] !== on) toggleCover(k, Z.$('[data-act="cover-' + k + '"]', root)); },
    side: function(which){ build(); if (sidePanel !== which) toggleSide(which); },
    blocks: function(){ return sc ? sc.blocks : []; },
    focus: function(i, p){ focusAt(i, p); }
  };
})();

/* ══ alignment for the retype drill ══ */
Z.alignBlocks = function(A, B){
  function norm(s){ return String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function sim(a, b){
    var x = norm(a).split(' '), y = norm(b).split(' ');
    if (!x[0] && !y[0]) return 1;
    var m = x.length, n = y.length, dp = [];
    for (var i = 0; i <= m; i++) { dp[i] = [i]; }
    for (var j = 1; j <= n; j++) dp[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (x[i-1] === y[j-1] ? 0 : 1));
    return 1 - dp[m][n] / Math.max(m, n, 1);
  }
  var m = A.length, n = B.length, S = [], P = [];
  for (var i = 0; i <= m; i++) { S[i] = []; P[i] = []; for (var j = 0; j <= n; j++) { S[i][j] = 0; P[i][j] = ''; } }
  for (i = 1; i <= m; i++) { S[i][0] = -0.6 * i; P[i][0] = 'u'; }
  for (j = 1; j <= n; j++) { S[0][j] = -0.6 * j; P[0][j] = 'l'; }
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
    var s = sim(A[i-1].x, B[j-1].x) + (A[i-1].t === B[j-1].t ? 0.5 : -0.3);
    var d = S[i-1][j-1] + s, u = S[i-1][j] - 0.6, l = S[i][j-1] - 0.6;
    if (d >= u && d >= l) { S[i][j] = d; P[i][j] = 'd'; } else if (u >= l) { S[i][j] = u; P[i][j] = 'u'; } else { S[i][j] = l; P[i][j] = 'l'; }
  }
  var rows = []; i = m; j = n;
  while (i > 0 || j > 0) {
    var p = P[i][j];
    if (p === 'd') { rows.unshift({o: A[i-1], y: B[j-1]}); i--; j--; }
    else if (p === 'u' || j === 0) { rows.unshift({o: A[i-1], y: null}); i--; }
    else { rows.unshift({o: null, y: B[j-1]}); j--; }
  }
  var shapes = 0, words = 0, cnt = 0;
  rows.forEach(function(r){
    if (r.o && r.y) {
      var ss = sim(r.o.x, r.y.x); words += ss; cnt++;
      if (r.o.t === r.y.t) shapes++;
      r.status = r.o.t === r.y.t && ss >= 0.999 ? 'same' : (r.o.t === r.y.t && ss >= 0.6 ? 'close' : 'diff');
    } else r.status = 'diff';
  });
  var shapeScore = shapes, wordPct = Math.round((cnt ? words / Math.max(A.length, cnt) : 0) * 100);
  return {rows: rows, shapes: shapeScore, of: A.length, wordPct: wordPct, label: 'Shapes ' + shapeScore + '/' + A.length + ' · words ' + wordPct + '%'};
};
