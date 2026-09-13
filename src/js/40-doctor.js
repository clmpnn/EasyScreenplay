/* ══ 40 · the format doctor ═════════════════════════════════════════════
   Runs the twelve mistakes's twelve craft mistakes (the nine a machine can see), Riley's
   presentation rules from the rulebook, and the dialogue and subtext search-and-destroy list
   against the pages on the practice page. Every hit names the rule and the
   step it comes from. It flags; you decide — "check" means look, not fix.  */
(function(){
  /* A name is bounded by anything that is not a letter or a digit — in any
     alphabet. \b only knows ASCII, so ÉLODIE could never be found in an action
     line. Lookbehind is used where the browser has it (everything current), and
     where it does not we fall back to \b rather than to nothing. */
  var UNI = (function(){ try { new RegExp('(?<![\\p{L}\\p{N}])x', 'u'); return true; } catch (e) { return false; } })();
  function nameRe(n, flags){
    return UNI
      ? new RegExp('(?<![\\p{L}\\p{N}])' + n + '(?![\\p{L}\\p{N}])', flags + 'u')
      : new RegExp('\\b' + n + '\\b', flags);
  }
  var L = function(step, text){ return '<a href="#' + step + '" class="xref" data-close-page="1">' + text + '</a>'; };
  var FUNC = /^(MAN|WOMAN|GUY|GIRL|BOY|KID|LADY|OLD MAN|OLD WOMAN|YOUNG MAN|YOUNG WOMAN|WAITER|WAITRESS|DRIVER|COP|OFFICER|GUARD|NURSE|DOCTOR|CLERK|MANAGER|BOSS|STRANGER|VOICE|CUSTOMER|BARTENDER|RECEPTIONIST|SECRETARY|SOLDIER|TEACHER|STUDENT|PASSENGER|WITNESS|NEIGHBOU?R|DELIVERY GUY|ANGRY WOMAN|ANGRY MAN|SALESMAN|SALESWOMAN|CASHIER|HOST|HOSTESS|REPORTER|ANNOUNCER|OPERATOR|DISPATCHER|WORKER|TECH|PARAMEDIC)( ?#?\d+)?$|#\d+$/;
  var ED_OK = /^(need|feed|seed|speed|bleed|breed|proceed|exceed|succeed|red|bed|shed|wed|embed|shred|sled|steed|creed|deed|heed|weed|reed|tweed|naked|wicked|sacred|hundred|crooked|rugged|ragged|beloved|aged|blessed|ted|fred|ned|jared|ahmed|mohammed|muhammad)$/i;
  var STARTERS = /^(The|A|An|Then|Now|And|But|Her|His|Their|This|That|These|Those|Its|Our|Your|My|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Every|Each|All|Some|No|Just|Still|Only|Behind|Before|After|Inside|Outside|Across|Beyond|Through|Under|Over|Above|Below|Somewhere|Nobody|Everyone|Someone|Nothing|Everything|Something)$/;
  var PAST_IRREG = 'was|were|had|did|went|came|took|saw|said|stood|sat|ran|made|got|put|left|felt|knew|thought|told|began|found|gave|held|kept|brought|spoke|heard|wore|drove|threw|caught|fell|rose|shook|sang|swam|drank|ate|won|lost|sent|spent|built|bought|sold|paid|meant|led|lay|laid|hid|bit|broke|chose|forgot|froze|stole|woke|wrote';
  var PAST_PRON = new RegExp('\\b(he|she|they|we|i|it)\\s+(\\w+ed|' + PAST_IRREG + ')\\b', 'i');
  var PAST_NAME = new RegExp('\\b([A-Z][a-z]{2,}|[A-Z]{2,})\\s+(\\w{2,}ed|' + PAST_IRREG + ')\\b');
  var INNER = /\b(feels?|felt|realiz(e|es|ed|ing)|realis(e|es|ed|ing)|thinks?|thought|wonders?|remembers?|decides?|wants to|hopes?|wishes|can'?t help but|is (so |very |really |quite )?(nervous|anxious|angry|sad|happy|furious|excited|hopeful|scared|afraid|overwhelmed|upset|worried|jealous|confused|relieved|bored|embarrassed|ashamed|proud|lonely|desperate|determined|devastated|heartbroken|terrified|frustrated|disappointed|in love)|seems? (nervous|anxious|angry|sad|happy|upset|worried|confused))\b/i;
  var CAMERA_HARD = /\b(close[- ]?up|close on|angle on|wide on|wide shot|medium shot|long shot|tracking shot|two[- ]shot|pan(s|ning)? (to|across|over|up|down)|zoom(s|ing)? (in|out|to|on)|dolly|crane (up|down|shot)|tilt(s|ing)? (up|down)|push(es)? in|pull(s)? back|over the shoulder|reverse angle|extreme close|camera)\b/i;
  var CAMERA_SOFT = /\b(pov|insert)\b/i;
  var WE = /\bwe (see|hear|watch|can see|can hear|notice|follow|find|move|pan|glimpse|catch)\b/i;
  var INSTR = /\b(begins? to|began to|starts? to|started to|proceeds? to|continues? to)\b/i;
  var EXPO = /\b(as you know|remember when|you have to understand|the thing is|ever since|let me explain|i'?ve never told anyone|i have never told anyone)\b/i;
  var NOSE = /\b(I (feel|felt)\b|I'?m (so |really |very |just )?(angry|sad|happy|scared|nervous|excited|hurt|jealous|lonely|afraid|furious|upset|worried|anxious|disappointed|frustrated|devastated|heartbroken|terrified|ashamed|proud)\b|I am (so |really |very |just )?(angry|sad|happy|scared|nervous|excited|hurt|jealous|lonely|afraid|furious|upset|worried|anxious|disappointed|frustrated|devastated|heartbroken|terrified|ashamed|proud)\b|I (want|need) you to know|makes me feel|I have always (wanted|had|felt|believed)|deep passion|passionate about)/i;
  var HELLO = /^(hi|hello|hey|good (morning|afternoon|evening)|how are you|how('s| is) it going)\b/i;
  var BYE = /(^|\s)(bye|goodbye|good-bye|see you( later| tomorrow| soon)?|take care|good ?night|talk soon)[.!]*$/i;
  var DEVICE = /\b(phone|cell|mobile|speaker|speakerphone|voicemail|answering machine|radio|tv|television|intercom|walkie|zoom|video call|laptop|screen|recording|tape|pa system|loudspeaker)\b/i;
  var ADVERB_OK = /^(only|family|early|really|belly|fly|reply|italy|holy|silly|lonely|friendly|ugly|elderly|lovely|likely|daily|weekly|monthly|yearly|july|ally|rally|bully|jelly|lily|curly|hilly|jolly|oily|smelly|wooly|woolly|chilly|costly|deadly|kindly|lively|lowly|sickly|surly|burly|comely|homely|manly|orderly|portly|stately|timely|unlikely|wobbly|bubbly|sly|supply|apply|imply|comply|multiply|reply|rely|anomaly|assembly|butterfly|dragonfly|firefly|melancholy|monopoly|panoply|emily|kelly|molly|polly|sally|holly|billy|willy|lilly|shelly|beverly|kimberly|ashley|bradley|stanley|wesley|oakley|hurley)$/i;
  var EMOJI; try { EMOJI = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { EMOJI = /[☀-➿]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/; }
  var CAPS_OK = /^(I|OK|TV|INT|EXT|US|UK|USA|FBI|CIA|NYPD|LAPD|DNA|CEO|COO|CFO|CTO|IT|AI|PC|ID|ER|ICU|DJ|MRI|CPR|ATM|GPS|PDF|USB|LED|SUV|RV|AM|PM|NY|LA|DC|HQ|VO|OS|RSVP|ASAP|FAQ|URL|HTTP|SMS|OMG|LOL|MAYDAY|SOS)$/;

  function snip(s, re){
    s = String(s);
    var m = re ? s.match(re) : null, at = m ? s.indexOf(m[0]) : 0;
    var a = Math.max(0, at - 24), b = Math.min(s.length, at + (m ? m[0].length : 0) + 36);
    return (a ? '…' : '') + s.slice(a, b) + (b < s.length ? '…' : '');
  }
  function lev(a, b){
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    return d[m][n];
  }
  function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* rule table: id, sev, cat, mistake (the twelve mistakes #), title, why */
  var R = {
    wall:     ['fix',   'action',   1,  'Wall of gray — an action block over 4 lines', 'One beat per paragraph, ≤4 lines. White space is pacing. (' + L('mistakes', 'mistake #1') + ')'],
    wesee:    ['fix',   'action',   2,  '"We see / we hear"', 'Delete the instruction and show the thing: not "We see Marcus walk" but "Marcus walks." (' + L('mistakes', 'mistake #2') + ')'],
    camera:   ['fix',   'action',   2,  'Camera direction', 'Omit from a spec — the director picks the shots. Imply the angle through what the action looks at. (' + L('b1-writing-rules', 'the rulebook') + ')'],
    camsoft:  ['check', 'action',   0,  'POV / INSERT', 'Legitimate in special situations (' + L('b2-special-situations--the-lookup-shelf', 'the lookup shelf') + ') — make sure you need it.'],
    inner:    ['check', 'action',   3,  'Inner state — could a camera film it?', 'The camera test: replace the feeling with behavior. "She is furious" → "She closes the folder. Doesn\'t look at him." (' + L('six-shapes', 'the page in six shapes') + ', ' + L('mistakes', 'mistake #3') + ')'],
    past:     ['check', 'action',   0,  'Possible past tense', 'Action is always present tense: "Will steps", never "Will stepped". Riley\'s clearest tip-off that a writer is new. (' + L('b7-the-twelve-deadly-mistakes--rileys-list-in-full', 'Riley #12') + ')'],
    instr:    ['check', 'action',   0,  '"begins to / starts to"', 'The instruction cut: she does not begin to open the door. She opens the door. (' + L('c6-compression--the-single-most-transferable-skill', 'Compression') + ')'],
    adverb:   ['info',  'action',   0,  'Adverbs in action', '"Walks quickly" is "hurries". The adverb is usually there because the verb is weak. (' + L('c6-compression--the-single-most-transferable-skill', 'Compression') + ')'],
    shout:    ['check', 'action',   0,  'The page is shouting — too many CAPS', 'CAPS have three uses only: a speaking character\'s first appearance, sounds, camera (which you don\'t write). (' + L('b1c-capitals-and-parentheticals--the-two-rules-writers-break-first', 'the rulebook') + ')'],
    introcaps:['check', 'format',   0,  'First appearance not in CAPS', 'Introduce a speaking character in CAPS, once, the first time we see them: NAME (age, trait) + a defining action. (' + L('b1-writing-rules', 'the rulebook') + ')'],
    nointro:  ['info',  'format',   0,  'Speaks before we meet them', 'Give them an entrance in action first — NAME (30s, one castable trait) does something. Voices on phones and V.O. are exempt.'],
    capsagain:['info',  'format',   0,  'Name in CAPS again after the intro', 'Only the first appearance is capitalised. After that, normal case.'],
    nose:     ['check', 'dialogue', 4,  'On-the-nose line', 'A character is saying exactly what they feel. Subtext swap: what would they say instead of what they mean? (' + L('c2-the-five-subtext-moves', 'the five subtext moves') + ')'],
    expo:     ['check', 'dialogue', 4,  'Search-and-destroy phrase', 'Usually a confession that you didn\'t know how else to get the fact in. Turn the fact into ammunition. (' + L('a5-exposition--the-hardest-invisible-skill', 'Exposition') + ')'],
    speech:   ['check', 'dialogue', 0,  'Speech over 4 lines', 'Speeches rarely run over 4 lines. Cut the first line on suspicion — it\'s usually throat-clearing. (' + L('words', 'dialogue and subtext') + ')'],
    hello:    ['check', 'dialogue', 6,  'Scene opens on a greeting', 'Late-arriving scene: cut to the first line of the real negotiation. (' + L('mistakes', 'mistake #6') + ')'],
    bye:      ['check', 'dialogue', 7,  'Scene ends on a goodbye', 'Overstayed ending: end on the last line where something changed. (' + L('mistakes', 'mistake #7') + ')'],
    func:     ['info',  'format',   10, 'Functional name', 'Fine for a one-line bit part. A character with real lines deserves a name. (' + L('mistakes', 'mistake #10') + ')'],
    oswrong:  ['check', 'format',   11, '(O.S.) on a phone, TV or recording?', 'O.S. is only for someone physically in the scene but out of frame. Phones, TVs, radios, voicemail, narrators: V.O. (' + L('b1-writing-rules', 'the rulebook') + ')'],
    names:    ['fix',   'format',   12, 'Inconsistent character name', 'The same person spelled two ways reads as two people. Pick one. (' + L('mistakes', 'mistake #12') + ')'],
    contd:    ['fix',   'format',   12, 'Typed (MORE) / (CONT\'D)', 'Never type them — the software adds them at page breaks. Delete. (' + L('mistakes', 'mistake #12') + ')'],
    blank:    ['fix',   'format',   12, 'Blank line typed by hand', 'The page spaces itself. Delete empty lines. (' + L('mistakes', 'mistake #12') + ')'],
    emoji:    ['fix',   'format',   0,  'Emoji in script text', 'Personal flags only — never in submission text. Put it in a note (Alt+J) instead.'],
    slugform: ['fix',   'format',   0,  'Scene heading shape', 'INT. or EXT. + PLACE + - TIME, all caps: INT. LAUNDROMAT - DAY. (' + L('b1b-scene-headings--the-three-rules-and-the-five-parts', 'the rulebook — scene headings') + ')'],
    slugtime: ['check', 'format',   0,  'Scene heading has no time of day', 'Master headings always end with the time: - DAY / - NIGHT do 95% of the work. (' + L('b1b-scene-headings--the-three-rules-and-the-five-parts', 'the rulebook') + ')'],
    slugpunct:['fix',   'format',   0,  'Punctuation at the end of a heading', 'No ending punctuation on a scene heading.'],
    slugnum:  ['fix',   'format',   0,  'Scene number on a spec', 'Never number scenes — production does that when a script is locked.'],
    sluglong: ['check', 'format',   0,  'Heading wraps — too long', 'Headings that are unnecessarily long bury the one thing that matters. (' + L('b7-the-twelve-deadly-mistakes--rileys-list-in-full', 'Riley #7') + ')'],
    parenlong:['check', 'format',   0,  'Parenthetical too long', 'A few words is the size of the thing. Or delete it — the deletion test. (' + L('b1c-capitals-and-parentheticals--the-two-rules-writers-break-first', 'the rulebook') + ')'],
    parenstyle:['check','format',   0,  'Parenthetical style', 'Lower case, no closing period, no "he" or "she".'],
    parenadv: ['check', 'format',   0,  'Parenthetical states the obvious?', 'The deletion test: delete it. If the line\'s meaning is unchanged, it was never earned. (' + L('b1c-capitals-and-parentheticals--the-two-rules-writers-break-first', 'the rulebook') + ')'],
    parenend: ['fix',   'format',   0,  'Speech ends on a parenthetical', 'Never end a speech with one. If the beat belongs after the last word, it belongs in an action line.'],
    orphan:   ['fix',   'format',   0,  'Dialogue or parenthetical without a character cue', 'Every speech hangs under a CHARACTER cue.'],
    nodia:    ['fix',   'format',   0,  'Character cue with no dialogue', 'A cue must be followed by what they say.'],
    trans:    ['info',  'format',   0,  'Transitions', 'Default is none — a new heading is already a cut. Keep only deliberate effects (SMASH CUT, MATCH CUT). (' + L('b1-writing-rules', 'the rulebook') + ')']
  };
  var SEV_RANK = {fix: 0, check: 1, info: 2};

  function run(blocks, opt){
    opt = opt || {};
    var out = [];
    function hit(rule, i, re, pos){
      var r = R[rule], b = blocks[i];
      out.push({rule: rule, sev: r[0], cat: r[1], m: r[2], title: r[3], why: r[4], i: i, pos: pos || 0, snip: snip(b ? b.x : '', re) || '(empty line)'});
    }
    var cues = {}, cueFirst = {}, cueExt = {}, speeches = {};
    blocks.forEach(function(b, i){
      if (b.t === 'char' && b.x.trim()) {
        var n = Z.cueName(b.x);
        cues[n] = (cues[n] || 0) + 1;
        if (!(n in cueFirst)) { cueFirst[n] = i; cueExt[n] = /\((V\.O\.|O\.S\.|VO|OS|O\.C\.)\)/i.test(b.x); }
      }
    });
    var cur = opt.cur;
    var adverbs = 0, adverbFirst = -1, transCount = 0, transFirst = -1;

    blocks.forEach(function(b, i){
      var x = b.x || '', tx = x.trim(), prev = blocks[i - 1], next = blocks[i + 1];
      if (!tx) { if (i !== cur && blocks.length > 1) hit('blank', i); return; }
      if (EMOJI.test(x)) hit('emoji', i, EMOJI);
      if (/\((MORE|CONT'?D|CONTINUED|CONT\.)\)/i.test(x) || /^\(MORE\)$/i.test(tx)) hit('contd', i, /\((MORE|CONT'?D|CONTINUED|CONT\.)\)/i);

      if (b.t === 'action') {
        if (Z.wrapCount(tx, 57) > 4) hit('wall', i);
        if (WE.test(x)) hit('wesee', i, WE);
        if (CAMERA_HARD.test(x)) hit('camera', i, CAMERA_HARD);
        else if (CAMERA_SOFT.test(x)) hit('camsoft', i, CAMERA_SOFT);
        if (INNER.test(x)) hit('inner', i, INNER);
        var sentences = x.split(/(?<=[.!?])\s+/);
        for (var s = 0; s < sentences.length; s++) {
          var sn = sentences[s], m1 = sn.match(PAST_PRON), m2 = sn.match(PAST_NAME);
          var bad1 = m1 && !(ED_OK.test(m1[2])), bad2 = m2 && !STARTERS.test(m2[1]) && !ED_OK.test(m2[2]) && !CAPS_OK.test(m2[1]);
          if (bad1 || bad2) { hit('past', i, bad1 ? PAST_PRON : PAST_NAME); break; }
        }
        if (INSTR.test(x)) hit('instr', i, INSTR);
        var ly = (x.match(/\b\w+ly\b/g) || []).filter(function(w){ return !ADVERB_OK.test(w) && w.length > 4; });
        if (ly.length) { adverbs += ly.length; if (adverbFirst < 0) adverbFirst = i; }
        /* screen text, signs and titles are allowed their capitals (Riley) */
        var capsScope = /^(ON SCREEN|SUPER|TITLE|CHYRON|INSERT|A SIGN|THE SIGN|SIGN)\b/i.test(tx) ? '' : x.replace(/:[^.!?]*/g, ' ').replace(/"[^"]*"/g, ' ');
        var caps = (capsScope.match(/\b[A-Z][A-Z'’]{1,}\b/g) || []).filter(function(w){ return !CAPS_OK.test(w.replace(/['’].*$/, '')) && !cues[w] && !Object.keys(cues).some(function(n){ return n.split(' ').indexOf(w) > -1; }); });
        if (caps.length >= 4) hit('shout', i, /\b[A-Z]{2,}\b/);
      }

      if (b.t === 'dia') {
        if (!prev || (prev.t !== 'char' && prev.t !== 'paren' && prev.t !== 'dia')) hit('orphan', i);
        if (NOSE.test(x)) hit('nose', i, NOSE);
        if (EXPO.test(x)) hit('expo', i, EXPO);
        if (Z.wrapCount(tx, 34) > 4) hit('speech', i);
      }

      if (b.t === 'paren') {
        var inner = tx.replace(/^\(|\)$/g, '').trim();
        if (!prev || (prev.t !== 'char' && prev.t !== 'dia')) hit('orphan', i);
        if (!next || next.t !== 'dia') hit('parenend', i);
        if (Z.words(inner) > 6 || Z.wrapCount(tx, 19) > 2) hit('parenlong', i);
        if (/\.$/.test(inner) || /^[A-Z][a-z]/.test(inner) || /\b(he|she)\b/i.test(inner)) hit('parenstyle', i);
        if (/^\w+ly$/i.test(inner) && !ADVERB_OK.test(inner)) hit('parenadv', i);
      }

      if (b.t === 'char') {
        if (!next || (next.t !== 'dia' && next.t !== 'paren') || !next.x.trim()) hit('nodia', i);
        var nm = Z.cueName(tx);
        if (/\(O\.S\.\)/i.test(tx)) {
          for (var k = Math.max(0, i - 4); k < i; k++) if (blocks[k].t === 'action' && DEVICE.test(blocks[k].x)) { hit('oswrong', i, /\(O\.S\.\)/i); break; }
        }
      }

      if (b.t === 'slug') {
        if (!/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.?|EST\.)\s+\S/.test(tx)) hit('slugform', i);
        else if (!/\s[-–—]+\s*\S+|\s-\S/.test(tx)) hit('slugtime', i);
        if (/[.,;:!?]$/.test(tx) && !/^(INT|EXT|EST|I\/E)\.?$/.test(tx)) hit('slugpunct', i);
        if (/^\d+[A-Z]?[\s.]/.test(tx)) hit('slugnum', i);
        if (tx.length > 57) hit('sluglong', i);
      }

      if (b.t === 'trans') { transCount++; if (transFirst < 0) transFirst = i; }
    });

    if (adverbs >= 3) out.push({rule: 'adverb', sev: 'info', cat: 'action', m: 0, title: R.adverb[3] + ' (' + adverbs + ')', why: R.adverb[4], i: adverbFirst, pos: 0, snip: snip(blocks[adverbFirst].x, /\b\w+ly\b/)});
    if (transCount) out.push({rule: 'trans', sev: transCount > 2 ? 'check' : 'info', cat: 'format', m: 0, title: R.trans[3] + ' (' + transCount + ')', why: R.trans[4], i: transFirst, pos: 0, snip: snip(blocks[transFirst].x)});

    /* scene-level: greetings in, goodbyes out */
    var scenes = [], curS = null;
    blocks.forEach(function(b, i){ if (b.t === 'slug') { curS = {start: i, dia: []}; scenes.push(curS); } else if (b.t === 'dia' && b.x.trim()) { if (!curS) { curS = {start: 0, dia: []}; scenes.push(curS); } curS.dia.push(i); } });
    scenes.forEach(function(sc){
      if (!sc.dia.length) return;
      sc.dia.slice(0, 2).forEach(function(f){ if (HELLO.test(blocks[f].x.trim())) hit('hello', f, HELLO); });
      var l = sc.dia[sc.dia.length - 1];
      if (sc.dia.length > 1 && BYE.test(blocks[l].x.trim())) hit('bye', l, BYE);
    });

    /* names: functional, inconsistent, introductions */
    var names = Object.keys(cues);
    names.forEach(function(n){
      if (FUNC.test(n)) {
        var r = R.func, sev = cues[n] >= 3 ? 'check' : 'info';
        out.push({rule: 'func', sev: sev, cat: 'format', m: sev === 'check' ? 10 : 0, title: r[3] + ': ' + n, why: r[4], i: cueFirst[n], pos: 0, snip: n + ' — ' + Z.plural(cues[n], 'speech', 'speeches')});
      }
    });
    for (var a = 0; a < names.length; a++) for (var c = a + 1; c < names.length; c++) {
      var A = names[a], B = names[c];
      var Ac = A.replace(/[^A-Z]/g, ''), Bc = B.replace(/[^A-Z]/g, '');
      /* two names with no A–Z letters at all both reduce to "" — that is not
         the same character, it is a name this rule cannot read. */
      /* Two names one character apart are usually a typo — but not when the
         character is a digit (COP 1 and COP 2 are two people), and not when
         both are functional names, which the rule above already reports. */
      var numbered = A.replace(/\d+/g, '#') === B.replace(/\d+/g, '#');
      var funcPair = FUNC.test(A) && FUNC.test(B);
      if (!numbered && !funcPair && Math.min(A.length, B.length) >= 3) {
        if (Ac && Ac === Bc) {
          /* the same letters, differently punctuated or spaced — MARY-JANE and
             MARY JANE really are one character typed two ways */
          out.push({rule: 'names', sev: 'fix', cat: 'format', m: 12, title: R.names[3] + ': ' + A + ' / ' + B, why: R.names[4], i: cueFirst[B], pos: 0, snip: A + ' vs ' + B});
        } else if (lev(A, B) === 1) {
          /* one character apart is a suspicion, not a finding: JIM and TIM are
             two people. Worth a look — but it must not hold a clean scene
             below twelve for ever, so it carries no mistake number. */
          out.push({rule: 'names', sev: 'check', cat: 'format', m: 0, title: R.names[3] + '?: ' + A + ' / ' + B, why: R.names[4], i: cueFirst[B], pos: 0, snip: A + ' vs ' + B});
        }
      }
    }
    names.forEach(function(n){
      if (FUNC.test(n)) return;
      var first = cueFirst[n], re = nameRe(escRe(n).replace(/ /g, '\\s+'), 'i'), found = -1, foundTxt = '';
      for (var j = 0; j < first; j++) if (blocks[j].t === 'action') { var mm = blocks[j].x.match(re); if (mm) { found = j; foundTxt = mm[0]; break; } }
      if (found < 0) { if (!cueExt[n]) out.push({rule: 'nointro', sev: 'info', cat: 'format', m: 0, title: R.nointro[3] + ': ' + n, why: R.nointro[4], i: first, pos: 0, snip: n}); return; }
      if (foundTxt !== foundTxt.toUpperCase()) out.push({rule: 'introcaps', sev: 'check', cat: 'format', m: 0, title: R.introcaps[3] + ': ' + n, why: R.introcaps[4], i: found, pos: 0, snip: snip(blocks[found].x, re)});
      var again = 0;
      for (j = found + 1; j < blocks.length && again < 2; j++) if (blocks[j].t === 'action') {
        var m3 = blocks[j].x.match(nameRe(escRe(n), ''));
        if (m3 && n.length > 2) { out.push({rule: 'capsagain', sev: 'info', cat: 'format', m: 0, title: R.capsagain[3] + ': ' + n, why: R.capsagain[4], i: j, pos: 0, snip: snip(blocks[j].x, nameRe(escRe(n), ''))}); again++; }
      }
    });

    out.sort(function(x, y){ return SEV_RANK[x.sev] - SEV_RANK[y.sev] || x.i - y.i; });
    return out;
  }

  function score(issues){
    var present = {};
    issues.forEach(function(x){ if (x.m && x.sev !== 'info') present[x.m] = 1; });
    var k = Object.keys(present).length, s = 12 - k;
    var verdict = k === 0 ? 'none of the nine a machine can see' : (s >= 10 ? 'fix the ' + (k === 1 ? 'one' : 'two') : 'one more pass');
    return {score: s, present: Object.keys(present).map(Number).sort(function(a, b){ return a - b; }),
      label: k === 0 ? 'the twelve mistakes score: 12 clean* — ' + verdict : 'the twelve mistakes score: ' + s + '/12 — ' + verdict};
  }

  Z.doctor = {
    run: function(blocks){ return run(blocks, {cur: Z.page && Z.page.isOpen() && document.activeElement && document.activeElement.closest && document.activeElement.closest('.b') ? +document.activeElement.closest('.b').dataset.i : -1}); },
    runRaw: run,
    score: score,
    rank: function(x){ return SEV_RANK[x.sev] * 100 + (x.m || 50); },
    rules: R
  };
})();
