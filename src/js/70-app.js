/* ══ 70 · the app: saving, backups, the action router, the first-page coach ══
   Everything this file remembers lives in this browser. A backup is one small
   JSON file you keep somewhere else; a restore replaces what is here.       */
(function(){
  var S = Z.store, h = Z.h;
  Z.tools = Z.tools || {};

  /* ── the saves panel ─────────────────────────────────────────────── */
  Z.tools.saves = function(el){
    el.innerHTML = '';
    var box = h('div.saves');
    var status = h('p.sv-status'); box.appendChild(status);
    var tog = h('button.btn', {type: 'button', onclick: function(){
      if (S.saving()) Z.confirmInline(tog, 'Turn saving off? What you type will disappear when this tab closes, and the copy in this browser is erased now.', function(){ S.setSaving(false); paint(); });
      else { S.setSaving(true); paint(); Z.toast('Saving is on.', {ok: true}); }
    }}, 'Turn saving off');
    var out = h('div.sv-out');
    box.appendChild(h('div.wb-row', null,
      h('button.btn.primary', {type: 'button', 'data-go': 'backup'}, '⤓ Download a backup'),
      h('button.btn', {type: 'button', onclick: verify}, '✓ Test a backup file'),
      h('button.btn', {type: 'button', onclick: restore}, '⤒ Restore from a backup…'),
      h('button.btn', {type: 'button', onclick: exportText}, '⤓ Export everything as text'),
      tog));
    box.appendChild(out);
    var erase = h('button.linkish', {type: 'button', onclick: function(){
      Z.confirmInline(erase, 'Erase everything this file saved in this browser — scripts, ideas, cards, scores? Download a backup first if you might want it back.', function(){ S.eraseAll(); location.reload(); });
    }}, 'Erase everything this file saved…');
    box.appendChild(h('p.sv-note', null, 'Everything stays in this browser on this computer. Nothing is ever sent anywhere by anything in this file. ', erase));
    el.appendChild(box);

    function paint(){
      var on = S.saving(), lb = S.get('lastbackup');
      status.innerHTML = on
        ? '<b class="ok">● Saving is on.</b> Every script, idea and score is kept in this browser. ' + (lb ? 'Last backup ' + Z.ago(lb) + '.' : 'No backup downloaded yet.')
        : '<b class="warn">○ Saving is off.</b> Nothing leaves memory; closing the tab loses it.';
      tog.textContent = on ? 'Turn saving off' : 'Turn saving on';
      if (!S.available) status.innerHTML += ' <span class="warn">This browser is blocking storage for local files — download backups by hand.</span>';
      else if (S.failed()) status.innerHTML += ' <span class="warn">The last write was refused — this browser\'s storage may be full. Download a backup now.</span>';
    }
    function verify(){
      Z.pickFile('.json,application/json', function(t, f){
        out.innerHTML = '';
        var r = parseBackup(t);
        if (!r.ok) { out.appendChild(h('p.miss', null, '✗ ' + r.msg)); return; }
        out.appendChild(h('p.ok', null, '✓ "' + f.name + '" is a good backup: ' + r.summary + '. Nothing was changed — that was the restore drill.'));
      });
    }
    function restore(){
      Z.pickFile('.json,application/json', function(t, f){
        out.innerHTML = '';
        var r = parseBackup(t);
        if (!r.ok) { out.appendChild(h('p.miss', null, '✗ ' + r.msg)); return; }
        var b = h('button.btn.danger', {type: 'button', onclick: function(){
          var onDisk = S.restore(r.data);
          if (onDisk) { location.reload(); return; }
          out.innerHTML = '';
          out.appendChild(h('p.miss', null, 'Restored into this tab only — saving is off, so none of it is written to this browser. Turn saving on above and restore again to keep it.'));
          Z.emit('ladder'); Z.emit('ideas');
        }}, 'Replace what\'s here with this backup');
        out.appendChild(h('p', null, 'Backup "' + f.name + '": ' + r.summary + '. Restoring replaces everything this file holds here — anything not in the backup is cleared. ', b));
      });
    }
    paint();
    Z.on('saving', paint, box);
  };

  function parseBackup(t){
    var j; try { j = JSON.parse(t); } catch (e) { return {ok: false, msg: 'That isn\'t a backup file (not valid JSON).'}; }
    if (!j || !j.data || (j.app !== 'easyscreenplay' && j.app !== 'zero-to-funded')) return {ok: false, msg: 'That JSON isn\'t an EasyScreenplay backup.'};
    var d = j.data, scripts = Object.keys(d).filter(function(k){ return /^script:/.test(k); }).length;
    var ideas = 0; try { ideas = JSON.parse(d.ideas || '[]').length; } catch (e) {}
    return {ok: true, data: d, summary: Object.keys(d).length + ' saved items · ' + Z.plural(scripts, 'script') + ' · ' + Z.plural(ideas, 'idea') + ' · made ' + (j.exported || '?').slice(0, 10)};
  }

  Z.backup = function(){
    var snap = S.snapshot();
    delete snap.save;                    /* the saving switch belongs to a browser */
    S.set('lastbackup', Z.todayISO());
    snap.lastbackup = Z.todayISO();
    Z.download('easyscreenplay-backup-' + Z.todayISO() + '.json',
      JSON.stringify({app: 'easyscreenplay', version: 1, exported: new Date().toISOString(), data: snap}, null, 1), 'application/json');
    Z.toast('Backup downloaded. Keep it in your cloud-synced folder.', {ok: true});
    Z.emit('saving');
  };

  function exportText(){
    var L = Z.ladder, out = ['EASYSCREENPLAY — everything I have written — ' + Z.todayISO(), ''];
    var ideas = L.ideas();
    out.push('== IDEAS (' + ideas.length + ') ==');
    ideas.forEach(function(i){
      out.push('', '[' + i.d + '] ' + i.t + (i.id === L.activeId() ? '  (the one I am working on)' : ''), '1. ' + (i.s || ''), '2. ' + (i.w || ''), '3. ' + (i.n || ''));
      var d = L.data(i.id);
      if (d.test) out.push('TEST — wants: ' + (d.test.wants || '') + ' | resists: ' + (d.test.resists || '') + ' | changes: ' + (d.test.changes || ''));
      if (d.log) out.push('LOGLINE — When ' + (d.log.dis || '…') + ', a ' + (d.log.pro || '…') + ' must ' + (d.log.goal || '…') + ' or ' + (d.log.lost || '…') + ' — but ' + (d.log.obs || '…') + '.');
      if (d.people) out.push('HERO — ' + [d.people.hn, 'wants ' + (d.people.hw || ''), 'needs ' + (d.people.hne || ''), 'flaw ' + (d.people.hf || ''), 'ghost ' + (d.people.hg || '')].join(' · '),
                             'OPPOSITION — ' + [d.people.on, 'wants ' + (d.people.ow || ''), 'plan ' + (d.people.op || ''), 'belief ' + (d.people.ob || '')].join(' · '));
      if (d.shape) out.push('SHAPE — ' + ['b1', 'b2', 'b3', 'b4', 'b5'].map(function(k, n){ return (n + 1) + '. ' + (d.shape[k] || ''); }).join(' / '));
      (d.cards || []).forEach(function(c, n){ out.push('CARD ' + (n + 1) + ' — ' + c.ie + ' ' + c.loc + ' - ' + c.tod + ' · wants: ' + c.who + ' · blocked: ' + c.blk + ' · end: ' + c.diff + ' · enter at: ' + c.ent); });
    });
    out.push('', '== READS ==');
    S.getJSON('reads', []).forEach(function(r){ out.push(r.d + ' · ' + r.script + ' (' + r.kind + ') — ' + (r.log || '')); });
    out.push('', '== NOTES LEDGER ==');
    S.getJSON('ledger', []).forEach(function(x){ out.push((x.r || '?') + ' p.' + (x.p || '?') + ' — ' + x.n + ' → ' + ({A: 'ACCEPT', D: 'ADAPT', R: 'REJECT'}[x.v] || '—') + (x.why ? ': ' + x.why : '')); });
    Z.page.list().forEach(function(r){ var sc = Z.page.load(r.id); if (!sc) return; out.push('', '== SCRIPT: ' + sc.title + ' ==', '', Z.toFountain(sc)); });
    Z.download('easyscreenplay-' + Z.todayISO() + '.txt', out.join('\n'));
    Z.toast('Everything you have written, as one plain text file.', {ok: true});
  }

  /* ── the buttons: data-go ────────────────────────────────────────── */
  function go(v, btn){
    if (!v) return;
    if (v.charAt(0) === '#') { Z.go(v.slice(1), {flash: true}); return; }
    var P = Z.page;
    if (v === 'page') return P.open();
    if (v === 'page:first') return Z.firstPage();
    if (v === 'page:retype') return Z.retypeDrill();
    if (v === 'page:idea') {
      var L = Z.ladder, idea = L && L.active();
      if (!idea) return P.open();
      var d = L.data(idea.id), sid = d.scriptId && P.load(d.scriptId) ? d.scriptId : null;
      if (!sid) { var sc = P.create(idea.t); d.scriptId = sc.id; L.setData(d, idea.id); sid = sc.id; }
      return P.open({scriptId: sid});
    }
    if (v === 'page:names') { go('page:idea'); P.setCover('names', true); Z.toast('Names covered. Can you tell who is speaking from the line alone?', {ms: 5000}); return; }
    if (v === 'page:dialogue') { go('page:idea'); P.setCover('dia', true); Z.toast('Dialogue covered: is the conflict visible in behaviour alone?', {ms: 5000}); return; }
    if (v === 'page:doctor') { go('page:idea'); P.side('doctor'); return; }
    if (v === 'page:doctor-action') { go('page:idea'); P.side('doctor'); var f = Z.$('#pgSide .ps-filter button:nth-child(2)'); if (f) f.click(); return; }
    if (v === 'page:read') { go('page:idea'); P.side('read'); return; }
    if (v === 'page:scenes') { go('page:idea'); P.side('scenes'); return; }
    if (v === 'page:more') { go('page:idea'); P.side('more'); return; }
    if (v === 'page:print') { go('page:idea'); P.side('more'); Z.toast('"Print / Save as PDF" is in this panel. Read the PDF on a different device, as a stranger.', {ms: 5000}); return; }
    if (v === 'backup') return Z.backup();
    if (v === 'copy7') return Z.copy(Z.SEVEN_Q, 'The seven questions are on your clipboard. Brief the reader: problems, not prescriptions.');
    if (v === 'vault') return Z.quickVault(btn);
  }
  Z.goAction = go;
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-go]');
    if (b) { e.preventDefault(); go(b.dataset.go, b); }
  });

  /* ── the first page, with a coach that ticks off each key ────────── */
  Z.firstPage = function(){
    var P = Z.page, ix = P.list(), sc = null;
    ix.forEach(function(r){ if (r.title === 'My first page') sc = P.load(r.id); });
    if (!sc) sc = P.create('My first page');
    P.open({scriptId: sc.id, mode: 'full', coach: {
      title: 'Your first page', sub: 'Six keys. You are proving the machine works and your hands can drive it.',
      items: [
        {label: 'Type <b>INT.</b> + a room you know + <b>- DAY</b>', test: function(b){ return b.some(function(x){ return x.t === 'slug' && /^(INT|EXT)\.\s+\S.*\s-\s+\S+/.test(x.x); }); }},
        {label: '<kbd>Enter</kbd> → one sentence the camera sees, present tense', test: function(b){ return b.some(function(x){ return x.t === 'action' && Z.words(x.x) >= 3; }); }},
        {label: '<kbd>Tab</kbd> → a character name (it capitalises itself)', test: function(b){ return b.some(function(x){ return x.t === 'char' && x.x.trim(); }); }},
        {label: '<kbd>Enter</kbd> → one line they would say', test: function(b){ return b.some(function(x, i){ return x.t === 'dia' && x.x.trim() && b[i - 1] && (b[i - 1].t === 'char' || b[i - 1].t === 'paren'); }); }},
        {label: 'Saved — automatically, on this device', test: function(){ return Z.store.saving(); }}
      ],
      note: 'The element you are in is named at the top left. Don\'t write more than a scene tonight.',
      onComplete: function(){
        Z.toast('That is a screenplay page: four of the six shapes. Next, keep it — download one backup.', {ok: true, ms: 7000});
      }
    }});
  };

  /* ── remember which surface you were on ─────────────────────────── */
  Z.initApp = function(){
    var first = !S.get('seen');
    S.set('seen', '1');
    Z.on('page:open', function(){ S.set('view', 'write'); });
    Z.on('page:close', function(){ S.set('view', 'guide'); });
    if (first) { Z.firstPage(); return; }
    if (S.get('view') !== 'guide') Z.page.open();
  };
})();
