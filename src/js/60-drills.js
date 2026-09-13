/* ══ 60 · drills, exams, self-tests ═════════════════════════════════════
   Instant feedback, a score, a best score, and a retry of only the ones you
   missed. Every drill is placed inside the step that teaches its rule.    */
(function(){
  var S = Z.store, h = Z.h;
  Z.tools = Z.tools || {};

  /* ── scores ── */
  var SC = Z.scores = {
    all: function(){ return S.getJSON('scores', {}); },
    get: function(id){ return SC.all()[id] || null; },
    record: function(id, score, max, pass, extra){
      var a = SC.all(), r = a[id] || {best: 0, n: 0};
      r.last = score; r.max = max; r.n = (r.n || 0) + 1; r.d = Z.todayISO();
      if (score >= (r.best || 0)) r.best = score;
      if (pass) r.pass = r.pass || Z.todayISO();
      if (extra) Object.keys(extra).forEach(function(k){ r[k] = extra[k]; });
      a[id] = r; S.setJSON('scores', a); Z.emit('score', id);
      return r;
    }
  };
  function passBadge(id){
    var r = SC.get(id);
    if (!r) return h('span.dr-best', null, 'not taken yet');
    return h('span.dr-best' + (r.pass ? '.pass' : ''), null, (r.pass ? '✓ passed · ' : '') + 'best ' + r.best + '/' + r.max + ' · ' + Z.plural(r.n, 'try', 'tries'));
  }

  /* ══ multiple-choice drill engine ══ */
  var D = Z.DRILLS = {};
  function mcDrill(el, id){
    var def = D[id]; if (!def) return;
    el.innerHTML = '';
    var box = h('div.drill');
    var head = h('div.dr-head', null, h('div.dr-k', null, '◎ Drill'), h('b', null, def.title), passBadge(id));
    box.appendChild(head);
    if (def.intro) box.appendChild(h('p.dr-intro', {html: def.intro}));
    var body = h('div.dr-body'); box.appendChild(body);
    el.appendChild(box);
    var start = h('div.wb-row', null, h('button.btn.primary', {type: 'button', onclick: function(){ run(def.items.map(function(_, i){ return i; })); }}, '▶ Start · ' + def.items.length + ' items'));
    body.appendChild(start);

    function run(order, retry){
      if (def.shuffle !== false) order = shuffle(order.slice());
      var k = 0, right = 0, wrong = [], t0 = Date.now();
      body.innerHTML = '';
      var prog = h('div.dr-prog'), q = h('div.dr-q'), opts = h('div.dr-opts'), fb = h('div.dr-fb', {'aria-live': 'polite'});
      body.appendChild(prog); body.appendChild(q); body.appendChild(opts); body.appendChild(fb);
      function show(){
        var it = def.items[order[k]];
        prog.textContent = (k + 1) + ' / ' + order.length + ' · ' + right + ' right';
        q.innerHTML = '';
        if (it.ctx) q.appendChild(h('div.dr-ctx', {html: it.ctx}));
        q.appendChild(it.script ? h('pre.dr-line', null, it.q) : h('p', {html: it.q}));
        opts.innerHTML = ''; fb.innerHTML = '';
        (it.options || def.options).forEach(function(o, j){
          opts.appendChild(h('button.opt', {type: 'button', onclick: function(){ answer(j, this); }}, (j < 9 ? (j + 1) + ' · ' : '') + o));
        });
        var first = opts.querySelector('button'); if (first && box.getBoundingClientRect().top >= 0) first.focus({preventScroll: true});
      }
      function answer(j, btn){
        var it = def.items[order[k]], ok = j === it.a;
        Z.$$('button', opts).forEach(function(b, x){ b.disabled = true; if (x === it.a) b.classList.add('right'); });
        if (!ok) btn.classList.add('wrong');
        if (ok) right++; else wrong.push(order[k]);
        fb.innerHTML = '';
        fb.appendChild(h('p.' + (ok ? 'ok' : 'miss'), {html: (ok ? '✓ ' : '✗ ') + (it.why || '')}));
        if (it.fix) fb.appendChild(h('p.dr-fix', {html: '<b>Filmable:</b> ' + it.fix}));
        var nx = h('button.btn.primary', {type: 'button', onclick: next}, k + 1 < order.length ? 'Next →' : 'See score');
        fb.appendChild(nx); nx.focus({preventScroll: true});
      }
      function next(){ k++; if (k < order.length) show(); else done(); }
      function done(){
        var secs = Math.round((Date.now() - t0) / 1000);
        var full = !retry && order.length === def.items.length;
        var pass = full && right >= (def.pass || def.items.length);
        if (full) SC.record(id, right, order.length, pass, {secs: secs});
        body.innerHTML = '';
        body.appendChild(h('p.dr-score', {html: '<b>' + right + ' / ' + order.length + '</b> in ' + secs + ' s' + (full ? (pass ? ' — <span class="ok">passed.</span>' : ' — pass bar is ' + (def.pass || def.items.length) + '.') : ' (retry round — not scored)')}));
        if (def.after) body.appendChild(h('p.dr-intro', {html: def.after}));
        var row = h('div.wb-row');
        if (wrong.length) row.appendChild(h('button.btn.primary', {type: 'button', onclick: function(){ run(wrong, true); }}, '↻ Retry the ' + wrong.length + ' you missed'));
        row.appendChild(h('button.btn', {type: 'button', onclick: function(){ run(def.items.map(function(_, i){ return i; })); }}, '↻ Whole drill again'));
        body.appendChild(row);
        head.replaceChild(passBadge(id), head.lastChild);
        if (wrong.length && Z.recall) Z.recall.addMissed(id, wrong.map(function(i){ return def.items[i]; }), def);
      }
      box.onkeydown = function(e){
        if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          var b = Z.$$('button.opt', opts)[+e.key - 1]; if (b && !b.disabled) { e.preventDefault(); b.click(); }
        }
      };
      show();
    }
  }
  function shuffle(a){ for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  Z.tools.drill = function(el){ mcDrill(el, el.dataset.id); };

  var SHAPES = ['Scene heading', 'Action', 'Character cue', 'Parenthetical', 'Dialogue', 'Transition'];
  function pad(n){ return new Array(n + 1).join(' '); }
  D.shapes = {title: 'Name the shape', pass: 18, intro: 'Eighteen lines from real pages, laid out where they sit on the page. Name each one. Keys 1–6 answer.',
    options: SHAPES, items: [
      {q: 'INT. LAUNDROMAT - DAY', script: 1, a: 0, why: 'INT./EXT. + place + time, all caps, flush left: a scene heading (slug).'},
      {q: 'RUTH (60s, careful posture, careful shoes) feeds\nquarters into a dryer. One at a time.', script: 1, a: 1, why: 'Present-tense description of what the camera sees, flush left: action. First appearance of a speaking character in CAPS.'},
      {q: pad(20) + 'YOUNG MAN', script: 1, a: 2, why: 'An all-caps name, indented about 3.7", above the words: a character cue.'},
      {q: pad(14) + '(not looking up)', script: 1, a: 3, why: 'Lower case, in parentheses, between cue and dialogue: a parenthetical — earned here because the line could read friendly or rude.'},
      {q: pad(10) + 'Any of these free?', script: 1, a: 4, why: 'Under the name, in the narrow middle column: dialogue.'},
      {q: pad(42) + 'CUT TO:', script: 1, a: 5, why: 'Caps, flush right, ending in a colon: a transition. Almost never needed — a new slug is the cut.'},
      {q: 'EXT. PARKING GARAGE - NIGHT', script: 1, a: 0, why: 'EXT. = outside. A scene heading.'},
      {q: 'Locks the bike. Goes in.', script: 1, a: 1, why: 'Behavior, present tense, flush left: action. (Fragments are fine — white space is pace.)'},
      {q: pad(20) + 'SARA', script: 1, a: 2, why: 'Character cue.'},
      {q: pad(10) + 'You eat today?', script: 1, a: 4, why: 'Dialogue — and subtext: she\'s not asking about food.'},
      {q: 'A long beat. Highway lights sweep the glass.', script: 1, a: 1, why: 'Action — silence and behavior register as dialogue.'},
      {q: 'INT. HOSPITAL CAFETERIA - DAY', script: 1, a: 0, why: 'Scene heading.'},
      {q: pad(14) + '(from downstairs)', script: 1, a: 3, why: 'Parenthetical — a tiny note on where the voice comes from.'},
      {q: pad(20) + 'GRACE (O.S.)', script: 1, a: 2, why: 'Character cue with an extension: O.S. — she is in the house, just not in the shot.'},
      {q: pad(10) + 'Your hour\'s almost up.', script: 1, a: 4, why: 'Dialogue.'},
      {q: pad(38) + 'SMASH CUT TO:', script: 1, a: 5, why: 'A transition kept for a deliberate effect.'},
      {q: 'His phone lights up on the counter: MOM CALLING.', script: 1, a: 1, why: 'Action. The screen text is described in direction, in caps.'},
      {q: pad(20) + 'COO (V.O.)', script: 1, a: 2, why: 'Character cue. V.O. — the voice comes through a phone, from outside the scene.'}
    ]};

  D.camera = {title: 'The camera test', pass: 13, intro: 'Could a camera SEE it or a microphone HEAR it? If not, it doesn\'t belong in action. After each answer you get a filmable version.',
    options: ['Filmable', 'Not filmable'], items: [
      {q: 'Maya is nervous.', a: 1, why: 'An inner state.', fix: 'Maya wipes her palms on her skirt. Checks her reflection twice.'},
      {q: 'David pours coffee. Stares at the full cup. Doesn\'t drink.', a: 0, why: 'Pure behavior — and it carries everything.'},
      {q: 'He realizes she was lying all along.', a: 1, why: '"Realizes" happens inside a head.', fix: 'He looks at the receipt. Then at her. She doesn\'t look away.'},
      {q: 'Nora watches her mother straighten a fork.', a: 0, why: 'Visible — and the proxy object is doing the talking.'},
      {q: 'Kenji has always hated this building.', a: 1, why: 'Backstory. A camera can\'t film "always".', fix: 'Kenji stops at the door. Doesn\'t touch the handle.'},
      {q: 'His phone lights up: MOM CALLING. He turns it face-down.', a: 0, why: 'Seen and done. The rejected call is the emotion.'},
      {q: 'She remembers the summer her father left.', a: 1, why: 'Memory is invisible — unless you write a flashback.', fix: 'She finds the postcard in the drawer. Puts it back without reading it.'},
      {q: 'A DOG BARKS somewhere below.', a: 0, why: 'The microphone hears it. (A sound gets CAPS — one of the three uses.)'},
      {q: 'Eli feels twelve years of guilt.', a: 1, why: 'A feeling, and a number nobody can photograph.', fix: 'Eli counts the squares on the closet door. Can\'t stop counting.'},
      {q: 'Claire decides to tell Nora the truth.', a: 1, why: 'A decision is internal until it becomes behavior.', fix: 'Claire puts the fork down. Opens her mouth. Closes it.'},
      {q: 'Marcus pulls off the headset. Just holds it.', a: 0, why: 'Behavior with a pause built in.'},
      {q: 'The room smells of old coffee.', a: 1, why: 'Neither camera nor microphone records smell.', fix: 'Three mugs on the desk, each with a dried brown ring.'},
      {q: 'Nadia is the best engineer the company has ever had.', a: 1, why: 'A judgement — exposition in disguise.', fix: 'Fourteen framed patents on the server-room wall. Every one says NADIA.'},
      {q: 'Grace\'s hand shakes as she gives him the key.', a: 0, why: 'Visible. The shake says what she won\'t.'}
    ]};

  D.vo = {title: 'V.O. or O.S.?', pass: 9, intro: 'One question settles every case: is the speaker physically in the scene\'s here-and-now? Yes but unseen → O.S. Anything else → V.O. <em>(Riley: phones, TVs, radios, recordings, narrators, pre-laps and memories are all V.O.)</em>',
    options: ['(V.O.)', '(O.S.)'], items: [
      {q: 'Mom calls from the kitchen. We\'re watching her son in the living room.', a: 1, why: 'She\'s in the location, just not in the shot — Off to the Side.'},
      {q: 'The COO speaks through Nadia\'s speakerphone from across the city.', a: 0, why: 'Not in the room — a Voice from Outside.'},
      {q: 'A narrator comments over the opening images.', a: 0, why: 'Narration is always V.O.'},
      {q: 'A guard shouts from behind a door in the corridor we\'re in.', a: 1, why: 'Physically present, out of frame.'},
      {q: 'A news anchor on the TV above the bar.', a: 0, why: 'Riley: voices from TVs, radios and loudspeakers are V.O. — even when the set is in the room.'},
      {q: 'A voicemail plays from the answering machine.', a: 0, why: 'A recording — V.O.'},
      {q: 'Grace calls up the stairs while we watch Eli in the bedroom.', a: 1, why: 'Same house, same moment — O.S.'},
      {q: 'The next scene\'s first line starts over the end of this one (a pre-lap).', a: 0, why: 'A voice overlapping from another scene is V.O. (PRE-LAP).'},
      {q: 'Someone coughs in the dark at the back of the theatre we\'re in.', a: 1, why: 'Present, unseen.'},
      {q: 'Eli hears his father\'s voice in his head.', a: 0, why: 'Memory and imagination are V.O.'}
    ]};

  D.paren = {title: 'Keep or cut the parenthetical?', pass: 7, intro: 'The deletion test: delete it. If the meaning is unchanged, it was never earned. Four uses survive — the delivery contradicts the words · the addressee in a group · a tiny action beat · (beat).',
    options: ['Keep', 'Cut'], items: [
      {q: 'SARAH <i>(angrily)</i> — "Get out of my house!"', a: 1, why: 'The line already implies it. Stating the obvious insults the reader and the actor in one breath.'},
      {q: 'MAYA <i>(to Leo)</i> — "You knew." <span class="dim">— four people at the table</span>', a: 0, why: 'Addressee in a group: legitimate.'},
      {q: 'YOUNG MAN <i>(not looking up)</i> — "Any of these free?"', a: 0, why: 'The line reads friendly or rude; this fixes the tone without stating it.'},
      {q: 'CLAIRE <i>(sadly)</i> — "The doctor says another week."', a: 1, why: 'The context carries it.'},
      {q: 'LEO <i>(meaning it)</i> — "You\'re absolutely right."', a: 0, why: 'Without it the line reads as contempt (over-agreement). The delivery contradicts what the words suggest — the first legitimate use.'},
      {q: 'MARCUS <i>(beat)</i> — "I used to have a different one."', a: 0, why: '(beat) is one of the four survivors.'},
      {q: 'MANAGER <i>(dismissively, not looking at her, with a tone that shows he doesn\'t care)</i> — "Next."', a: 1, why: 'Bloated and obvious. One word at most — usually none.'},
      {q: 'NORA <i>(smiling)</i> — "I\'m so happy for you."', a: 1, why: 'The line says it already — and the line itself is on the nose.'}
    ]};

  D.heading = {title: 'New scene heading — or the same scene?', pass: 7, intro: 'A new heading is required exactly three times: the location changes · the time changes · visual logic demands it. There is no fourth.',
    options: ['New heading', 'Same scene'], items: [
      {q: 'We follow Maya from her bedroom into the kitchen of the same flat.', a: 0, why: 'The location changes — bedroom to kitchen counts.'},
      {q: 'Same library, but we jump from midnight to the next morning.', a: 0, why: 'The time changes: INT. LIBRARY - NIGHT … INT. LIBRARY - MORNING.'},
      {q: 'Two people keep talking as they walk from one end of the bar to the other.', a: 1, why: 'Same place, continuous time. (If you need to point at part of it, a mini-slug does it.)'},
      {q: 'We\'ve narrowed to an INSERT of the note in her hand and need to get back to the room.', a: 0, why: 'Visual logic: BACK TO SCENE is legitimate and unglamorous.'},
      {q: 'He steps out of the farmhouse kitchen onto the porch.', a: 0, why: 'Interior to exterior counts.'},
      {q: 'Mid-argument, a third person walks into the same room.', a: 1, why: 'An entrance isn\'t a new scene.'},
      {q: 'A phone call: we cut back and forth between both ends.', a: 0, why: 'Slug each location once, then INTERCUT - PHONE CONVERSATION and alternate freely.'},
      {q: 'She stares out of the window for a long time; nothing else changes.', a: 1, why: 'Time passing inside one continuous beat is still one scene. (A jump would be - LATER.)'}
    ]};

  D.charge = {title: 'Does the scene turn?', pass: 6, intro: 'Write the value and its sign at the start and at the end. Same sign at both ends and it is not a scene yet, however good the dialogue is.',
    options: ['+ → −', '− → +', '+ → +', '− → −'], items: [
      {q: 'Nadia believes a clean backup exists. She finds every copy corrupt. <span class="dim">(hope)</span>', a: 0, why: 'Hope + → −. It turns.'},
      {q: 'Eli is shut out of the house. Grace hands him the key. <span class="dim">(connection)</span>', a: 1, why: 'Connection − → +. It turns.'},
      {q: 'Two friends agree the restaurant is lovely, order, and agree the food is lovely. <span class="dim">(harmony)</span>', a: 2, why: '+ → +. Nothing happened — a nonevent. Not a scene yet.'},
      {q: 'Claire thinks Nora only came out of duty. Nora: "I can stay a week." <span class="dim">(love)</span>', a: 1, why: '− → +. The turn is in the subtext.'},
      {q: 'A detective is sure of her suspect. His alibi checks out. <span class="dim">(certainty)</span>', a: 0, why: '+ → −. The gap between expectation and result.'},
      {q: 'Marcus is numb at call 67; he logs call 68 exactly the same way. <span class="dim">(aliveness)</span>', a: 3, why: '− → −. Flat. It needs a gap: something must violate his expectation.'}
    ], after: 'Run this over your own cards: the charge strip in scene cards shows it for every card you save.'};

  D.subtext = {title: 'Which subtext move?', pass: 9, intro: 'Five moves. Name the one each exchange is using.',
    options: ['Deflection', 'Attack', 'Subject change', 'Proxy object', 'Over-agreement'], items: [
      {q: '"Did you take the money?" / "I made dinner."', a: 0, why: 'Answers a different question.'},
      {q: '"How could you?" / "You should ask yourself that."', a: 1, why: 'Counters with an accusation.'},
      {q: '"I need to talk about us." / "I saw you left the stove on."', a: 2, why: 'Pivots mid-exchange.'},
      {q: 'Two brothers argue for five minutes about who gets their father\'s broken watch.', a: 3, why: 'The real fight — about their father — runs through an object.'},
      {q: '"You\'re absolutely right." <span class="dim">(End of conversation.)</span>', a: 4, why: 'Agreement so fast it communicates contempt.'},
      {q: '"You eat today?" / "There\'s a rest stop at exit 14."', a: 0, why: 'He answers a question she didn\'t ask.'},
      {q: '"Are you seeing him again?" / "Are you reading my messages again?"', a: 1, why: 'Accusation as defence.'},
      {q: 'The night after the funeral, a couple fight about how to load the dishwasher.', a: 3, why: 'A task carries the grief.'},
      {q: '"We need to talk about the money." / "Did you see the Hendersons got a new car?"', a: 2, why: 'A swerve.'},
      {q: '"Fine. Great idea. Let\'s do it your way, like always."', a: 4, why: 'Yes, as a weapon.'}
    ]};

  D.mistakes = {title: 'Which of the twelve?', pass: 10, intro: 'Each snippet commits exactly one of the twelve mistakes\'s twelve craft mistakes. Name it.',
    options: ['1 Wall of gray', '2 Camera direction', '3 Inner state', '4 On-the-nose speech', '5 Empty scene', '6 Late-arriving scene', '7 Overstayed ending', '8 Passive protagonist', '9 Invisible antagonist', '10 Functional names', '11 Wrong extension', '12 Format hand-me-downs'],
    items: [
      {q: 'A nine-line action paragraph describing the office, the weather, the protagonist\'s outfit and her morning.', a: 0, why: 'One beat per paragraph, ≤4 lines.'},
      {q: 'CLOSE UP ON her trembling hands.', a: 1, why: 'Delete. "Her hands — the ring still on." No instruction needed.'},
      {q: 'He realizes he has made a terrible mistake.', a: 2, why: 'Behavior only.'},
      {q: '"I\'m so angry at you because you never listen to me and it makes me feel invisible."', a: 3, why: 'Feelings explained. Subtext swap.'},
      {q: 'Two friends chat about the weather and part. Nothing is different at the end.', a: 4, why: 'Back to the card: can\'t fill "different at the end"? Cut or merge.'},
      {q: 'The scene opens: "Hi! Come in, come in. How was the drive? Can I take your coat?"', a: 5, why: 'Cut to the first line of the real negotiation.'},
      {q: '"Well — goodbye, then." "Goodbye." "Take care." "You too." <span class="dim">(scene ends)</span>', a: 6, why: 'End on the last line where something changed.'},
      {q: 'She waits by the phone. It rings. She is told she got the job.', a: 7, why: 'Things happen to her. Every scene: something she makes happen or prevents.'},
      {q: '"Society keeps getting in her way."', a: 8, why: 'Give the opposition a face, a plan and a reason.'},
      {q: 'ANGRY WOMAN has twelve speeches across four scenes.', a: 9, why: 'A character with real lines gets a name. (A one-line bit part can keep a function.)'},
      {q: 'MOM (O.S.) — on the phone from Ohio.', a: 10, why: 'Not in the scene\'s here-and-now: V.O.'},
      {q: 'SARAH (CONT\'D) — typed by hand, and the scene has changed since she last spoke.', a: 11, why: 'Never type (MORE)/(CONT\'D). The software does it.'}
    ]};

  D.logline = {title: 'Logline doctor', pass: 9, intro: 'Each logline has one problem — or none. Diagnose it.',
    options: ['Too long', 'Too vague', 'No flaw', 'No irony', 'It works'], items: [
      {q: 'A story about a woman\'s journey toward self-acceptance after loss.', a: 1, why: 'A camera can\'t film "about" or "journey". No disruption, no goal, no obstacle.'},
      {q: 'When a lighthouse keeper who has lived alone for thirty years finds a stranded child, a wrecked boat and a locked chest on the beach, she must return the child, open the chest and repair the boat before the storm, or lose everything, but her past returns.', a: 0, why: 'Commas everywhere = several ideas. Pick one.'},
      {q: 'When her town\'s dam starts to crack, an engineer must evacuate the valley by midnight or three thousand people drown — but the only road out runs under the dam.', a: 2, why: 'Great irony, but "an engineer" has no flaw. A frightened engineer? One who signed off on the dam?'},
      {q: 'When a grieving chef inherits her father\'s failing restaurant, she must win over a critic by Friday or lose the building — but the oven is broken.', a: 3, why: 'The obstacle is a stranger to the goal. The best "but" is a sibling: what if the critic is the man who ruined her father?'},
      {q: 'When the servers die the night before launch, a grieving engineer must restore from her dead mentor\'s laptop by morning or the company folds — but the restore erases the last work he ever wrote.', a: 4, why: 'Disruption, flaw, filmable goal, stakes — and an obstacle that grows out of the goal itself.'},
      {q: 'An exploration of family, memory and the ties that bind us.', a: 1, why: 'Topics, not a story.'},
      {q: 'When a meteor is hours from impact, an astronaut must land on it and plant a bomb or the Earth dies — but the bomb can only be set off by hand.', a: 2, why: 'Irony is there (whoever sets it dies) — but who is this astronaut? Give them the flaw the ending will test.'},
      {q: 'When a burned-out survey agent reaches the most honest person in the city, he must finish his hundred calls by end of shift or lose his job — but she keeps exposing that every question on his script is a lie.', a: 4, why: 'Works: his flaw (burned out, outsourcing judgement to a script) is exactly what she attacks.'},
      {q: 'When a shy accountant discovers his firm is laundering money, he must get the evidence to the FBI by Monday or go to prison himself — but his car won\'t start.', a: 3, why: 'A random obstacle. Make it a sibling: the evidence also convicts his sister.'},
      {q: 'When a retired judge, a former cellist and her estranged twin inherit a vineyard in France, which is failing because of a blight, a lawsuit and a feud with a neighbour, they must save the harvest, settle the lawsuit and reconcile, or lose the land — but the neighbour is their father.', a: 0, why: 'Three protagonists, three problems. The last clause is the movie — start there.'}
    ]};

  D.enter = {title: 'Enter late, exit early', pass: 3, shuffle: false, intro: 'On every opening ask: can I start three lines later? On every ending: can I end three lines earlier?',
    items: [
      {q: '<ol class="scene-lines"><li>A knock. Tom opens the door.</li><li>TOM: Oh — hi. Come in.</li><li>JEN: Thanks. Nice place.</li><li>Tom pours two drinks.</li><li>JEN: I found your name in his phone.</li><li>Tom stops pouring.</li></ol>Which is the <b>first</b> line this scene actually needs?', options: ['1', '2', '3', '4', '5'], a: 3, why: 'Enter on line 4 — Tom already pouring, motion already happening — and let Jen\'s first line be the real negotiation. The knock and the greetings are an arrival (mistake #6).'},
      {q: '<ol class="scene-lines"><li>JEN: Did you know?</li><li>TOM: …Yes.</li><li>Jen picks up her coat.</li><li>JEN: I should go.</li><li>TOM: Jen, wait —</li><li>JEN: Goodbye, Tom.</li><li>She leaves. He stands there.</li></ol>Which is the <b>last</b> line this scene needs?', options: ['2', '3', '4', '6', '7'], a: 1, why: 'End on line 3. The change is "Yes"; the coat is her answer. Everything after is the goodbye nobody needs — the cut to the next scene carries her exit (mistake #7).'},
      {q: '<ol class="scene-lines"><li>Kenji wheels his bike into the garage.</li><li>He locks it to a pole.</li><li>He walks to the lift.</li><li>He checks the address on his phone. Checks the building.</li><li>He takes out an envelope. Looks at it one beat too long.</li><li>Goes in.</li></ol>Which is the <b>first</b> line this scene needs?', options: ['1', '2', '3', '4', '5'], a: 3, why: 'Line 4 — the uncertainty. Wheeling, locking and walking are an arrival. (the page in six shapes\'s version keeps the lock because it sits after the doubt: the pause becomes a decision.)'}
    ]};

  /* ══ writing the pages · the keys: a state-machine drill ══ */
  var ORDER = ['slug', 'action', 'char', 'paren', 'dia', 'trans'];
  var NAMES = {slug: 'Scene heading', action: 'Action', char: 'Character', paren: 'Parenthetical', dia: 'Dialogue', trans: 'Transition'};
  var TAB_FILLED = {action: 'char', dia: 'paren', char: 'paren', paren: 'dia', trans: 'slug', slug: 'slug'};
  var ENTER_EMPTY = {char: 'action', dia: 'action', paren: 'dia', slug: 'action', trans: 'slug', action: 'action'};
  var KEYQ = [
    ['slug', 'action', 1], ['action', 'char', 1], ['char', 'dia', 1], ['dia', 'char', 2], ['dia', 'paren', 1], ['paren', 'dia', 1],
    ['dia', 'action', 1], ['action', 'slug', 2], ['trans', 'slug', 1], ['slug', 'char', 2], ['dia', 'trans', 3], ['char', 'trans', 1, true]
  ];
  Z.tools.keys = function(el){
    el.innerHTML = '';
    var box = h('div.drill');
    var head = h('div.dr-head', null, h('div.dr-k', null, '◎ Drill · the keys'), h('b', null, 'Drive the state machine'), passBadge('keys'));
    box.appendChild(head);
    box.appendChild(h('p.dr-intro', {html: 'You have just finished typing a line in one element. Get to the next one with <kbd>Enter</kbd> and <kbd>Tab</kbd> (<kbd>Ctrl</kbd>/<kbd>Alt</kbd>+<kbd>1–6</kbd> also count, but try without). Fewest keys wins. Pass: all 12, total under 90 seconds.'}));
    var body = h('div.dr-body'); box.appendChild(body);
    body.appendChild(h('button.btn.primary', {type: 'button', onclick: run}, '▶ Start · 12 prompts'));
    el.appendChild(box);
    function run(){
      var order = shuffle(KEYQ.map(function(_, i){ return i; })), k = 0, extra = 0, t0 = Date.now(), st, keys, locked = false;
      body.innerHTML = '';
      var prog = h('div.dr-prog'), prompt = h('p.kq'), stage = h('div.kstage', {tabindex: 0, role: 'textbox', 'aria-label': 'Press Tab or Enter here'}), log = h('div.klog'), fb = h('div.dr-fb');
      body.appendChild(prog); body.appendChild(prompt); body.appendChild(stage); body.appendChild(log); body.appendChild(fb);
      function show(){
        var q = KEYQ[order[k]]; if (!q) return;
        locked = false;
        st = {t: q[0], filled: !q[3]}; keys = [];
        prog.textContent = (k + 1) + ' / 12';
        prompt.innerHTML = (q[3] ? 'You\'re on an <b>empty ' + NAMES[q[0]] + '</b> line.' : 'You just finished a <b>' + NAMES[q[0]] + '</b> line.') + ' Get to <b>' + NAMES[q[1]] + '</b>.';
        paint(); fb.innerHTML = ''; stage.focus();
      }
      function paint(){ stage.innerHTML = ''; stage.appendChild(h('span.kel', null, NAMES[st.t] + (st.filled ? ' — typed' : ' — empty line'))); log.textContent = keys.length ? keys.join(' → ') : 'press keys…'; }
      stage.onkeydown = function(e){
        var q = KEYQ[order[k]]; if (!q || locked) return;
        var key = null;
        if (e.key === 'Enter') { key = 'Enter'; st = st.filled ? {t: Z.ENTER_NEXT[st.t], filled: false} : {t: ENTER_EMPTY[st.t], filled: false}; }
        else if (e.key === 'Tab') { key = 'Tab'; st = st.filled ? {t: TAB_FILLED[st.t], filled: st.t === 'slug'} : {t: Z.TAB_EMPTY[st.t], filled: false}; }
        else if ((e.ctrlKey || e.altKey || e.metaKey) && /^[1-6]$/.test(e.key)) { key = (e.altKey ? 'Alt+' : 'Ctrl+') + e.key; st = {t: ORDER[+e.key - 1], filled: st.filled}; }
        else if (/^[a-z.]$/i.test(e.key) && st.t === 'action' && !st.filled && q[1] === 'slug') { /* typing int. converts */ key = 'type int.'; st = {t: 'slug', filled: true}; }
        if (!key) return;
        e.preventDefault();
        keys.push(key); paint();
        if (st.t === q[1]) {
          var over = keys.length - q[2]; extra += Math.max(0, over);
          fb.innerHTML = '';
          var hintTxt = {'dia>char': ' (Enter, then Tab).', 'action>slug': ' (Enter, then type int. — or Ctrl+1).', 'dia>trans': ' (Enter, Tab, Tab — or Ctrl+6).', 'slug>char': ' (Enter, then Tab).'}[q[0] + '>' + q[1]] || '.';
          fb.appendChild(h('p.' + (over <= 0 ? 'ok' : 'miss'), null, over <= 0 ? '✓ ' + keys.join(' → ') + ' — the shortest way.' : '✓ Got there in ' + keys.length + '; the shortest is ' + q[2] + hintTxt));
          locked = true;   /* a stray key during the pause used to skip a prompt */
          k++;
          if (k < order.length) setTimeout(show, over <= 0 ? 450 : 1400); else setTimeout(done, 700);
        } else if (keys.length > 6) {
          fb.innerHTML = ''; fb.appendChild(h('p.miss', {html: 'Lost? Check the <a class="xref" href="#d3-the-state-machine--the-whole-mechanical-skill">state machine table</a>. Resetting this one.'}));
          extra += 3; locked = true; setTimeout(show, 1200);
        }
      };
      function done(){
        var secs = Math.round((Date.now() - t0) / 1000), pass = secs <= 90 && extra <= 2;
        SC.record('keys', 12 - Math.min(12, extra), 12, pass, {secs: secs});
        body.innerHTML = '';
        body.appendChild(h('p.dr-score', {html: '<b>12 / 12</b> reached in ' + secs + ' s with ' + Z.plural(extra, 'extra key') + (pass ? ' — <span class="ok">passed.</span>' : ' — pass is under 90 s and no more than 2 extra keys.')}));
        body.appendChild(h('div.wb-row', null, h('button.btn.primary', {type: 'button', onclick: run}, '↻ Again')));
        head.replaceChild(passBadge('keys'), head.lastChild);
      }
      show();
    }
  };

  /* ══ writing the pages / L2 · the slug sprint ══ */
  var SLUGQ = [
    ['Inside a laundromat, daytime.', [/^INT\. LAUNDROMAT - DAY$/]],
    ['Outside a parking garage, at night.', [/^EXT\. PARKING GARAGE - NIGHT$/]],
    ['The cafeteria of a hospital, daytime.', [/^INT\. HOSPITAL( -)? CAFETERIA - DAY$/]],
    ['Inside a moving car, at night.', [/^INT\. CAR( - MOVING)? - NIGHT$/, /^INT\. MOVING CAR - NIGHT$/]],
    ['The server room, at night.', [/^INT\. SERVER ROOM - NIGHT$/]],
    ['A call centre, late at night.', [/^INT\. CALL CENT(ER|RE) - (LATE )?NIGHT$/]],
    ['Eli\'s childhood bedroom, in the afternoon.', [/^INT\. (ELI'?S )?CHILDHOOD BEDROOM - (AFTERNOON|DAY)$/]],
    ['The same kitchen — the action flows straight on from the last scene.', [/^INT\. KITCHEN - CONTINUOUS$/]],
    ['The porch of a farmhouse at dawn — the light itself is the point.', [/^EXT\. FARMHOUSE( -)? PORCH - DAWN$/]],
    ['A beach, daytime, in a flashback to 1999.', [/^EXT\. BEACH - DAY \(FLASHBACK( -)? 1999\)$/, /^EXT\. BEACH - DAY - FLASHBACK - 1999$/, /^EXT\. BEACH - DAY \(1999\)$/]]
  ];
  function normSlug(s){
    return s.toUpperCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().replace(/\s*[-–—]{1,2}\s*/g, ' - ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/\s+/g, ' ');
  }
  function slugWhy(raw, n){
    if (!/^(INT|EXT)/.test(n)) return 'Start with INT. (inside) or EXT. (outside).';
    if (/^(INT|EXT)(?!\.)/.test(n)) return 'INT. and EXT. keep their periods.';
    if (!/ - /.test(n)) return 'Separate the parts with space-hyphen-space, and end with the time.';
    if (/[.,;:!?]$/.test(n)) return 'No ending punctuation.';
    if (/ - (DAY|NIGHT)$/.test(n) === false && !/ - (MORNING|AFTERNOON|EVENING|DAWN|DUSK|CONTINUOUS|LATER|LATE NIGHT)/.test(n)) return 'End with the time of day.';
    return 'Close — compare with the model heading.';
  }
  Z.tools.slugsprint = function(el){
    el.innerHTML = '';
    var box = h('div.drill');
    var head = h('div.dr-head', null, h('div.dr-k', null, '◎ Drill · L2'), h('b', null, 'The slug sprint'), passBadge('slugs'));
    box.appendChild(head);
    box.appendChild(h('p.dr-intro', null, 'Ten places in plain English. Type each scene heading. Pass bar (format course L2): all ten, zero errors, under 3 minutes.'));
    var body = h('div.dr-body'); box.appendChild(body);
    body.appendChild(h('button.btn.primary', {type: 'button', onclick: run}, '▶ Start the clock'));
    el.appendChild(box);
    function run(){
      var k = 0, errors = 0, t0 = Date.now();
      body.innerHTML = '';
      var tEl = h('span.big-timer', null, '0:00'), tm = Z.timer({el: tEl, seconds: 0}); tm.start();
      var prog = h('div.dr-prog'), q = h('p.kq'), inp = h('input.slugin', {type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Scene heading'}), fb = h('div.dr-fb');
      body.appendChild(h('div.wb-row', null, tEl, prog)); body.appendChild(q); body.appendChild(inp); body.appendChild(fb);
      function show(){ prog.textContent = (k + 1) + ' / ' + SLUGQ.length + ' · errors ' + errors; q.textContent = SLUGQ[k][0]; inp.value = ''; inp.focus(); }
      inp.addEventListener('input', function(){ var p = inp.selectionStart; inp.value = inp.value.toUpperCase(); inp.setSelectionRange(p, p); });
      inp.addEventListener('keydown', function(e){
        if (e.key !== 'Enter') return; e.preventDefault();
        var n = normSlug(inp.value);
        if (!n) return;
        var ok = SLUGQ[k][1].some(function(re){ return re.test(n); });
        fb.innerHTML = '';
        if (ok) { fb.appendChild(h('p.ok', null, '✓ ' + n)); k++; if (k < SLUGQ.length) show(); else done(); }
        else { errors++; prog.textContent = (k + 1) + ' / ' + SLUGQ.length + ' · errors ' + errors; fb.appendChild(h('p.miss', null, '✗ ' + slugWhy(inp.value, n) + ' Try again.')); }
      });
      function done(){
        tm.pause(); var secs = Math.round((Date.now() - t0) / 1000), pass = errors === 0 && secs < 180;
        SC.record('slugs', SLUGQ.length - Math.min(SLUGQ.length, errors), SLUGQ.length, pass, {secs: secs});
        body.innerHTML = '';
        body.appendChild(h('p.dr-score', {html: '<b>' + SLUGQ.length + ' headings</b> in ' + secs + ' s, ' + Z.plural(errors, 'error') + (pass ? ' — <span class="ok">L2 passed.</span>' : ' — L2 is zero errors under 3 minutes.')}));
        body.appendChild(h('div.wb-row', null, h('button.btn.primary', {type: 'button', onclick: run}, '↻ Again')));
        head.replaceChild(passBadge('slugs'), head.lastChild);
      }
      show();
    }
  };

    var PATTERNS = [
    ['01', 'The Delivery', 'Someone brings news; the recipient already knows; neither acknowledges it', 'Door already open, news implied by posture'],
    ['02', 'The Request', 'A needs something B will give only under conditions A can\'t meet', 'Mid-negotiation, first offer already failed'],
    ['03', 'The Interruption', 'A third person forces a second conversation on top of a private one', 'The private conversation at its most vulnerable'],
    ['04', 'The Discovery', 'Finding what they shouldn\'t — and deciding whether to pretend they didn\'t', 'The moment of finding, not the approach'],
    ['05', 'The Apology That Isn\'t', 'Technically correct, emotionally absent', 'The end of the apology — the other face'],
    ['06', 'The Test', 'One evaluates the other; both know; neither says so', 'The test already running'],
    ['07', 'The Clock', 'A simple task before a deadline; one thing keeps going wrong', 'The first thing going wrong, never the setup'],
    ['08', 'The Return', 'Back after a long absence; the place or person has changed', 'The first moment the change is visible to them'],
    ['09', 'The Reveal', 'Information recontextualizes everything; no immediate reaction', 'Just before it arrives; leave before the reaction completes'],
    ['10', 'The Standoff', 'Incompatible wants; neither moves first; an object between them', 'The silence after the last move failed'],
    ['11', 'The Performance', 'Presenting / lying / celebrating / grieving in a way they don\'t feel', 'Performance already underway'],
    ['12', 'The Witness', 'Watching what they shouldn\'t see; can\'t intervene, can\'t look away', 'The thing already happening'],
    ['13', 'The Handoff', 'Responsibility passes; only one understands its full weight', 'The handoff itself'],
    ['14', 'The Pretense', 'Two pretend a conversation never happened; a third almost notices', 'Pretense in full operation'],
    ['15', 'The Last Chance', 'A door is closing; one thing left to say, almost unsaid', 'The door already in motion'],
    ['16', 'The Replacement', 'Doing what someone else used to do — and not quite managing', 'The attempt already underway and already failing'],
    ['17', 'The Agreement', 'Both agree; only one means it; the scene is the gap', 'The agreement being sealed'],
    ['18', 'The Wait', 'Something small keeps almost happening and then not happening', 'Mid-wait, after the first near-miss'],
    ['19', 'The Wrong Room', 'Somewhere they don\'t belong, trying to look like they do', 'Already inside'],
    ['20', 'The Goodbye', 'Only one knows it\'s for good', 'Mid-goodbye, the ritual already in progress']
  ];
  var CONSTRAINTS = [
    ['A', 'The 1-page scene', 'Exactly one page — no more, no less.', function(b){ var p = Z.paginate(b).exact; return p >= 0.85 && p <= 1.1; }, 'Between 0.85 and 1.1 pages'],
    ['B', 'Dialogue-only', 'Zero action lines except the heading. Dialogue and parentheticals only.', function(b){ return b.filter(function(x){ return x.t === 'dia' && x.x.trim(); }).length >= 4 && !b.some(function(x){ return x.t === 'action' && x.x.trim(); }); }, 'No action lines · at least 4 speeches'],
    ['C', 'Action-only', 'Zero dialogue. The whole conflict in behavior and objects.', function(b){ return b.filter(function(x){ return x.t === 'action' && x.x.trim(); }).length >= 4 && !b.some(function(x){ return x.t === 'dia' && x.x.trim(); }); }, 'No dialogue · at least 4 action lines'],
    ['D', 'Enter impossibly late', 'Start two-thirds through the conflict; the reader infers what came before.', null, 'Self-check: could you start three lines later still?'],
    ['E', 'The reversal', 'Take a scene you wrote; swap who has power at the start vs. the end.', null, 'Self-check: who holds power on line 1? On the last line?'],
    ['F', 'Six lines', 'Max six spoken lines in total (the P2 short #2 constraint).', function(b){ var n = b.filter(function(x){ return x.t === 'dia' && x.x.trim(); }).length; return n >= 1 && n <= 6; }, '1–6 speeches']
  ];
  Z.PATTERNS = PATTERNS;
  Z.startPatternDrill = function(pNum, cLetter, mins){
    var p = PATTERNS.filter(function(x){ return x[0] === pNum; })[0] || PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    var c = CONSTRAINTS.filter(function(x){ return x[0] === cLetter; })[0] || null;
    var idea = Z.ladder && Z.ladder.active();
    var title = 'Drill · ' + p[0] + ' ' + p[1] + (c ? ' · ' + c[1] : '');
    var sc = Z.page.create(title, [{t: 'slug', x: '', n: 'PATTERN ' + p[0] + ' — ' + p[2] + ' · ENTER AT: ' + p[3] + (c ? ' · CONSTRAINT: ' + c[2] : '')}]);
    var items = [
      {label: 'A heading (Alt+1)', test: function(b){ return b.some(function(x){ return x.t === 'slug' && /^(INT|EXT)\./.test(x.x); }); }},
      {label: 'First line already in motion — enter at: <i>' + Z.esc(p[3]) + '</i>', test: function(b){ var i = b.findIndex(function(x){ return x.t === 'slug'; }); return i > -1 && b[i + 1] && b[i + 1].x.trim().length > 3; }},
      {label: 'Something is different at the end (you judge — tick it in your head)', optional: true, test: function(){ return false; }}
    ];
    if (c && c[3]) items.push({label: c[4], test: c[3]});
    else if (c) items.push({label: c[4], optional: true, test: function(){ return false; }});
    items.push({label: 'The doctor finds nothing to fix', test: function(b){ return Z.doctor.runRaw(b, {}).filter(function(x){ return x.sev === 'fix'; }).length === 0 && b.length > 3; }});
    Z.page.open({scriptId: sc.id, coach: {
      title: p[0] + ' · ' + p[1] + (c ? ' + ' + c[0] + ' · ' + c[1] : ''),
      sub: p[2] + (idea ? ' — try it with the people from “' + idea.t + '”' : ''),
      seconds: (mins || 20) * 60, items: items,
      onComplete: function(){ Z.toast('Every checkable box is green. Read it once aloud — then call it done.', {ok: true, ms: 5000}); SC.record('pattern', 1, 1, true); }
    }});
  };/* ══ dialogue and subtext · rewrite drills (self-checked, with a model) ══ */
  var REW = {
    compress: [
      {slug: 'INT. HOSPITAL CAFETERIA - DAY', text: 'The hospital cafeteria is a large, brightly lit room full of tables. We see doctors and nurses eating quickly, because they are very busy people. At one table in the corner, Claire, who is a nurse in her fifties, begins to slowly unwrap a sandwich that she clearly does not really want to eat. She looks tired and sad, and she is thinking about her daughter.', target: 30,
       model: 'Doctors and nurses eat fast. In the corner, CLAIRE (50s, still in scrubs) unwraps a sandwich. Doesn\'t eat it. Checks her phone. Nothing.'},
      {slug: 'EXT. PARKING GARAGE - NIGHT', text: 'It is nighttime in the parking garage and it is very dark and quiet. Kenji, a young bike messenger in his twenties who is wearing his messenger gear, slowly rides his very expensive bike into the garage and comes to a stop. He starts to look at his phone to check the address, and then he looks up at the building nervously.', target: 28,
       model: 'KENJI (20s, messenger gear, a bike that costs more than his apartment) wheels to a stop. Checks the address on his phone. Checks the building.'}
    ],
    subtext: [
      {text: 'SARA: I\'m worried about you. You\'re not eating and you look terrible.\nLEO: I\'m depressed because I lost my job and I\'m ashamed to tell anyone.',
       model: 'SARA: You eat today?\nLEO: There\'s a rest stop at exit 14.\nSARA: I wasn\'t asking about the rest stop.\n(A long beat. Highway lights sweep the glass.)\nLEO: I had a granola bar.', move: 'deflection'},
      {text: 'NORA: I only came because I felt guilty, not because I wanted to.\nCLAIRE: I know, and it hurts me that you don\'t love me enough to come on your own.',
       model: 'CLAIRE: You didn\'t have to come all this way.\nNORA: I know I didn\'t.\n(Claire straightens a fork.)\nCLAIRE: You didn\'t bring much.\nNORA: I brought enough.', move: 'proxy object + subject change'},
      {text: 'BOSS: I\'m letting you go because you made the company look bad.\nEMPLOYEE: I think that\'s unfair and I\'m furious with you.',
       model: 'BOSS: We\'re restructuring the team.\nEMPLOYEE: Of course. Makes total sense. Should I clear my desk now, or finish the report you\'ll present on Friday?', move: 'over-agreement'}
    ]
  };
  Z.tools.rewrite = function(el){
    var kind = el.dataset.kind, set = REW[kind], idx = 0;
    el.innerHTML = '';
    var box = h('div.drill');
    var id = 'rw-' + kind;
    var head = h('div.dr-head', null, h('div.dr-k', null, '◎ Rewrite drill'), h('b', null, kind === 'compress' ? 'Compression — cut it to the target' : 'Subtext — nobody says what they mean'), passBadge(id));
    box.appendChild(head);
    var body = h('div.dr-body'); box.appendChild(body);
    el.appendChild(box);
    function show(){
      var it = set[idx]; body.innerHTML = '';
      if (kind === 'compress') {
        body.appendChild(h('p.dr-intro', {html: 'Cut this to <b>' + it.target + ' words or fewer</b> without losing anything a camera could photograph. Four cuts, in order: the restatement · the adverb · the throat-clear · the instruction. (' + (idx + 1) + ' of ' + set.length + ')'}));
        body.appendChild(h('pre.dr-line', null, it.slug + '\n\n' + Z.wrapLines(it.text, 60).join('\n')));
      } else {
        body.appendChild(h('p.dr-intro', {html: 'Rewrite this so neither character says the real thing. Use any of the five moves. Behavior and silence count as lines. (' + (idx + 1) + ' of ' + set.length + ')'}));
        body.appendChild(h('pre.dr-line', null, it.text));
      }
      var key = 'rw:' + kind + ':' + idx;
      var ta = h('textarea.rw', {rows: kind === 'compress' ? 4 : 6, placeholder: kind === 'compress' ? 'Your version of the action paragraph…' : 'SARA: …\nLEO: …'});
      ta.value = Z.store.get(key) || '';
      ta.addEventListener('input', Z.saveSoon(function(){ Z.store.set(key, ta.value); }, 400, 2000));
      var meter = h('div.rw-meter'); body.appendChild(ta); body.appendChild(meter);
      var out = h('div.rw-out'); body.appendChild(out);
      function measure(){
        meter.innerHTML = '';
        var v = ta.value;
        if (kind === 'compress') {
          var wc = Z.words(v), checks = [
            [wc <= it.target && wc > 0, wc + ' / ' + it.target + ' words'],
            [!/\bwe (see|hear|watch)\b/i.test(v), 'no "we see"'],
            [!/\b(begins?|starts?|proceeds?) to\b/i.test(v), 'no "begins to / starts to"'],
            [!/\b(very|really|slowly|quickly|clearly|nervously)\b/i.test(v), 'no easy adverbs (very, really, slowly…)'],
            [!/\b(is thinking|thinks|feels?|sad|tired|nervous)\b/i.test(v), 'no inner states'],
            [!new RegExp('\\b' + it.slug.replace(/^(INT|EXT)\. /, '').replace(/ - .*$/, '').split(' ').pop() + '\\b', 'i').test(v.split(/[.!?]/)[0] || ''), 'no restatement of the heading']
          ];
          checks.forEach(function(c){ meter.appendChild(h('span.' + (c[0] ? 'ok' : 'warn'), null, (c[0] ? '✓ ' : '· ') + c[1])); });
        } else {
          var nose = /\b(i('m| am)? ?(feel|felt|depressed|ashamed|angry|furious|hurt|worried|guilty|sad|love|hate)|because|makes me)\b/i.test(v);
          meter.appendChild(h('span.' + (!nose && v.trim() ? 'ok' : 'warn'), null, !v.trim() ? '· write it first' : (nose ? '· a line still states a feeling or a reason' : '✓ no line states the feeling')));
        }
      }
      ta.addEventListener('input', Z.debounce(measure, 200)); measure();
      body.appendChild(h('div.wb-row', null,
        h('button.btn.primary', {type: 'button', onclick: function(){
          out.innerHTML = '';
          out.appendChild(h('div.rw-model', null, h('b', null, 'One professional version' + (it.move ? ' (' + it.move + ')' : '') + ':'), h('pre.dr-line', null, it.model)));
          out.appendChild(h('p.dr-intro', null, 'Yours doesn\'t have to match. Did you keep everything a camera could see, and lose everything it couldn\'t?'));
          out.appendChild(h('div.wb-row', null,
            h('button.btn', {type: 'button', onclick: function(){ grade(1); }}, '✓ Mine works'),
            h('button.btn', {type: 'button', onclick: function(){ grade(0.5); }}, '≈ Half there'),
            h('button.btn', {type: 'button', onclick: function(){ grade(0); }}, '✗ Not yet')));
        }}, 'Compare with a model'),
        idx + 1 < set.length ? h('button.btn', {type: 'button', onclick: function(){ idx++; show(); }}, 'Skip to the next →') : null));
    }
    var got = 0;
    function grade(g){
      got += g;
      if (idx + 1 < set.length) { idx++; show(); return; }
      SC.record(id, got, set.length, got >= set.length - 0.5);
      body.innerHTML = '';
      body.appendChild(h('p.dr-score', {html: 'Self-score <b>' + got + ' / ' + set.length + '</b>. Now do the same to one paragraph of your own pages — the arithmetic rule: draft 2 = draft 1 minus ten per cent.'}));
      body.appendChild(h('div.wb-row', null, h('button.btn.primary', {type: 'button', onclick: function(){ idx = 0; got = 0; show(); }}, '↻ Again')));
      head.replaceChild(passBadge(id), head.lastChild);
    }
    show();
  };

  Z.tools.spinner = function(el){
    el.innerHTML = '';
    var box = h('div.drill');
    box.appendChild(h('div.dr-head', null, h('div.dr-k', null, '◎ Practice'), h('b', null, 'Spin a scene drill'), passBadge('pattern')));
    box.appendChild(h('p.dr-intro', null, 'A random engine from the twenty patterns, plus a constraint. It opens a fresh page with a timer and a live checklist. Plug in your own characters — the structure is done.'));
    var out = h('div.spin-out'); box.appendChild(out);
    var pSel = h('select', {'aria-label': 'Pattern'}, h('option', {value: ''}, 'random pattern'), PATTERNS.map(function(p){ return h('option', {value: p[0]}, p[0] + ' ' + p[1]); }));
    var cSel = h('select', {'aria-label': 'Constraint'}, h('option', {value: '?'}, 'random constraint'), h('option', {value: ''}, 'no constraint'), CONSTRAINTS.map(function(c){ return h('option', {value: c[0]}, c[0] + ' · ' + c[1]); }));
    var mSel = h('select', {'aria-label': 'Minutes'}, [10, 20, 30].map(function(m){ return h('option', {value: m, selected: m === 20}, m + ' min'); }));
    box.appendChild(h('div.wb-row', null, pSel, cSel, mSel,
      h('button.btn', {type: 'button', onclick: spin}, '⟳ Spin'),
      h('button.btn.primary', {type: 'button', onclick: go}, '✎ Write it now')));
    el.appendChild(box);
    var cur = null;
    function spin(){
      var p = pSel.value ? PATTERNS.filter(function(x){ return x[0] === pSel.value; })[0] : PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
      var cv = cSel.value === '?' ? CONSTRAINTS[Math.floor(Math.random() * CONSTRAINTS.length)][0] : cSel.value;
      var c = CONSTRAINTS.filter(function(x){ return x[0] === cv; })[0];
      cur = {p: p[0], c: c ? c[0] : ''};
      out.innerHTML = '';
      out.appendChild(h('div.spin-card', null, h('b', null, p[0] + ' · ' + p[1]), h('p', null, p[2]), h('p', null, h('span', null, 'Enter at: '), p[3]), c ? h('p', null, h('span', null, 'Constraint ' + c[0] + ': '), c[2]) : null));
    }
    function go(){
      /* a chosen pattern or constraint counts even without pressing Spin */
      if (!cur || (pSel.value && pSel.value !== cur.p) || (cSel.value !== '?' && cSel.value !== cur.c)) spin();
      Z.startPatternDrill(cur.p, cur.c, +mSel.value);
    }
    pSel.addEventListener('change', spin);
    cSel.addEventListener('change', spin);
    spin();
  };
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-go-drill]'); if (!b) return;
    Z.startPatternDrill(b.dataset.goDrill, '', 20);
  });

  /* ══ the page in six shapes · retype the laundromat scene from memory ══ */
  Z.retypeDrill = function(){
    var pre = Z.$('#six-shapes pre.script');
    var model = pre ? Z.blocksFromPre(pre) : [];
    var sc = Z.page.create('Drill · laundromat from memory', [{t: 'slug', x: ''}]);
    var t0 = Date.now();
    Z.page.open({scriptId: sc.id, coach: {
      title: 'Retype the laundromat scene — from memory',
      sub: 'Don\'t peek. Six shapes, ten lines. Pass (L1): shapes 10/10, words ≥ 90%, under 4 minutes.',
      seconds: 0,
      note: 'Keys: <kbd>Alt+1</kbd> heading · <kbd>Enter</kbd> action · <kbd>Tab</kbd> character · <kbd>Enter</kbd> dialogue · <kbd>Tab</kbd> in dialogue = parenthetical · <kbd>Alt+6</kbd> transition.',
      actions: [{label: 'Compare with the original', primary: true, fn: function(api, timer){
        var secs = Math.round((Date.now() - t0) / 1000);
        if (timer) timer.pause();
        var r = api.compare(model, {title: 'Laundromat — the original vs yours'});
        var pass = r.shapes >= model.length && r.wordPct >= 90 && secs < 240;
        SC.record('retype', r.shapes, model.length, pass, {secs: secs, words: r.wordPct});
        Z.toast((pass ? 'L1 passed — ' : '') + r.label + ' · ' + secs + ' s', {ok: pass, ms: 6000});
      }}]
    }});
  };
})();
