/* ══ 55 · extras: worked examples onto the page, pattern buttons, the
   fifteen-beat sheet, the TV engine test ════════════════════════════════ */
(function(){
  var S = Z.store, h = Z.h;
  Z.tools = Z.tools || {};

  /* every example script in the file opens as an editable copy */
  Z.initExamples = function(){
    Z.$$('#doc pre.script').forEach(function(pre){
      if (pre.classList.contains('exam-static') || pre.nextElementSibling && pre.nextElementSibling.classList.contains('ex-row')) return;
      var probe = Z.blocksFromPre(pre);
      if (!probe.some(function(b){ return b.t === 'slug' && /^(INT|EXT)\./.test(b.x); })) return;   /* not a screenplay example */
      var btn = h('button.btn.small', {type: 'button', onclick: function(){
        var blocks = Z.blocksFromPre(pre); if (!blocks.length) return;
        var first = blocks.filter(function(b){ return b.t === 'slug'; })[0];
        var sc = Z.page.create('Example · ' + (first ? first.x : 'scene'), blocks);
        Z.page.open({scriptId: sc.id});
        Z.toast('A copy of the example — change anything. Try the doctor on it, Cover names, or rewrite it under a constraint.', {ms: 6000});
      }}, '✎ Open a copy on my page');
      pre.after(h('div.ex-row', null, btn, h('span', null, 'Worked examples are for taking apart.')));
    });
    /* the twenty patterns: a Write button on every row */
    var fold = document.getElementById('e--scene-patterns--20-cards--5-drills');
    var tbl = fold && Z.$('table', fold);
    if (tbl && !Z.$('th.pat-go', tbl)) {
      Z.$('thead tr', tbl).appendChild(h('th.pat-go', null, 'Practise'));
      Z.$$('tbody tr', tbl).forEach(function(tr){
        var num = (tr.children[0].textContent || '').trim();
        tr.appendChild(h('td', null, h('button.btn.small', {type: 'button', onclick: function(){ Z.startPatternDrill(num, '', 20); }}, '✎ Write it')));
      });
    }
  };

  /* the fifteen beats, for the idea on the ladder (feature scale) */
  var BEATS = [['oi', 'Opening Image', '1'], ['ts', 'Theme Stated', '5'], ['su', 'Set-Up', '1–10'], ['ca', 'Catalyst', '12'], ['de', 'Debate', '12–25'], ['b2', 'Break Into Two', '25'], ['bs', 'B Story', '30'], ['fg', 'Fun and Games', '30–55'], ['mp', 'Midpoint', '55'], ['bg', 'Bad Guys Close In', '55–75'], ['al', 'All Is Lost', '75'], ['dn', 'Dark Night of the Soul', '75–85'], ['b3', 'Break Into Three', '85'], ['fi', 'Finale', '85–110'], ['fm', 'Final Image', '110']];
  Z.tools.beats15 = function(el){
    el.innerHTML = '';
    el.appendChild(Z.ladderBadge());
    var box = h('div.wb-card');
    box.appendChild(h('div.wb-k', null, '✎ The fifteen beats for your feature · one line each · ~page in brackets'));
    var grid = h('div.beats15');
    BEATS.forEach(function(b){
      var ta = h('textarea', {rows: 1, placeholder: 'p. ' + b[2], 'aria-label': b[1]}); ta.dataset.lf = 'beats.' + b[0];
      grid.appendChild(h('label', null, h('span', null, b[1], h('em', null, ' ~p. ' + b[2])), ta));
    });
    box.appendChild(grid);
    var meter = h('p.wf-h'); box.appendChild(meter);
    el.appendChild(box);
    Z.bindLadder(box);
    function paint(){ var d = (Z.ladder.data().beats) || {}, n = BEATS.filter(function(b){ return (d[b[0]] || '').trim(); }).length; meter.textContent = n + ' / 15 beats — the P3 gate wants 15/15, then a treatment a partner can retell.'; }
    paint(); box.addEventListener('input', Z.debounce(paint, 400));
  };

})();
