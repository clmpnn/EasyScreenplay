#!/usr/bin/env python3
"""One-time extraction: lift the craft sections out of the Zero to Funded
document and write them as EasyScreenplay guide fragments.

Kept in the repo for provenance — you never need to run it again unless you
want to pull more material across. Source is not part of this repo.
"""
import os, re, sys
from bs4 import BeautifulSoup

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/sw/v11.html'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'guide')

# old id → (slug, group, title, one-line standfirst)
KEEP = [
    ('s5',  'catch',      'story', 'Catch an idea',            'Three sentences, five minutes. Quality is the next section’s job.'),
    ('s6',  'test',       'story', 'Is it a story yet?',       'Four boxes. If one is empty you do not have a story — you have a situation.'),
    ('s7',  'logline',    'story', 'The logline',              'The whole thing in one sentence, said aloud in twenty seconds.'),
    ('s8',  'people',     'story', 'The people',               'Want, need, flaw — and the person who wants the same thing.'),
    ('s9',  'shape',      'story', 'The shape',                'Five beats for a short. The order things happen in.'),
    ('s10', 'cards',      'story', 'Scene cards',              'One card per scene, before you write it. Enter at the latest possible moment.'),

    ('s2',  'first-page', 'craft', 'Your first page',          'Twenty-five minutes from nothing to a page that is really a page.'),
    ('s4',  'six-shapes', 'craft', 'The page in six shapes',   'Everything on a screenplay page is one of six things.'),
    ('s11', 'pages',      'craft', 'Writing the pages',        'The only part that makes pages. Placeholders welcome.'),
    ('s12', 'format',     'craft', 'Format — the rulebook',    'Every rule that decides whether a page looks professional.'),
    ('s13', 'words',      'craft', 'Dialogue, subtext, compression', 'Nobody says what they mean. Cut until it hurts, then cut the adverb.'),
    ('s18', 'mistakes',   'craft', 'The twelve mistakes',      'What a reader sees before they read a word. The doctor finds nine of them.'),
    ('s17', 'rewrite',    'craft', 'Finish, rest, rewrite',    'Finish it, leave it alone, then one pass per problem — never all at once.'),
    ('s19', 'readers',    'craft', 'Readers',                  'What to ask, who to ask, and what to do with what they say.'),
    ('s25', 'read',       'craft', 'How to read a script',     'The other half of learning this. Read like a writer, not an audience.'),
    ('s26', 'scripts',    'craft', 'Where the scripts are',    'Five on your machine by tonight, free and legal.'),
    ('s1',  'vocabulary', 'craft', 'The words people use',     'Read once. Then you can read everything else.'),
    ('s3',  'keeping',    'craft', 'Keeping your work',        'A page that can be lost is not written yet.'),
]
DROP_TOOLS = {'desk', 'recall', 'sessions', 'donelist', 'stall', 'examA', 'selftest',
              'books', 'assets', 'truby', 'engine', 'ics', 'sop', 'recs'}

ID = {old: slug for old, slug, *_ in KEEP}
TITLE = {old: t for old, _, _, t, _ in KEEP}


def main():
    soup = BeautifulSoup(open(SRC, encoding='utf-8').read(), 'lxml')
    os.makedirs(OUT, exist_ok=True)
    written = []
    for old, slug, group, title, stand in KEEP:
        sec = soup.find('section', id=old)
        if not sec:
            sys.exit('missing section ' + old)
        frag = clean(sec, slug, title, stand)
        path = os.path.join(OUT, f'{group}-{slug}.html')
        open(path, 'w', encoding='utf-8').write(frag)
        written.append((os.path.basename(path), len(frag)))
    for n, size in written:
        print(f'{n:28s} {size:7d}')
    print(len(written), 'sections')


def clean(sec, slug, title, stand):
    sec = BeautifulSoup(str(sec), 'lxml').find('section')

    # course scaffolding goes
    for sel in ['.donow', '.stepdone', '.gate', '.later-note', '.hudcard', '.dateset',
                '.ex-row', '.taglegend', '.exam-static', '.st-source']:
        for n in sec.select(sel):
            n.decompose()
    for n in sec.select('.tool[data-tool]'):
        if n.get('data-tool') in DROP_TOOLS:
            n.decompose()

    # verification pips belonged to the campaign's fact-checking
    for n in sec.select('.tg'):
        n.decompose()

    # the head becomes a plain section head
    head = sec.find('div', class_='step-head')
    meta_txt = []
    if head:
        for sp in head.select('.step-meta span'):
            t = sp.get_text(' ', strip=True)
            if re.match(r'^(Day|Done when|After|Before|Any time|Week)\b', t, re.I):
                continue
            meta_txt.append(t)
        head.decompose()
    body = sec.find('div', class_='step-body')
    inner = ''.join(str(c) for c in body.children) if body else ''

    out = BeautifulSoup(inner, 'lxml')
    # links: to a kept section → its new anchor; to a dropped one → plain text
    for a in out.find_all('a', href=True):
        href = a['href']
        if not href.startswith('#'):
            continue
        tgt = href[1:]
        base = re.match(r'^(s\d+)', tgt)
        if base and base.group(1) in ID:
            keep_id = base.group(1)
            a['href'] = '#' + ID[keep_id] + tgt[len(keep_id):] if tgt != keep_id else '#' + ID[keep_id]
            txt = a.get_text(' ', strip=True)
            if re.match(r'^(Step|Part)\s+\d+', txt):
                a.string = TITLE[keep_id].lower() if txt[0].islower() else TITLE[keep_id]
        elif re.match(r'^(s\d+|p\d+|d\d|run-|ap-|registration|what-changed)', tgt) or base:
            a.replace_with(a.get_text())
    # stray "Step 21" style references in plain prose
    for node in out.find_all(string=re.compile(r'\bStep \d+\b')):
        if node.parent.name in ('script', 'style'):
            continue
        node.replace_with(re.sub(r'\bStep (\d+)\b', lambda m: TITLE.get('s' + m.group(1), 'the guide'), node))

    meta = ' · '.join(meta_txt)
    return (f'<section class="sec" id="{slug}">\n'
            f'  <header class="sec-head">\n'
            f'    <h2>{title}</h2>\n'
            + (f'    <p class="sec-meta">{meta}</p>\n' if meta else '')
            + f'    <p class="sec-stand">{stand}</p>\n'
            f'  </header>\n'
            f'  <div class="sec-body">\n{str(out.body.decode_contents()) if out.body else inner}\n  </div>\n'
            f'</section>\n')


if __name__ == '__main__':
    main()
