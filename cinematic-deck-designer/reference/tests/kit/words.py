# usage: python3 -I words.py <a.html> <b.html>
# Compares each slide's on-screen wording (all text in the slide outside aside.notes, SVG <text> included) and its
# speaker notes between two decks. Whitespace is collapsed and <br> counts as a space, so added spans and line breaks pass.
# Exit 1 on any difference.
import sys, re, difflib
from html.parser import HTMLParser
BLOCK = {'p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'section', 'aside', 'br', 'tr', 'td', 'text', 'tspan', 'figcaption', 'blockquote'}
VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr', 'area', 'col', 'embed', 'param', 'track'}
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.stack = []; s.slides = {}; s.order = []; s.cur = None; s.depth = 0; s.skip = 0; s.notes = 0
    def handle_starttag(s, t, a):
        a = dict(a); cls = (a.get('class') or '').split()
        if t in VOID:
            if s.cur and t == 'br': s.put(' ')
            return
        s.stack.append(t)
        if s.cur is None and t == 'section' and 'slide' in cls:
            s.cur = a.get('id') or f'#{len(s.order)}'; s.order.append(s.cur); s.slides[s.cur] = [[], []]; s.depth = len(s.stack)
        elif s.cur:
            if t in ('script', 'style'): s.skip += 1
            if t == 'aside' and 'notes' in cls: s.notes = len(s.stack)
            if t in BLOCK: s.put(' ')
    def handle_endtag(s, t):
        if t in VOID or not s.stack: return
        while s.stack:
            top = s.stack.pop(); n = len(s.stack) + 1
            if s.cur:
                if top in ('script', 'style'): s.skip -= 1
                if s.notes and n == s.notes: s.notes = 0
                if top in BLOCK: s.put(' ')
                if n == s.depth: s.cur = None
            if top == t: break
    def put(s, txt):
        if s.cur and not s.skip: s.slides[s.cur][1 if s.notes else 0].append(txt)
    def handle_data(s, d): s.put(d)
def read(f):
    p = P(); p.feed(open(f, encoding='utf-8').read())
    return p.order, {k: tuple(re.sub(r'\s+', ' ', ''.join(v)).strip() for v in vv) for k, vv in p.slides.items()}
oa, A = read(sys.argv[1]); ob, B = read(sys.argv[2]); bad = 0
if oa != ob: print('slide order differs:', oa, ob); bad += 1
for sid in oa:
    if sid not in B: print(f'{sid}: missing in b'); bad += 1; continue
    for k, what in ((0, 'screen'), (1, 'notes')):
        a, b = A[sid][k], B[sid][k]
        if a == b: continue
        if re.sub(r'\s', '', a) == re.sub(r'\s', '', b): print(f'{sid} {what}: whitespace only (ok)'); continue
        bad += 1; sm = difflib.SequenceMatcher(None, a, b)
        diffs = [f'  {op}: a[{a[i1:i2][:80]!r}] b[{b[j1:j2][:80]!r}]' for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal'][:6]
        print(f'{sid} {what} differs:'); print('\n'.join(diffs))
print(f'{len(oa)} slides compared, screen+notes; {bad} differences')
sys.exit(1 if bad else 0)
