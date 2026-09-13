/* ══ 35 · formats: .fountain / plain text / .fdx in and out ═════════════
   Fountain is the plain-text screenplay format most programs read; .fdx is
   Final Draft's own XML. Both round-trip the six shapes; notes ride along
   in Fountain as [[notes]] and are dropped from .fdx and print.          */
(function(){
  var SLUG_RE = /^(int|ext|est|int\.?\/ext|ext\.?\/int|i\/e)[\.\s]/i;

  function isUpperLine(s){ return /[A-Z]/.test(s) && s === s.toUpperCase() && !/[a-z]/.test(s); }

  /* Fountain + "typed" plain-text screenplays (the indented kind this file prints) */
  Z.parseScript = function(text){
    var out = {blocks: [], title: '', author: '', contact: ''};
    text = String(text || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');           /* boneyard */
    var lines = text.split('\n');

    /* title page: Key: value lines at the very top */
    var i = 0;
    if (/^\s*(title|credit|author|authors|source|draft date|contact|copyright|notes)\s*:/i.test(lines[0] || '')) {
      var key = '';
      for (; i < lines.length && lines[i].trim() !== ''; i++) {
        var m = /^\s*([\w ]+?)\s*:\s*(.*)$/.exec(lines[i]);
        if (m) { key = m[1].toLowerCase(); val(key, m[2]); } else val(key, lines[i].trim());
      }
    }
    function val(k, v){
      v = v.replace(/^[_*]+|[_*]+$/g, '').trim(); if (!v) return;
      if (k === 'title') out.title = out.title ? out.title + ' ' + v : v;
      else if (k === 'author' || k === 'authors') out.author = out.author ? out.author + ', ' + v : v;
      else if (k === 'contact') out.contact = out.contact ? out.contact + ' · ' + v : v;
    }

    var indented = lines.slice(i).filter(function(l){ return /^ {8,}\S/.test(l); }).length > 2;
    var B = out.blocks, last = null, inSpeech = false;
    function push(t, x){ x = x.replace(/\s+$/, ''); var b = {t: t, x: x}; B.push(b); last = b; return b; }

    for (; i < lines.length; i++) {
      var raw = lines[i], pend = '';
      var line = raw.replace(/\[\[([^\n]*)\]\]/g, function(_, n){ pend += (pend ? ' · ' : '') + n.trim(); return ''; });
      var trimmed = line.trim();
      if (!trimmed && !raw.trim()) { inSpeech = false; continue; }
      if (trimmed) classify(line, trimmed, i);
      if (pend && last) last.n = (last.n ? last.n + ' · ' : '') + pend;
    }

    function classify(rawLine, line, i){
      var prevBlank = i === 0 || !lines[i - 1] || !lines[i - 1].trim();
      var nextLine = lines[i + 1] != null ? lines[i + 1].trim() : '';
      if (/^(#|=(?!=))/.test(line) || /^={3,}$/.test(line)) return;        /* sections, synopses, page breaks */

      if (indented) {
        var ind = rawLine.length - rawLine.replace(/^ +/, '').length;
        if (ind >= 30 && /:$/.test(line) && isUpperLine(line)) { push('trans', line); inSpeech = false; return; }
        if (ind >= 16 && isUpperLine(line) && !/^\(/.test(line)) { push('char', line); inSpeech = true; return; }
        if (inSpeech && /^\(/.test(line)) {
          if (last && last.t === 'paren' && !/\)$/.test(last.x)) last.x += ' ' + line; else push('paren', line);
          return;
        }
        if (inSpeech && ind >= 6) {
          if (last && last.t === 'paren' && !/\)$/.test(last.x)) { last.x += ' ' + line; return; }
          if (last && last.t === 'dia') last.x += ' ' + line; else push('dia', line);
          return;
        }
      }

      if (/^\.[^.]/.test(line) || (SLUG_RE.test(line) && (prevBlank || !last))) { push('slug', line.replace(/^\./, '').toUpperCase()); inSpeech = false; return; }
      if (/^>/.test(line) && !/<$/.test(line)) { push('trans', line.replace(/^>\s*/, '').toUpperCase()); inSpeech = false; return; }
      if (isUpperLine(line) && /TO:$/.test(line) && prevBlank) { push('trans', line); inSpeech = false; return; }
      if (/^@/.test(line)) { push('char', line.replace(/^@/, '').toUpperCase()); inSpeech = true; return; }
      if (isUpperLine(line) && !/^[\d\W]+$/.test(line.replace(/\(.*\)/, '')) && prevBlank && nextLine && !inSpeech && line.length < 50 && !/^(FADE (IN|OUT)|THE END)/.test(line)) {
        push('char', line.toUpperCase()); inSpeech = true; return;
      }
      if (inSpeech) {
        if (/^\(/.test(line)) { push('paren', line); return; }
        if (last && last.t === 'paren' && !/\)$/.test(last.x)) { last.x += ' ' + line; return; }
        if (last && last.t === 'dia') last.x += ' ' + line; else push('dia', line);
        return;
      }
      if (/^>.*<$/.test(line)) line = line.replace(/^>\s*|\s*<$/g, '');
      line = line.replace(/^!/, '');
      if (last && last.t === 'action' && !prevBlank) last.x += ' ' + line;
      else push('action', line);
    }
    return out;
  };

  Z.parseFDX = function(xml){
    var out = {blocks: [], title: '', author: '', contact: ''};
    var doc; try { doc = new DOMParser().parseFromString(xml, 'application/xml'); } catch (e) { return out; }
    var map = {'Scene Heading': 'slug', 'Action': 'action', 'Character': 'char', 'Parenthetical': 'paren', 'Dialogue': 'dia', 'Transition': 'trans', 'Shot': 'slug', 'General': 'action', 'Cast List': 'action', 'New Act': 'slug', 'End of Act': 'trans'};
    var content = doc.querySelector('FinalDraft > Content') || doc.querySelector('Content');
    if (content) Array.prototype.forEach.call(content.children, function(p){
      if (p.tagName !== 'Paragraph') return;
      var t = map[p.getAttribute('Type')] || 'action';
      var x = Array.prototype.map.call(p.querySelectorAll('Text'), function(n){ return n.textContent; }).join('').replace(/\s+/g, ' ').trim();
      if (!x) return;
      if (t === 'slug' || t === 'char' || t === 'trans') x = x.toUpperCase();
      if (t === 'paren' && !/^\(/.test(x)) x = '(' + x + ')';
      out.blocks.push({t: t, x: x});
    });
    var tp = doc.querySelector('TitlePage');
    if (tp) {
      var texts = Array.prototype.map.call(tp.querySelectorAll('Paragraph'), function(p){ return Array.prototype.map.call(p.querySelectorAll('Text'), function(n){ return n.textContent; }).join('').trim(); }).filter(Boolean);
      if (texts.length) out.title = texts[0];
      var by = texts.findIndex(function(s){ return /^written by|^by$/i.test(s); });
      if (by > -1 && texts[by + 1]) out.author = texts[by + 1];
      /* Final Draft puts the contact block bottom-left of the title page */
      var left = Array.prototype.map.call(tp.querySelectorAll('Paragraph[Alignment="Left"]'), function(p){
        return Array.prototype.map.call(p.querySelectorAll('Text'), function(n){ return n.textContent; }).join('').trim();
      }).filter(Boolean);
      if (left.length) out.contact = left.join(' · ');
    }
    return out;
  };

  Z.toFountain = function(sc){
    var out = [];
    if (sc.title) {
      out.push('Title: ' + sc.title);
      out.push('Credit: Written by');
      if (sc.author) out.push('Author: ' + sc.author);
      if (sc.contact) out.push('Contact: ' + sc.contact);
      out.push('');
    }
    var prev = null;
    sc.blocks.forEach(function(b, bi){
      var x = b.x.trim(); if (!x) return;
      var nb = sc.blocks[bi + 1];
      var nextIsSpeech = !!(nb && (nb.t === 'dia' || nb.t === 'paren') && nb.x.trim());
      /* ]] would end the note early and spill brackets into the script */
      var n = b.n ? ' [[' + String(b.n).replace(/\]\]/g, '] ]') + ']]' : '';
      if (b.t === 'slug') { out.push(''); out.push((SLUG_RE.test(x) ? '' : '.') + x + n); out.push(''); }
      else if (b.t === 'action') { if (prev && prev.t !== 'slug') out.push(''); out.push((isUpperLine(x) && !/[.!?]$/.test(x) ? '!' : '') + x + n); }
      else if (b.t === 'char') { out.push(''); out.push((isUpperLine(x) && nextIsSpeech ? '' : '@') + x.toUpperCase() + n); }
      else if (b.t === 'paren') out.push((/^\(/.test(x) ? x : '(' + x + ')') + n);
      else if (b.t === 'dia') out.push(x + n);
      else if (b.t === 'trans') { out.push(''); out.push((/TO:$/.test(x) ? '' : '> ') + x + n); out.push(''); }
      prev = b;
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };

  function xmlEsc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  Z.toFDX = function(sc){
    var TYPE = {slug: 'Scene Heading', action: 'Action', char: 'Character', paren: 'Parenthetical', dia: 'Dialogue', trans: 'Transition'};
    var p = ['<?xml version="1.0" encoding="UTF-8" standalone="no" ?>', '<FinalDraft DocumentType="Script" Template="No" Version="4">', '  <Content>'];
    sc.blocks.forEach(function(b){
      var x = b.x.trim(); if (!x) return;
      p.push('    <Paragraph Type="' + TYPE[b.t] + '"><Text>' + xmlEsc(x) + '</Text></Paragraph>');
    });
    p.push('  </Content>');
    p.push('  <TitlePage>', '    <Content>');
    function tp(text, align){ p.push('      <Paragraph Alignment="' + (align || 'Center') + '" Type="Text"><Text>' + xmlEsc(text || '') + '</Text></Paragraph>'); }
    for (var k = 0; k < 16; k++) tp('');
    tp((sc.title || 'Untitled').toUpperCase());
    tp(''); tp('Written by'); tp(''); tp(sc.author || '');
    if (sc.contact) { for (k = 0; k < 14; k++) tp(''); tp(sc.contact, 'Left'); }
    p.push('    </Content>', '  </TitlePage>');
    p.push('</FinalDraft>');
    return p.join('\n') + '\n';
  };

  function wrap(s, w){
    var words = String(s).split(/\s+/), lines = [], line = '';
    words.forEach(function(wd){
      if (!wd) return;
      if ((line + (line ? ' ' : '') + wd).length > w && line) { lines.push(line); line = wd; }
      else line += (line ? ' ' : '') + wd;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  Z.wrapLines = wrap;
  Z.toText = function(sc){
    var pad = function(n){ return new Array(n + 1).join(' '); }, out = [];
    if (sc.title || sc.author || sc.contact) {
      out.push('Title: ' + (sc.title || 'Untitled'));
      out.push('Credit: Written by');
      if (sc.author) out.push('Author: ' + sc.author);
      if (sc.contact) out.push('Contact: ' + sc.contact);
      out.push('', '');
    }
    var prev = null;
    sc.blocks.forEach(function(b){
      var x = b.x.trim(); if (!x) return;
      var sp = {slug: 1, action: 1, char: 1, paren: 0, dia: 0, trans: 1}[b.t];
      if (prev && sp) out.push('');
      if (b.t === 'slug' || b.t === 'action') wrap(x, 57).forEach(function(l){ out.push(l); });
      else if (b.t === 'char') out.push(pad(24) + x);
      else if (b.t === 'paren') wrap(x, 19).forEach(function(l){ out.push(pad(17) + l); });
      else if (b.t === 'dia') wrap(x, 34).forEach(function(l){ out.push(pad(10) + l); });
      else if (b.t === 'trans') out.push(pad(Math.max(0, 57 - x.length)) + x);
      prev = b;
    });
    return out.join('\n') + '\n';
  };

  /* read a <pre class="script"> example from this file into blocks */
  Z.blocksFromPre = function(pre){
    return Z.parseScript((pre.textContent || '').replace(/\s*←.*$/gm, '')).blocks;
  };
})();
