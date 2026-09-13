/* ══ 00 · core ════════════════════════════════════════════════════════
   Namespace, DOM helpers, dates, storage, backup. Everything the file
   remembers goes through Z.store, under the prefix "ztf-", in this browser
   only. Nothing is ever sent anywhere.                                  */
var Z = window.ZTF = window.ZTF || {};

Z.$  = function(s, r){ return (r || document).querySelector(s); };
Z.$$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* h('div.cls#id', {attr}, kids...) — tiny element builder */
Z.h = function(spec, attrs){
  var m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(spec) || [], tag = m[1] || 'div';
  var el = document.createElement(tag);
  (m[2] || '').replace(/([.#])([\w-]+)/g, function(_, t, v){
    if (t === '.') el.classList.add(v); else el.id = v;
  });
  if (attrs) Object.keys(attrs).forEach(function(k){
    var v = attrs[k];
    if (v == null || v === false) return;
    if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.keys(v).forEach(function(d){ el.dataset[d] = v[d]; });
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  });
  for (var i = 2; i < arguments.length; i++) Z.append(el, arguments[i]);
  return el;
};
Z.append = function(el, kid){
  if (kid == null || kid === false) return;
  if (Array.isArray(kid)) { kid.forEach(function(k){ Z.append(el, k); }); return; }
  el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
};
Z.esc = function(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
};
Z.debounce = function(fn, ms, maxMs){
  /* trailing debounce, with an optional ceiling so that continuous typing
     still gets written (maxMs), and a flush() for "save before you go". */
  var t = 0, first = 0, args = null, self = null;
  function run(){
    if (t) { clearTimeout(t); t = 0; }
    first = 0;
    if (!args) return;
    var a = args, s = self; args = null; self = null;
    fn.apply(s, a);
  }
  function d(){
    args = arguments; self = this;
    var now = Date.now();
    if (!first) first = now;
    if (t) clearTimeout(t);
    if (maxMs && now - first >= maxMs) { run(); return; }
    t = setTimeout(run, ms);
  }
  d.flush = run;
  d.pending = function(){ return !!args; };
  return d;
};
Z.uid = function(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
Z.clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
Z.words = function(s){ var m = String(s || '').trim().match(/[\w'’-]+/g); return m ? m.length : 0; };
Z.plural = function(n, one, many){ return n + ' ' + (n === 1 ? one : (many || one + 's')); };

/* ── dates: local calendar days as ISO strings; UTC ms for arithmetic ── */
Z.DAY = 86400000;
Z.todayISO = function(){
  var d = new Date(); function p(n){ return (n < 10 ? '0' : '') + n; }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
Z.isoToUTC = function(v){
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
Z.utcToISO = function(ms){
  var d = new Date(ms); function p(n){ return (n < 10 ? '0' : '') + n; }
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
};
Z.todayUTC = function(){ return Z.isoToUTC(Z.todayISO()); };
Z.addDays = function(iso, n){ return Z.utcToISO(Z.isoToUTC(iso) + n * Z.DAY); };
Z.daysBetween = function(a, b){ return Math.round((Z.isoToUTC(b) - Z.isoToUTC(a)) / Z.DAY); };
Z.DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
Z.DOWL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
Z.MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
Z.MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
Z.fmt = function(ms, opt){
  var d = new Date(ms), s = '';
  opt = opt || {};
  if (opt.dow) s += Z.DOW[d.getUTCDay()] + ' ';
  s += d.getUTCDate() + ' ' + (opt.long ? Z.MONL : Z.MON)[d.getUTCMonth()];
  if (opt.year) s += ' ' + d.getUTCFullYear();
  return s;
};
Z.fmtISO = function(iso, opt){ var ms = Z.isoToUTC(iso); return ms == null ? '' : Z.fmt(ms, opt); };
Z.ago = function(iso){
  var n = Z.daysBetween(iso, Z.todayISO());
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago';
};

/* ── storage ───────────────────────────────────────────────────────────
   Auto-save is ON by default in v11 (a workbook that forgets what you typed
   is not a workbook). One switch turns it off; one button empties it. When
   off, everything lives in memory until the tab closes.                  */
(function(){
  var P = 'ztf-', mem = {}, listeners = [], failed = false, warned = 0;
  function raw(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function rawSet(k, v){
    try { localStorage.setItem(k, v); failed = false; return true; }
    catch (e) { failed = true; return false; }
  }
  function rawDel(k){ try { localStorage.removeItem(k); } catch (e) {} }
  function saving(){ return raw(P + 'save') !== '0'; }
  function emit(k){ listeners.forEach(function(fn){ try { fn(k); } catch (e) {} }); }

  var S = Z.store = {
    available: (function(){ try { localStorage.setItem('ztf-probe', '1'); localStorage.removeItem('ztf-probe'); return true; } catch (e) { return false; } })(),
    saving: saving,
    failed: function(){ return failed; },
    get: function(k){
      if (k in mem) return mem[k];
      var v = raw(P + k);
      return v;
    },
    set: function(k, v){
      v = String(v);
      mem[k] = v;
      if (saving() || k === 'save') {
        if (!rawSet(P + k, v)) {
          var now = Date.now();
          if (now - warned > 30000) {
            warned = now;
            Z.toast && Z.toast('This browser refused to save — its storage may be full. Download a backup now.', {bad: true, ms: 9000});
          }
        }
      }
      emit(k);
    },
    del: function(k){ delete mem[k]; rawDel(P + k); emit(k); },
    getJSON: function(k, def){
      var v = S.get(k);
      if (v == null || v === '') return def;
      var o;
      try { o = JSON.parse(v); } catch (e) { return def; }
      /* a hand-edited or older file can hold "null", or an object where an
         array belongs. Callers dereference what comes back, so hand them
         the default rather than something that throws. */
      if (o == null) return def;
      if (Array.isArray(def) && !Array.isArray(o)) return def;
      if (def && typeof def === 'object' && !Array.isArray(def) && (typeof o !== 'object' || Array.isArray(o))) return def;
      return o;
    },
    setJSON: function(k, obj){ S.set(k, JSON.stringify(obj)); },
    onChange: function(fn){ listeners.push(fn); },
    /* every key this file owns, from storage and memory */
    keys: function(){
      var out = {};
      try {
        for (var i = 0; i < localStorage.length; i++){
          var k = localStorage.key(i);
          if (k && k.indexOf(P) === 0 && k !== 'ztf-probe') out[k.slice(P.length)] = 1;
        }
      } catch (e) {}
      Object.keys(mem).forEach(function(k){ out[k] = 1; });
      return Object.keys(out);
    },
    snapshot: function(){
      var data = {};
      S.keys().forEach(function(k){ var v = S.get(k); if (v != null) data[k] = v; });
      return data;
    },
    setSaving: function(on){
      if (on) {
        rawSet(P + 'save', '1');
        Object.keys(mem).forEach(function(k){ rawSet(P + k, mem[k]); });
      } else {
        /* keep everything in memory for this tab, then clear the disk copy.
           The flag goes down FIRST: if the browser refuses that write, the
           data must stay where it is rather than being erased for nothing. */
        S.keys().forEach(function(k){ var v = raw(P + k); if (v != null && !(k in mem)) mem[k] = v; });
        if (!rawSet(P + 'save', '0')) {
          Z.toast && Z.toast('This browser would not record that setting, so nothing was erased. Saving is still on.', {bad: true, ms: 9000});
          emit('save');
          return;
        }
        mem.save = '0';
        S.keys().forEach(function(k){ if (k !== 'save') rawDel(P + k); });
      }
      emit('save');
    },
    eraseAll: function(){
      var off = !saving();
      S.keys().forEach(function(k){ rawDel(P + k); });
      mem = {};
      /* erasing is about the work, not the setting: if saving was off it
         stays off, or the next thing typed would land on this disk. */
      if (off) { rawSet(P + 'save', '0'); mem.save = '0'; }
      emit('*');
    },
    restore: function(data){
      /* A restore is a replace: whatever is here now goes, or work from two
         different backups ends up interleaved and unreachable. The saving
         switch belongs to this browser, not to the backup file, so it is
         never taken from the data. */
      var on = saving();
      S.keys().forEach(function(k){ if (k !== 'save') rawDel(P + k); });
      mem = {}; if (!on) mem.save = '0';
      Object.keys(data).forEach(function(k){
        if (k === 'save' || typeof data[k] !== 'string') return;
        mem[k] = data[k];
        if (on) rawSet(P + k, data[k]);
      });
      emit('*');
      return on;
    }
  };

  /* legacy v10: 'remember' was opt-in. If someone had explicitly opted in,
     keep saving. If they never opted in, v11's default (on) applies — the
     setup step says so in plain words, and the switch is one click away. */
  if (raw(P + 'remember') != null && raw(P + 'save') == null) rawSet(P + 'save', '1');
})();

/* ── files: download text, read a chosen file ── */
Z.download = function(name, text, mime){
  var blob = new Blob([text], {type: (mime || 'text/plain') + ';charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = Z.h('a', {href: url, download: name});
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1500);
};
Z.pickFile = function(accept, cb){
  var inp = Z.h('input', {type: 'file', accept: accept || '', style: 'display:none'});
  inp.addEventListener('change', function(){
    var f = inp.files && inp.files[0]; inp.remove();
    if (!f) return;
    var r = new FileReader();
    r.onload = function(){ cb(String(r.result), f); };
    r.readAsText(f);
  });
  document.body.appendChild(inp); inp.click();
};
Z.copy = function(text, okMsg){
  function done(){ Z.toast(okMsg || 'Copied.'); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fallback);
  } else fallback();
  function fallback(){
    var ta = Z.h('textarea', {style: 'position:fixed;left:-9999px;top:0'}); ta.value = text;
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { Z.toast('Copy failed — select and copy by hand.', {bad: true}); }
    ta.remove();
  }
};

/* ── toast: one quiet line at the bottom, never a modal ── */
Z.toast = function(msg, opt){
  opt = opt || {};
  var host = Z.$('#toasts');
  if (!host) { host = Z.h('div#toasts', {'aria-live': 'polite'}); document.body.appendChild(host); }
  var t = Z.h('div.toast' + (opt.bad ? '.bad' : '') + (opt.ok ? '.ok' : ''), null, msg);
  if (opt.action) t.appendChild(Z.h('button', {type: 'button', onclick: function(){ opt.action.fn(); t.remove(); }}, opt.action.label));
  host.appendChild(t);
  setTimeout(function(){ t.classList.add('out'); setTimeout(function(){ t.remove(); }, 400); }, opt.ms || 3200);
};

/* ── tiny event bus between modules ── */
(function(){
  var subs = {};
  /* on(ev, fn, el): when el is given, the subscription dies with the element.
     Tools re-render themselves, so without this every repaint left another
     dead listener on the bus for the life of the session. */
  Z.on = function(ev, fn, el){ (subs[ev] = subs[ev] || []).push(el ? {fn: fn, el: el} : fn); };
  Z.emit = function(ev, data){
    var list = subs[ev]; if (!list || !list.length) return;
    var live = [];
    list.forEach(function(s){
      var fn = s.fn || s;
      if (s.el && !document.body.contains(s.el)) return;   /* dropped */
      live.push(s);
      try { fn(data); } catch (e) { console.error(e); }
    });
    subs[ev] = live;
  };
})();

/* ── a reusable countdown/stopwatch ── */
Z.timer = function(opts){
  /* opts: {el, seconds (countdown) | 0 (stopwatch), onEnd, onTick} */
  var t0 = 0, acc = 0, run = false, iv = null, total = opts.seconds || 0, ended = false;
  function elapsed(){ return acc + (run ? (Date.now() - t0) / 1000 : 0); }
  function paint(){
    var e = elapsed(), v = total ? Math.max(0, total - e) : e;
    var m = Math.floor(v / 60), s = Math.floor(v % 60);
    if (opts.el) opts.el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    if (opts.onTick) opts.onTick(e, v);
    /* a countdown ends once per run: pressing the button again after it rang
       used to chime, toast and log the same sitting a second time */
    if (total && e >= total && run && !ended) { ended = true; api.pause(); if (opts.onEnd) opts.onEnd(); }
  }
  var api = {
    start: function(){
      if (run) return;
      if (total && elapsed() >= total) { acc = 0; ended = false; }   /* it rang: start it over */
      run = true; t0 = Date.now(); iv = setInterval(paint, 250); paint();
    },
    pause: function(){ if (!run) return; acc += (Date.now() - t0) / 1000; run = false; clearInterval(iv); paint(); },
    reset: function(sec){ run = false; ended = false; clearInterval(iv); acc = 0; if (sec != null) total = sec; paint(); },
    running: function(){ return run; },
    elapsed: elapsed,
    set: function(sec){ total = sec; paint(); }
  };
  paint();
  return api;
};

/* ── a soft chime (Web Audio), used when a timer ends ── */
Z.chime = function(){
  try {
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    var c = new C(), now = c.currentTime;
    [660, 880].forEach(function(f, i){
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, now + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.18, now + i * 0.22 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.9);
      o.connect(g); g.connect(c.destination); o.start(now + i * 0.22); o.stop(now + i * 0.22 + 1);
    });
    setTimeout(function(){ c.close(); }, 2000);
  } catch (e) {}
};

/* ── scroll to an element id, opening any folds around it ── */
Z.go = function(id, opts){
  var t = document.getElementById(String(id).replace(/^#/, ''));
  if (!t) return;
  Z.emit('reveal', t);
  var n = t; while (n) { if (n.tagName === 'DETAILS') n.open = true; n = n.parentElement; }
  t.scrollIntoView({behavior: (opts && opts.instant) ? 'auto' : 'smooth', block: 'start'});
  if (opts && opts.flash) { t.classList.add('flash'); setTimeout(function(){ t.classList.remove('flash'); }, 1600); }
};
