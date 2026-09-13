/* ══ 50 · the workbook ══════════════════════════════════════════════════
   Every "✎ Your turn" is a real field now. The ladder (is it a story yet) works on
   ONE idea at a time — the one on the ladder — and each idea keeps its own
   test, logline, people, shape and cards when you swap.                   */
(function(){
  var S = Z.store, h = Z.h;
  Z.tools = Z.tools || {};

  /* ── generic helpers ── */
  function field(label, key, opts){
    opts = opts || {};
    var id = 'f-' + key.replace(/[^\w-]/g, '_') + '-' + Math.random().toString(36).slice(2, 6);
    var inp = opts.area ? h('textarea', {id: id, rows: opts.rows || 2, placeholder: opts.ph || ''}) : h('input', {id: id, type: 'text', placeholder: opts.ph || ''});
    if (opts.ladder) inp.dataset.lf = key; else inp.dataset.f = key;
    var lab = h('label.wf' + (opts.cls ? '.' + opts.cls : ''), {'for': id}, h('span.wf-l', {html: label}));
    lab.appendChild(inp);
    if (opts.hint) lab.appendChild(h('span.wf-h', {html: opts.hint}));
    return lab;
  }
  Z.field = field;
  function bindFields(root){
    Z.$$('[data-f]', root).forEach(function(inp){
      if (inp.dataset.bound) return; inp.dataset.bound = '1';
      var k = 'f:' + inp.dataset.f, v = S.get(k);
      if (inp.type === 'checkbox') inp.checked = v === '1'; else if (v != null) inp.value = v;
      var save = Z.saveSoon(function(){ S.set(k, inp.type === 'checkbox' ? (inp.checked ? '1' : '0') : inp.value); Z.emit('field', inp.dataset.f); }, 300, 2500);
      inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', save);
    });
  }
  Z.bindFields = bindFields;

  /* ══ ideas + the ladder ══ */
  var L = Z.ladder = {
    ideas: function(){ return S.getJSON('ideas', []); },
    save: function(list){ S.setJSON('ideas', list); Z.emit('ideas'); },
    activeId: function(){ var id = S.get('active'); return L.ideas().some(function(i){ return i.id === id; }) ? id : null; },
    active: function(){ var id = L.activeId(); return L.ideas().filter(function(i){ return i.id === id; })[0] || null; },
    data: function(id){ id = id || L.activeId(); return id ? S.getJSON('ladder:' + id, {}) : {}; },
    setData: function(d, id){ id = id || L.activeId(); if (!id) return; S.setJSON('ladder:' + id, d); Z.emit('ladderdata', id); },
    get: function(path){ var d = L.data(), p = path.split('.'); for (var i = 0; i < p.length; i++) { if (d == null) return undefined; d = d[p[i]]; } return d; },
    set: function(path, v){
      var id = L.ensure(), d = L.data(id), p = path.split('.'), o = d;
      for (var i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
      o[p[p.length - 1]] = v; L.setData(d, id);
    },
    add: function(idea){
      idea.id = idea.id || Z.uid(); idea.d = idea.d || Z.todayISO();
      var list = L.ideas(); list.unshift(idea); L.save(list);
      return idea;
    },
    activate: function(id){ S.set('active', id); Z.emit('ladder', id); },
    /* typing into the ladder with nothing on it quietly creates one */
    ensure: function(){
      var id = L.activeId(); if (id) return id;
      var idea = L.add({t: 'My first idea', s: '', w: '', n: ''});
      S.set('active', idea.id);
      Z.toast('Started an idea called "My first idea" for you — rename it in Catch an idea.');
      /* the tools repaint on the next tick: the value that triggered this is
         still on its way to storage, and repainting now would wipe it */
      setTimeout(function(){ Z.emit('ladder', idea.id); }, 0);
      return idea.id;
    }
  };

  /* v11.2: truby and engine used to write into the file-wide namespace, so a
     second idea overwrote the first. Their fields are per-idea now; anything
     typed under the old keys is lifted onto the idea on the ladder, once. */
  function liftToLadder(keys){
    var id = L.activeId(); if (!id) return;
    var d = L.data(id), moved = false;
    keys.forEach(function(k){
      var old = S.get('f:' + k);
      if (old == null || old === '') return;
      var p = k.split('.'), o = d;
      for (var i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
      if (o[p[p.length - 1]] == null || o[p[p.length - 1]] === '') { o[p[p.length - 1]] = old; moved = true; }
      S.del('f:' + k);
    });
    if (moved) L.setData(d, id);
  }

  Z.liftToLadder = liftToLadder;
  function bindLadder(root){
    Z.$$('[data-lf]', root).forEach(function(inp){
      var v = L.get(inp.dataset.lf);
      if (inp.type === 'checkbox') inp.checked = !!v; else inp.value = v == null ? '' : v;
      if (inp.dataset.lbound) return; inp.dataset.lbound = '1';
      var save = Z.saveSoon(function(){ L.set(inp.dataset.lf, inp.type === 'checkbox' ? inp.checked : inp.value); Z.emit('ladderfield', inp.dataset.lf); }, 250, 2500);
      inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', save);
    });
  }
  Z.bindLadder = bindLadder;

  function badge(){
    var a = L.active();
    var el = h('div.lad-badge');
    if (a) {
      el.appendChild(h('span', null, 'Working on: '));
      el.appendChild(h('b', null, '“' + a.t + '”'));
      el.appendChild(h('a.xref', {href: '#catch'}, 'switch or rename it'));
    } else {
      el.appendChild(h('span', null, 'No idea picked yet. '));
      el.appendChild(h('a.xref', {href: '#catch'}, 'Catch one'));
      el.appendChild(h('span', null, ' — or just start typing below.'));
    }
    return el;
  }
  Z.ladderBadge = badge;
  function refreshLadderTools(){
    var busy = document.activeElement;
    Z.$$('.tool[data-tool]').forEach(function(el){
      if (!/^(test|logline|people|shape|cards|arch|beats15|truby|engine)$/.test(el.dataset.tool)) return;
      if (busy && busy !== document.body && el.contains(busy)) return;  /* being typed in */
      Z.renderTool(el);
    });
  }
  Z.on('ladder', refreshLadderTools);

  /* ── catch an idea · the Vault ── */
  var SPARKERS = [
    'A moment from your work outsiders wouldn\'t believe.',
    'A decision you almost made differently.',
    'Two people who should never share a room — stuck in one.',
    'A rule that exists for a reason nobody remembers.',
    'Something you\'ve always wanted to ask someone but never did.',
    'A system that works perfectly — and is quietly hurting one person.',
    'The bug you were told never to fix.',
    'A password only one person knew, and that person is gone.',
    'Someone very good at their job for the wrong reason.',
    'A promotion that requires one small betrayal.',
    'An apology that arrives ten years late — to the wrong person.',
    'A job interview where the interviewer is the one being tested.',
    'Two people who each believe they are the victim.',
    'The last shift before something closes forever.',
    'A lie that has kept a family together.',
    'An automated message someone refuses to accept.',
    'A stranger who knows the one thing you never told anyone.',
    'A favour asked at the worst possible moment.'
  ];
  Z.tools.vault = function(el){
    el.innerHTML = '';
    var t = h('input', {type: 'text', placeholder: 'Two-word title — e.g. BACKUP', 'aria-label': 'Idea title', maxlength: 60});
    var s1 = h('textarea', {rows: 2, placeholder: 'Situation — what is happening?', 'aria-label': 'Situation'});
    var s2 = h('textarea', {rows: 2, placeholder: 'Who wants what? (a person + a want)', 'aria-label': 'Who wants what'});
    var s3 = h('textarea', {rows: 2, placeholder: 'Why isn\'t it easy?', 'aria-label': 'Why not easy'});
    var editing = null;
    var editBar = h('p.wb-editing', {hidden: true});
    var form = h('div.wb-card.vault-form', null,
      h('div.wb-k', null, '✎ Catch an idea · three sentences · five minutes, max'),
      editBar,
      h('label.wf', null, h('span.wf-l', null, 'Title'), t),
      h('label.wf', null, h('span.wf-l', null, '1 · Situation'), s1),
      h('label.wf', null, h('span.wf-l', null, '2 · Who + want'), s2),
      h('label.wf', null, h('span.wf-l', null, '3 · Why not easy'), s3),
      h('div.wb-row', null,
        h('button.btn.primary', {type: 'button', onclick: catchIt}, '⤓ Put it in the Vault'),
        h('button.btn', {type: 'button', onclick: spark}, '✦ Spark me'),
        h('button.btn', {type: 'button', onclick: badIdeas}, '⏱ 10 bad ideas in 10 minutes')),
      h('p.wb-spark', {hidden: true}));
    el.appendChild(form);
    var bad = h('div.wb-card.badbox', {hidden: true});
    el.appendChild(bad);
    var list = h('div.vault-list');
    el.appendChild(list);

    function setEditing(i){
      editing = i.id;
      t.value = i.t; s1.value = i.s || ''; s2.value = i.w || ''; s3.value = i.n || '';
      editBar.hidden = false; editBar.innerHTML = '';
      editBar.appendChild(h('span', null, 'Editing “' + (i.t || 'Untitled') + '” — saving replaces it. '));
      editBar.appendChild(h('button.linkish', {type: 'button', onclick: function(){ clearForm(); }}, 'Cancel and catch a new one'));
      t.focus(); form.scrollIntoView({block: 'center', behavior: 'smooth'});
    }
    function clearForm(){
      editing = null; editBar.hidden = true; editBar.innerHTML = '';
      t.value = s1.value = s2.value = s3.value = '';
    }
    function spark(){ var p = Z.$('.wb-spark', form); p.hidden = false; p.textContent = '✦ ' + SPARKERS[Math.floor(Math.random() * SPARKERS.length)]; }
    function catchIt(){
      var title = t.value.trim(), a = s1.value.trim(), b = s2.value.trim(), c = s3.value.trim();
      if (!title && !a) { Z.toast('Give it at least a title and a situation.', {bad: true}); t.focus(); return; }
      var found = editing && L.ideas().some(function(i){ return i.id === editing; });
      if (found) {
        var ls = L.ideas(); ls.forEach(function(i){ if (i.id === editing) { i.t = title || i.t; i.s = a; i.w = b; i.n = c; } }); L.save(ls);
        Z.toast('Updated.');
      } else {
        if (editing) Z.toast('The idea you were editing is gone — filed this as a new one.');
        var idea = L.add({t: title || a.split(/\s+/).slice(0, 2).join(' '), s: a, w: b, n: c});
        if (!L.activeId()) { L.activate(idea.id); Z.toast('Caught — and it\'s the one you are working on, since nothing else was.', {ok: true}); }
        else Z.toast('Caught. It keeps. Back to work.', {ok: true});
      }
      clearForm();
      paint();
    }
    function badIdeas(){
      bad.hidden = false; bad.innerHTML = '';
      var tEl = h('span.big-timer', null, '10:00');
      var ta = h('textarea', {rows: 11, placeholder: 'One bad idea per line. Fast. Don\'t judge — the 11th is usually the good one.', 'aria-label': 'Bad ideas'});
      var tm = Z.timer({el: tEl, seconds: 600, onEnd: function(){ Z.chime(); Z.toast('Ten minutes. Now pick the least bad.'); }});
      var pick = h('div.badpick');
      bad.appendChild(h('div.wb-k', null, '⏱ Ten bad ideas in ten minutes — then pick the least bad'));
      bad.appendChild(h('div.wb-row', null, tEl,
        h('button.btn', {type: 'button', onclick: function(){ tm.running() ? tm.pause() : tm.start(); }}, 'Start / pause'),
        h('button.btn', {type: 'button', onclick: function(){ list2(); }}, 'Pick the least bad'),
        h('button.btn', {type: 'button', onclick: function(){ tm.pause(); bad.hidden = true; }}, 'Close')));
      bad.appendChild(ta);
      bad.appendChild(pick);
      tm.start(); ta.focus();
      function list2(){
        pick.innerHTML = '';
        var lines = ta.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        if (!lines.length) { pick.textContent = 'Nothing yet — write some bad ones first.'; return; }
        pick.appendChild(h('p', null, 'Click the least bad one to load it into the catch form:'));
        lines.forEach(function(l, k){ pick.appendChild(h('button.chipbtn', {type: 'button', onclick: function(){ s1.value = l; t.focus(); tm.pause(); Z.toast('Loaded. Give it a title and the other two sentences.'); }}, (k + 1) + '. ' + l)); });
      }
    }
    function paint(){
      list.innerHTML = '';
      var ideas = L.ideas(), act = L.activeId();
      list.appendChild(h('div.wb-k', null, 'Your Vault · ' + Z.plural(ideas.length, 'idea') + (act ? '' : ' · none of them picked yet')));
      if (!ideas.length) { list.appendChild(h('p.wb-empty', null, 'Empty. The first one is the hardest; it only has to be three sentences.')); return; }
      ideas.forEach(function(i){
        var on = i.id === act;
        var card = h('div.idea' + (on ? '.on' : ''),
          null,
          h('div.idea-h', null, h('b', null, i.t || 'Untitled'), h('span', null, Z.fmtISO(i.d)), on ? h('span.tagon', null, 'ON THE LADDER') : null),
          i.s ? h('p', null, i.s) : null, i.w ? h('p', null, i.w) : null, i.n ? h('p', null, i.n) : null,
          h('div.idea-a', null,
            on ? h('a.btn.small', {href: '#test'}, 'Next → is it a story yet?') : h('button.btn.small', {type: 'button', onclick: function(){ if (act) Z.confirmInline(this, 'Switch to "' + i.t + '"? The current idea keeps all its work.', function(){ L.activate(i.id); paint(); Z.toast('"' + i.t + '" is the one you are working on.'); }); else { L.activate(i.id); paint(); } }}, 'Work on this one'),
            h('button.btn.small', {type: 'button', onclick: function(){ setEditing(i); }}, 'Edit'),
            h('button.btn.small.danger', {type: 'button', onclick: function(){ Z.confirmInline(this, 'Delete "' + i.t + '" and everything filled in for it?', function(){ L.save(L.ideas().filter(function(x){ return x.id !== i.id; })); S.del('ladder:' + i.id); if (on) { S.del('active'); Z.emit('ladder', null); } paint(); }); }}, 'Delete')));
        list.appendChild(card);
      });
    }
    paint();
    Z.on('ideas', function(){ paint(); }, list);
  };

  /* quick capture (desk + stall wizard): the Vault rule, anywhere */
  Z.quickVault = function(anchor){
    var box = h('div.qv');
    var t = h('input', {type: 'text', placeholder: 'Title'}), s = h('textarea', {rows: 3, placeholder: 'Situation. Who wants what. Why not easy. — three sentences, then straight back to work.'});
    box.appendChild(h('div.wb-k', null, 'Vault it · ≤5 min'));
    box.appendChild(t); box.appendChild(s);
    box.appendChild(h('div.wb-row', null,
      h('button.btn.primary', {type: 'button', onclick: function(){ if (!t.value.trim() && !s.value.trim()) return; L.add({t: t.value.trim() || 'Untitled', s: s.value.trim(), w: '', n: ''}); box.remove(); Z.toast('Caught. It keeps. Back to the card.', {ok: true}); }}, 'Catch it'),
      h('button.btn', {type: 'button', onclick: function(){ box.remove(); }}, 'Cancel')));
    anchor.after(box); t.focus();
  };

  /* ── is it a story yet · TEST ── */
  var REPAIR = {
    wants: ['Mood, not a story', 'Give the protagonist a specific, timed, <em>visible</em> goal.'],
    resists: ['Nothing\'s stopping them', 'Add a clock, a price, a secret, or someone who wants the opposite.'],
    changes: ['Could go on forever', 'Write the ending now — what is <em>permanently</em> different? Name it.']
  };
  Z.tools.test = function(el){
    el.innerHTML = '';
    el.appendChild(badge());
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ Your turn · three boxes · all three, or back to the Vault'));
    [['wants', 'WANTS', 'A specific, timed, visible goal — e.g. "restore the system by 9 a.m."'],
     ['resists', 'RESISTS', 'What blocks it — a clock, a price, a secret, an opponent'],
     ['changes', 'CHANGES', 'What is permanently different at the end?']].forEach(function(r){
      var row = h('div.test-row');
      row.appendChild(field(r[1], 'test.' + r[0], {ladder: true, ph: r[2]}));
      var cb = h('input', {type: 'checkbox', 'aria-label': r[1] + ' passes'}); cb.dataset.lf = 'test.' + r[0] + 'Ok';
      row.appendChild(h('label.test-ok', null, cb, h('span', null, 'passes')));
      box.appendChild(row);
    });
    var verdict = h('div.verdict');
    box.appendChild(verdict);
    box.appendChild(h('div.wb-row', null, h('button.btn', {type: 'button', onclick: function(){
      var id = L.activeId(); if (!id) return;
      S.del('active'); Z.emit('ladder', null); Z.toast('Back in the Vault. Caught ideas keep.');
    }}, 'Send it back to the Vault')));
    el.appendChild(box);
    bindLadder(box);
    function paint(){
      var d = L.data().test || {}, miss = ['wants', 'resists', 'changes'].filter(function(k){ return !d[k + 'Ok']; });
      verdict.innerHTML = '';
      if (!miss.length) verdict.appendChild(h('p.ok', {html: '✓ 3/3 — it\'s a story. Climb: <a class="xref" href="#logline">the logline · LOGLINE</a>.'}));
      else miss.forEach(function(k){ verdict.appendChild(h('p.miss', {html: '<b>' + k.toUpperCase() + ' missing</b> · ' + REPAIR[k][0] + ' → ' + REPAIR[k][1]}));});
    }
    paint();
    box.addEventListener('change', function(){ setTimeout(paint, 300); });
  };

  /* ── the logline · LOGLINE builder ── */
  var VAGUE = /\b(about|story of|journey|struggles? with|deals? with|comes to terms|learns? (to|that)|finds? (himself|herself|themselves|meaning|love)|life|world)\b/i;
  var ABSTRACT_GOAL = /\b(be happy|find (himself|herself|themselves|peace|meaning)|learn to|accept|heal|understand|move on|grow|become (a )?better|figure out (who|what))\b/i;
  Z.tools.logline = function(el){
    el.innerHTML = '';
    el.appendChild(badge());
    var box = h('div.wb-card.logline');
    box.appendChild(h('div.wb-k', null, '✎ Your turn · fill the formula'));
    var parts = [['dis', 'When', 'the servers die the night before launch'], ['pro', ', a', 'grieving engineer'], ['goal', 'must', 'restore from her dead mentor\'s laptop by morning'], ['lost', 'or', 'the company folds'], ['obs', '— but', 'the restore erases the last work he ever wrote']];
    var grid = h('div.lg-grid');
    parts.forEach(function(p){
      var inp = h('input', {type: 'text', placeholder: p[2], 'aria-label': p[1] + ' …'}); inp.dataset.lf = 'log.' + p[0];
      grid.appendChild(h('label.lg-part', null, h('span', null, p[1]), inp));
    });
    box.appendChild(grid);
    var prev = h('p.lg-preview'); box.appendChild(prev);
    var lint = h('ul.lint'); box.appendChild(lint);
    var sib = h('input', {type: 'checkbox'}); sib.dataset.lf = 'log.sibling';
    var aloud = h('input', {type: 'checkbox'}); aloud.dataset.lf = 'log.aloud';
    box.appendChild(h('div.wb-checks', null,
      h('label', null, sib, h('span', null, 'Goal and obstacle are siblings — the obstacle grows out of the same place as the goal (the irony test).')),
      h('label', null, aloud, h('span', null, 'I said it aloud, without looking. (the logline is done when this is true.)'))));
    var tEl = h('span.big-timer', null, '0:20');
    var tm = Z.timer({el: tEl, seconds: 20, onEnd: function(){ Z.chime(); Z.toast('If it didn\'t fit in twenty seconds, it has two ideas in it. Pick one.'); }});
    box.appendChild(h('div.wb-row', null,
      h('button.btn', {type: 'button', onclick: function(){ tm.reset(20); tm.start(); prev.classList.add('reading'); setTimeout(function(){ prev.classList.remove('reading'); }, 20000); }}, '🗣 Say it aloud — 20 s'), tEl,
      h('button.btn', {type: 'button', onclick: saveVersion}, '⤓ Save this version'),
      h('button.btn', {type: 'button', onclick: fiveBad}, '⏱ 5 bad ones in 10 min')));
    var vers = h('div.lg-versions'); box.appendChild(vers);
    el.appendChild(box);
    bindLadder(box);

    function sentence(){
      var d = L.data().log || {};
      function v(k, ph){ return (d[k] || '').trim() || '[' + ph + ']'; }
      return 'When ' + v('dis', 'disruption') + ', a ' + v('pro', 'flawed protagonist') + ' must ' + v('goal', 'concrete goal') + ' or ' + v('lost', 'what\'s lost') + ' — but ' + v('obs', 'ironic obstacle') + '.';
    }
    function paint(){
      var d = L.data().log || {}, s = sentence();
      prev.textContent = s;
      lint.innerHTML = '';
      var own = [d.dis, d.pro, d.goal, d.lost, d.obs].join(' ');
      var filled = ['dis', 'pro', 'goal', 'lost', 'obs'].filter(function(k){ return (d[k] || '').trim(); }).length;
      function row(ok, txt){ lint.appendChild(h('li.' + (ok ? 'ok' : 'warn'), {html: (ok ? '✓ ' : '⚠ ') + txt})); }
      if (!filled) { lint.appendChild(h('li.info', null, 'Fill the five blanks. The checks below run as you type.')); return; }
      var commas = (own.match(/,/g) || []).length, wc = Z.words(s);
      row(commas <= 2 && wc <= 45, commas > 2 ? 'Too long — ' + commas + ' commas of your own. More than two = two ideas; pick one.' : (wc > 45 ? 'Long — ' + wc + ' words. Hard to say in one breath.' : 'Length fine — ' + wc + ' words.'));
      row(!VAGUE.test(own), VAGUE.test(own) ? 'Too vague — "' + own.match(VAGUE)[0] + '". A camera can\'t film "about".' : 'Nothing vague that a camera couldn\'t film.');
      var pro = (d.pro || '').trim();
      row(Z.words(pro) >= 2, Z.words(pro) >= 2 ? 'The protagonist carries a flaw or a condition ("' + pro + '").' : 'No flaw — "a <b>grieving</b> engineer" beats "an engineer".');
      row(!ABSTRACT_GOAL.test(d.goal || ''), ABSTRACT_GOAL.test(d.goal || '') ? 'The goal is internal — make it concrete and filmable (restore, finish, steal, win, get to).' : 'The goal looks concrete. Could a camera see them achieve it?');
      row(!!d.sibling, d.sibling ? 'You say goal and obstacle are siblings.' : 'Irony: are goal and obstacle siblings? Tick the box once they are.');
    }
    function saveVersion(){
      var id = L.ensure(), d = L.data(id), log = d.log || {}; log.versions = log.versions || [];
      log.versions.unshift({s: sentence(), d: Z.todayISO()}); d.log = log; L.setData(d, id); paintVers(); Z.toast('Version saved.');
    }
    function paintVers(){
      vers.innerHTML = '';
      var vs = ((L.data().log || {}).versions) || [];
      if (!vs.length) return;
      vers.appendChild(h('div.wb-k', null, 'Versions · ★ = the least bad'));
      vs.forEach(function(v, k){
        vers.appendChild(h('div.lg-v' + (v.star ? '.star' : ''), null,
          h('button.starbtn', {type: 'button', 'aria-label': 'Mark as least bad', onclick: function(){ var d = L.data(); d.log.versions.forEach(function(x, j){ x.star = j === k; }); L.setData(d); paintVers(); }}, v.star ? '★' : '☆'),
          h('span', null, v.s),
          h('button.x', {type: 'button', 'aria-label': 'Delete version', onclick: function(){ var d = L.data(); d.log.versions.splice(k, 1); L.setData(d); paintVers(); }}, '✕')));
      });
    }
    function fiveBad(){
      var tEl2 = h('span.big-timer', null, '10:00');
      var t2 = Z.timer({el: tEl2, seconds: 600, onEnd: function(){ Z.chime(); Z.toast('Ten minutes. Star the least bad.'); }});
      var note = h('div.wb-card.badbox', null, h('div.wb-k', null, 'Five bad loglines in ten minutes'), h('p', null, 'Fill the formula, press "Save this version", clear the blanks, go again. Five times. Then star the least bad. Speed is the point.'), h('div.wb-row', null, tEl2, h('button.btn', {type: 'button', onclick: function(){ t2.pause(); note.remove(); }}, 'Close')));
      box.after(note); t2.start();
    }
    paint(); paintVers();
    box.addEventListener('input', Z.debounce(paint, 300));
    box.addEventListener('change', function(){ setTimeout(paint, 300); });
  };

  /* ── the people · PEOPLE ── */
  Z.tools.people = function(el){
    el.innerHTML = '';
    el.appendChild(badge());
    var box = h('div.wb-card.people');
    box.appendChild(h('div.wb-k', null, '✎ Your turn · two cards'));
    var hero = h('div.pcard', null, h('div.pcard-k', null, 'Hero'),
      field('Name', 'people.hn', {ladder: true, ph: 'Nadia'}),
      field('WANTS <em>(visible)</em>', 'people.hw', {ladder: true, ph: 'to save the launch'}),
      field('NEEDS <em>(hidden)</em>', 'people.hne', {ladder: true, ph: 'to let her mentor go'}),
      field('FLAW <em>(the habit that costs them)</em>', 'people.hf', {ladder: true, ph: 'preserves things instead of finishing them'}),
      field('Ghost <em>(the past event behind the flaw)</em>', 'people.hg', {ladder: true, ph: 'mentor died mid-project'}));
    var opp = h('div.pcard.opp', null, h('div.pcard-k', null, 'Opposition'),
      field('Name', 'people.on', {ladder: true, ph: 'the COO + the clock'}),
      field('WANTS', 'people.ow', {ladder: true, ph: 'to ship on time'}),
      field('Their plan works without the hero because…', 'people.op', {ladder: true, ph: 'the launch can go ahead from the old build'}),
      field('What they believe that tempts the hero', 'people.ob', {ladder: true, ph: 'shipping is how you honour the dead'}));
    box.appendChild(h('div.pcards', null, hero, opp));
    var right = h('input', {type: 'checkbox'}); right.dataset.lf = 'people.right';
    box.appendChild(h('div.wb-checks', null, h('label', null, right, h('span', null, 'The opposition is right from their own seat — not evil for fun.'))));
    el.appendChild(box);
    bindLadder(box);
  };
  Z.tools.arch = function(el){
    el.innerHTML = '';
    var rows = [['eg', 'External goal', 'what they want — the visible plot objective'], ['in', 'Internal need', 'invisible until the finale'], ['gw', 'Ghost / wound', 'the past event that created the flaw'], ['fl', 'Flaw', 'the behavioural pattern the story will challenge'], ['lie', 'Lie they believe', 'the worldview the story disproves'], ['tr', 'Truth they learn', 'the theme internalised by the finale'], ['co', 'Contradiction', 'what makes them paradoxical and human']];
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ Feature scale · both sides, before outlining'));
    var g = h('div.arch-grid', null, h('span'), h('b', null, 'Protagonist'), h('b', null, 'Antagonist'));
    rows.forEach(function(r){
      g.appendChild(h('span.arch-l', {title: r[2]}, r[1]));
      var a = h('textarea', {rows: 2, placeholder: r[2], 'aria-label': 'Protagonist ' + r[1]}); a.dataset.lf = 'arch.p' + r[0];
      var b = h('textarea', {rows: 2, placeholder: r[2], 'aria-label': 'Antagonist ' + r[1]}); b.dataset.lf = 'arch.a' + r[0];
      g.appendChild(a); g.appendChild(b);
    });
    box.appendChild(g);
    el.appendChild(box); bindLadder(box);
  };

  /* ── the shape · SHAPE ── */
  Z.tools.shape = function(el){
    el.innerHTML = '';
    el.appendChild(badge());
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ Your turn · five beats · can\'t find it? fill 5 first, then walk backward'));
    [['b1', '1 · Normal + disruption', 'Alarms at 2 a.m., red dashboards'], ['b2', '2 · Easy ways fail', 'every other backup — all corrupt'], ['b3', '3 · Only the hard way remains', 'the only clean copy is on HIS laptop'], ['b4', '4 · Maximum price', 'RESTORE? ALL LOCAL FILES WILL BE ERASED. Y/N'], ['b5', '5 · The choice + what\'s permanently different', 'She presses Y']].forEach(function(r){
      box.appendChild(field(r[1], 'shape.' + r[0], {ladder: true, ph: r[2]}));
    });
    el.appendChild(box); bindLadder(box);
  };

  /* ── scene cards · CARDS ── */
  Z.tools.cards = function(el){
    el.innerHTML = '';
    el.appendChild(badge());
    var box = h('div.wb-card.cardform');
    box.appendChild(h('div.wb-k', null, '✎ Fill the card · "Enter at" last'));
    var ie = h('select', {'aria-label': 'Interior or exterior'}, h('option', null, 'INT.'), h('option', null, 'EXT.'), h('option', null, 'INT./EXT.'));
    var loc = h('input', {type: 'text', placeholder: 'SERVER ROOM', 'aria-label': 'Location'});
    var tod = h('select', {'aria-label': 'Time of day'}, ['DAY', 'NIGHT', 'MORNING', 'EVENING', 'LATER', 'CONTINUOUS'].map(function(x){ return h('option', null, x); }));
    var who = h('input', {type: 'text', placeholder: 'Nadia wants to press Y'});
    var blk = h('input', {type: 'text', placeholder: 'his unfinished folder on screen'});
    var diff = h('input', {type: 'text', placeholder: 'company saved (+), goodbye made real (−)'});
    var cs = h('select', {'aria-label': 'Value at the start'}, h('option', {value: '+'}, '+'), h('option', {value: '−'}, '−'));
    var ce = h('select', {'aria-label': 'Value at the end'}, h('option', {value: '−'}, '−'), h('option', {value: '+'}, '+'));
    var val = h('input', {type: 'text', placeholder: 'trust / hope / control…', 'aria-label': 'Value at stake', style: 'max-width:12em'});
    var ent = h('input', {type: 'text', placeholder: 'her finger already over the key', disabled: true});
    var editing = null;
    box.appendChild(h('div.card-grid', null,
      h('span.cg-l', null, 'WHERE / WHEN'), h('div.cg-slug', null, ie, loc, h('span', null, '-'), tod),
      h('span.cg-l', null, 'WHO wants WHAT, right now'), who,
      h('span.cg-l', null, 'WHAT blocks it'), blk,
      h('span.cg-l', null, 'WHAT is different at the end'), diff,
      h('span.cg-l', null, 'Value at stake · charge'), h('div.cg-val', null, val, h('span', null, 'start'), cs, h('span', null, '→ end'), ce),
      h('span.cg-l', null, 'Enter at (latest possible moment)'), ent));
    var gate = h('p.wf-h', null, '"Enter at" unlocks when the four lines above are filled — filling it last forces the latest possible entry.');
    box.appendChild(gate);
    box.appendChild(h('div.wb-row', null,
      h('button.btn.primary', {type: 'button', onclick: add}, '⤓ Save card'),
      h('button.btn', {type: 'button', onclick: clear}, 'Clear')));
    el.appendChild(box);
    var list = h('div.cardlist'); el.appendChild(list);

    function unlock(){
      var ok = loc.value.trim() && who.value.trim() && blk.value.trim() && diff.value.trim();
      ent.disabled = !ok; gate.hidden = !!ok;
    }
    [loc, who, blk, diff].forEach(function(x){ x.addEventListener('input', unlock); });
    function clear(){ loc.value = who.value = blk.value = diff.value = ent.value = val.value = ''; ie.value = 'INT.'; tod.value = tod.options[0].value; cs.value = '+'; ce.value = '−'; editing = null; unlock(); }
    function add(){
      if (!who.value.trim() && !loc.value.trim()) { Z.toast('A card needs at least a place and a want.', {bad: true}); return; }
      var d = L.data(L.ensure()); d.cards = d.cards || [];
      var c = {id: editing || Z.uid(), ie: ie.value, loc: loc.value.trim().toUpperCase(), tod: tod.value, who: who.value.trim(), blk: blk.value.trim(), diff: diff.value.trim(), val: val.value.trim(), cs: cs.value, ce: ce.value, ent: ent.value.trim()};
      var known = editing && d.cards.some(function(x){ return x.id === editing; });
      if (known) d.cards = d.cards.map(function(x){ return x.id === editing ? c : x; });
      else { c.id = Z.uid(); d.cards.push(c); if (editing) Z.toast('That card had been deleted — saved this as a new one.'); }
      L.setData(d); clear(); paint();
      Z.toast(c.ent ? 'Card saved.' : 'Saved — but "Enter at" is empty. Fill it last; it\'s the one that tightens the scene.', {ms: 4500});
    }
    function slug(c){ return c.ie + ' ' + (c.loc || 'PLACE') + ' - ' + c.tod; }
    function paint(){
      list.innerHTML = '';
      var cards = (L.data().cards) || [];
      if (!cards.length) { list.appendChild(h('p.wb-empty', null, 'No cards yet. One card per scene, before you write it.')); return; }
      var strip = h('div.charge-strip', {title: 'Value charge, start → end, scene by scene. + + + + + is flat however much happens.'});
      cards.forEach(function(c, k){ strip.appendChild(h('span.ch', null, (k + 1) + ' ' + (c.cs || '?') + '→' + (c.ce || '?'))); });
      list.appendChild(h('div.wb-k', null, 'Cards · ' + cards.length + ' · the charges should alternate'));
      list.appendChild(strip);
      cards.forEach(function(c, k){
        var same = c.cs && c.ce && c.cs === c.ce;
        list.appendChild(h('div.scard' + (same ? '.flat' : ''), null,
          h('div.sc-h', null, h('b', null, (k + 1) + ' · ' + slug(c)), same ? h('span.flatnote', null, 'same charge at both ends — not a scene yet') : null),
          h('p', null, h('span', null, 'Wants: '), c.who || '—'),
          h('p', null, h('span', null, 'Blocked by: '), c.blk || '—'),
          h('p', null, h('span', null, 'End: '), (c.diff || '—') + (c.val ? ' · ' + c.val + ' ' + c.cs + '→' + c.ce : '')),
          h('p', null, h('span', null, 'Enter at: '), c.ent || h('em', null, 'not set — fill it last')),
          h('div.idea-a', null,
            h('button.btn.small.primary', {type: 'button', onclick: function(){ writeIt(c); }}, '✎ Write this scene →'),
            h('button.btn.small', {type: 'button', onclick: function(){ editing = c.id; ie.value = c.ie; loc.value = c.loc; tod.value = c.tod; who.value = c.who; blk.value = c.blk; diff.value = c.diff; val.value = c.val || ''; cs.value = c.cs || '+'; ce.value = c.ce || '−'; ent.value = c.ent; unlock(); box.scrollIntoView({block: 'center', behavior: 'smooth'}); }}, 'Edit'),
            h('button.btn.small', {type: 'button', 'aria-label': 'Move up', disabled: k === 0, onclick: function(){ move(k, -1); }}, '↑'),
            h('button.btn.small', {type: 'button', 'aria-label': 'Move down', disabled: k === cards.length - 1, onclick: function(){ move(k, 1); }}, '↓'),
            h('button.btn.small.danger', {type: 'button', onclick: function(){ Z.confirmInline(this, 'Delete this card?', function(){ var d = L.data(); d.cards.splice(k, 1); L.setData(d); paint(); }); }}, '✕'))));
      });
    }
    function move(k, dir){ var d = L.data(), c = d.cards.splice(k, 1)[0]; d.cards.splice(k + dir, 0, c); L.setData(d); paint(); }
    function writeIt(c){
      var d = L.data(L.ensure()), idea = L.active();
      var sid = d.scriptId && Z.page.load(d.scriptId) ? d.scriptId : null;
      if (!sid) { var s = Z.page.create((idea && idea.t) || 'Untitled'); d.scriptId = s.id; L.setData(d); sid = s.id; }
      var note = 'CARD — wants: ' + (c.who || '?') + ' · blocked by: ' + (c.blk || '?') + ' · end: ' + (c.diff || '?') + ' · ENTER AT: ' + (c.ent || '?');
      Z.page.append([{t: 'slug', x: slug(c), n: note}, {t: 'action', x: ''}], {scriptId: sid});
      Z.toast('Heading typed from the card; the card rides along as a note (⚑). First line: motion already happening.', {ms: 5500});
    }
    paint(); unlock();
  };

  /* ── how to read a script · the script-analysis template ── */
  Z.tools.reads = function(el){
    el.innerHTML = '';
    var F = [['script', 'SCRIPT', 'input', 'Get Out'], ['kind', 'Feature or pilot', 'kind'], ['genre', 'GENRE', 'input', 'social thriller'],
      ['log', 'LOGLINE — write it yourself, don\'t look it up', 'area'], ['st', 'THREE THINGS I\'D STEAL', 'area', '1.\n2.\n3.'], ['bad', 'THREE THINGS THAT DIDN\'T WORK (and why)', 'area', '1.\n2.\n3.'],
      ['bestp', 'BEST SCENE — page #', 'input', 'p. 34'], ['best', '…why it works', 'area'], ['flaw', 'THE PROTAGONIST\'S FLAW', 'input'], ['img', 'HOW THE FINAL IMAGE REVERSES THE OPENING IMAGE', 'area'], ['ws', 'WHAT THIS WRITER DOES WITH WHITE SPACE THAT I WANT TO ADOPT', 'area']];
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ The script-analysis template · one per script'));
    var inputs = {};
    F.forEach(function(f){
      var inp;
      if (f[2] === 'kind') inp = h('select', null, h('option', {value: 'feature'}, 'Feature'), h('option', {value: 'pilot'}, 'Pilot'), h('option', {value: 'short'}, 'Short'));
      else if (f[2] === 'area') inp = h('textarea', {rows: f[3] && f[3].indexOf('\n') > -1 ? 3 : 2, placeholder: f[3] || ''});
      else inp = h('input', {type: 'text', placeholder: f[3] || ''});
      inputs[f[0]] = inp;
      box.appendChild(h('label.wf', null, h('span.wf-l', null, f[1]), inp));
    });
    var editing = null;
    box.appendChild(h('div.wb-row', null, h('button.btn.primary', {type: 'button', onclick: function(){
      var r = {id: editing || Z.uid(), d: Z.todayISO()}; Object.keys(inputs).forEach(function(k){ r[k] = inputs[k].value.trim(); });
      if (!r.script) { Z.toast('Name the script.', {bad: true}); return; }
      var all = S.getJSON('reads', []);
      var known = editing && all.some(function(x){ return x.id === editing; });
      if (known) all = all.map(function(x){ return x.id === editing ? r : x; });
      else { r.id = Z.uid(); all.unshift(r); if (editing) Z.toast('That read had been deleted — filed this as a new one.'); }
      S.setJSON('reads', all); editing = null;
      Object.keys(inputs).forEach(function(k){ if (k !== 'kind') inputs[k].value = ''; });
      paint(); Z.toast('Filed. Reading produced scripts is the cheapest craft there is.', {ok: true}); Z.emit('reads');
    }}, '⤓ File this read')));
    el.appendChild(box);
    var list = h('div.readlist'); el.appendChild(list);
    function paint(){
      list.innerHTML = '';
      var all = S.getJSON('reads', []);
      var f = all.filter(function(r){ return r.kind === 'feature'; }).length, p = all.filter(function(r){ return r.kind === 'pilot'; }).length;
      list.appendChild(h('div.wb-k', null, 'Filed reads · features ' + f + '/15 · pilots ' + p + '/5'));
      list.appendChild(h('div.meter', null, h('i', {style: 'width:' + Math.min(100, (f + p) / 20 * 100) + '%'})));
      all.forEach(function(r){
        list.appendChild(h('details.readcard', null, h('summary', null, h('b', null, r.script), ' · ' + r.kind + ' · ' + Z.fmtISO(r.d) + (r.log ? ' — ' + r.log.slice(0, 90) : '')),
          h('div', {html: F.filter(function(x){ return r[x[0]] && x[0] !== 'script' && x[0] !== 'kind'; }).map(function(x){ return '<p><b>' + Z.esc(x[1]) + ':</b> ' + Z.esc(r[x[0]]).replace(/\n/g, '<br>') + '</p>'; }).join('')}),
          h('div.idea-a', null,
            h('button.btn.small', {type: 'button', onclick: function(){ editing = r.id; Object.keys(inputs).forEach(function(k){ inputs[k].value = r[k] || ''; }); box.scrollIntoView({block: 'center', behavior: 'smooth'}); }}, 'Edit'),
            h('button.btn.small.danger', {type: 'button', onclick: function(){ Z.confirmInline(this, 'Delete this read?', function(){ S.setJSON('reads', S.getJSON('reads', []).filter(function(x){ return x.id !== r.id; })); paint(); }); }}, 'Delete'))));
      });
    }
    paint();
  };

  /* ── McKee's five-step scene analysis (how to read a script) ── */
  Z.tools.mckee = function(el){
    el.innerHTML = '';
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ Scene analysis in five steps (McKee, Story) · one produced scene'));
    box.appendChild(field('Scene', 'mk.scene', {ph: 'Script, page, scene heading'}));
    box.appendChild(field('1 · Define conflict — who drives the scene, and what do they want? (an infinitive: "to get…") What opposes it, and what does <em>that</em> want?', 'mk.c', {area: true, rows: 3}));
    box.appendChild(field('2 · Opening value and its charge', 'mk.o', {ph: 'Trust — positive: she believes him'}));
    box.appendChild(field('3 · The beats — one per line, as action / reaction gerunds', 'mk.b', {area: true, rows: 5, ph: 'Pleading / ignoring the plea\nThreatening to leave / laughing at the threat'}));
    box.appendChild(field('4 · Closing value — same charge as the opening? Then nothing happened.', 'mk.e', {ph: 'Trust — negative'}));
    box.appendChild(field('5 · The turning point — the beat where expectation and result split', 'mk.t', {area: true}));
    box.appendChild(h('p.wf-h', null, 'Two beats in a row with the same verb pair means one of them is doing nothing. That is the note you are learning to hear.'));
    el.appendChild(box); bindFields(box);
  };

  /* ── finish, rest, rewrite · triage ledger ── */
  Z.tools.ledger = function(el){
    el.innerHTML = '';
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ Triage ledger · every note gets a verdict'));
    var reader = h('input', {type: 'text', placeholder: 'Reader (initials)', style: 'max-width:9em'});
    var page = h('input', {type: 'text', placeholder: 'Page(s)', style: 'max-width:6em'});
    var note = h('input', {type: 'text', placeholder: 'The note, in their words'});
    box.appendChild(h('div.wb-row.ledger-add', null, reader, page, note, h('button.btn.primary', {type: 'button', onclick: add}, '+ Add note')));
    var table = h('div.ledger'); box.appendChild(table);
    var sum = h('div.ledger-sum'); box.appendChild(sum);
    box.appendChild(h('div.wb-row', null, h('button.btn', {type: 'button', onclick: function(){ Z.copy(Z.SEVEN_Q, 'The seven questions are on your clipboard. Paste them into your message.'); }}, '⧉ Copy the seven questions for a reader')));
    el.appendChild(box);
    function all(){ return S.getJSON('ledger', []); }
    function save(v){ S.setJSON('ledger', v); }
    function add(){ if (!note.value.trim()) return; var v = all(); v.push({id: Z.uid(), r: reader.value.trim().toUpperCase(), p: page.value.trim(), n: note.value.trim(), v: '', why: '', done: false, d: Z.todayISO()}); save(v); note.value = ''; note.focus(); paint(); }
    function paint(){
      table.innerHTML = '';
      var v = all();
      if (!v.length) { table.appendChild(h('p.wb-empty', null, 'No notes yet. Read them once, put them away for 24 hours, then log them here — one row per note.')); sum.innerHTML = ''; return; }
      var pages = {};
      v.forEach(function(x){ String(x.p).split(/[,;\s]+/).filter(Boolean).forEach(function(p){ pages[p] = pages[p] || {}; pages[p][x.r || '?'] = 1; }); });
      v.forEach(function(x, k){
        var hot = String(x.p).split(/[,;\s]+/).some(function(p){ return pages[p] && Object.keys(pages[p]).length > 1; });
        var sel = h('select', {'aria-label': 'Verdict'}, h('option', {value: ''}, 'verdict…'), h('option', {value: 'A'}, 'ACCEPT'), h('option', {value: 'D'}, 'ADAPT'), h('option', {value: 'R'}, 'REJECT'));
        sel.value = x.v || '';
        var why = h('input', {type: 'text', value: x.why || '', placeholder: x.v === 'R' ? 'Your reason — one blunt sentence. You\'re allowed to be certain.' : 'How you\'ll fix it (optional)'});
        var done = h('input', {type: 'checkbox', checked: !!x.done, 'aria-label': 'Fixed'});
        sel.addEventListener('change', function(){ var a = all(); a.forEach(function(r){ if (r.id === x.id) r.v = sel.value; }); save(a); paint(); });
        why.addEventListener('input', Z.saveSoon(function(){
          var a = all(), row = null;
          for (var q = 0; q < a.length; q++) if (a[q].id === x.id) row = a[q];
          if (!row) return;            /* the note was deleted while typing */
          row.why = why.value; save(a);
        }, 300));
        done.addEventListener('change', function(){ var a = all(); a.forEach(function(r){ if (r.id === x.id) r.done = done.checked; }); save(a); paint(); });
        table.appendChild(h('div.lrow' + (hot ? '.hot' : '') + (x.v === 'R' && !x.why ? '.needwhy' : ''), null,
          h('span.lr-r', null, x.r || '—'), h('span.lr-p', null, x.p ? 'p. ' + x.p : ''), h('span.lr-n', null, x.n, hot ? h('em.hotnote', null, ' · 2+ readers here — a real problem') : null),
          sel, why, h('label.lr-d', {title: 'Executed'}, done, h('span', null, 'fixed')),
          h('button.x', {type: 'button', 'aria-label': 'Delete note', onclick: function(){ save(all().filter(function(r){ return r.id !== x.id; })); paint(); }}, '✕')));
      });
      var n = v.filter(function(x){ return x.v; }).length || 1, A = v.filter(function(x){ return x.v === 'A'; }).length, D = v.filter(function(x){ return x.v === 'D'; }).length, Rj = v.filter(function(x){ return x.v === 'R'; }).length;
      sum.innerHTML = '';
      sum.appendChild(h('p', {html: '<b>' + Math.round(A / n * 100) + '% accept · ' + Math.round(D / n * 100) + '% adapt · ' + Math.round(Rj / n * 100) + '% reject</b> — a healthy draft runs about 40 / 35 / 25. Execute ACCEPT + ADAPT only, one session per reader round. ' + (v.some(function(x){ return x.v === 'R' && !x.why; }) ? '<span class="warn">Every REJECT needs its one-sentence reason.</span>' : '')}));
    }
    paint();
  };
  Z.SEVEN_Q = 'Thank you for reading. Seven questions — short answers are perfect:\n\n1. Where were you bored? (page numbers)\n2. Where were you confused?\n3. What is the story about — in one sentence?\n4. Which character would you cut?\n5. Which character do you want more of?\n6. Where did you stop believing a choice or a line?\n7. Did the ending land? Why / why not?\n\nNothing else — no need to tell me whether you liked it.';

  /* ── simple lists: five scripts, books, assets ── */
  Z.tools.library = function(el){
    el.innerHTML = '';
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ Five scripts on your machine · Script Slug first'));
    ['Get Out', 'Whiplash', 'Lady Bird', 'Little Miss Sunshine', 'Arrival'].forEach(function(t, k){
      var cb = h('input', {type: 'checkbox'}); cb.dataset.f = 'lib.' + k;
      var inp = h('input', {type: 'text', placeholder: t}); inp.dataset.f = 'lib.t' + k;
      box.appendChild(h('div.lib-row', null, h('label', null, cb, h('span', null, 'on my machine')), inp));
    });
    el.appendChild(box); bindFields(box);
  };
  /* ── copy buttons for templates ── */
  Z.tools.copy = function(el){
    el.innerHTML = '';
    var txt = el.dataset.text === 'swap' ? 'I\'m building a body of short scripts and I want to get better faster. Want a standing monthly swap — your pages for mine, notes within a week, written only?' : Z.SEVEN_Q;
    el.appendChild(h('button.btn', {type: 'button', onclick: function(){ Z.copy(txt, 'Copied — paste it into your message.'); }}, el.dataset.label || '⧉ Copy'));
  };

  /* ── render any .tool placeholder ── */
  Z.renderTool = function(el){
    var fn = Z.tools[el.dataset.tool];
    if (!fn) return;
    try { fn(el); } catch (e) { console.error('tool ' + el.dataset.tool, e); el.textContent = 'This tool failed to load: ' + e.message; }
  };
})();
