// usage: node check.js <deck.html> <outdir> [slides|motion|all] [ids...]
// slides: each slide settled with every build shown (go(i,{instant,toEnd,force}) then settle) -> s-NN-<id>.png,
//         with layout warnings: text lines outside a 60 px safe margin, and text boxes of different elements overlapping.
// motion: each slide's arrival played in real time from the previous slide (the cover from standby), then each build;
//         4 to 9 frames per set piece -> m-<id>-N.png (N in order; labels and capture times go to report.json). Frames
//         land just after the moment's beats (impacts, releases, the stamp: read from the sound calls it schedules ahead).
// Always: page errors and console errors. Writes report.json; exit 1 if any page error.
const L = require('./lib');
const [file, out, mode = 'slides', ...only] = process.argv.slice(2);
const SAFE = 60;

// visible text lines on the slide on stage, in stage px: [{el, text, rects:[...]}]
function textBoxes() {
  const s = document.querySelector('#slides > .slide.on'), st = document.getElementById('stage').getBoundingClientRect(), k = st.width / 1920;
  const seen = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < .05) return false; } return true; };
  const out = [], w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
  let n, idx = 0; const byEl = new Map();
  while ((n = w.nextNode())) {
    if (!n.textContent.trim()) continue; const el = n.parentElement;
    if (el.closest('aside, script, style, .notes')) continue;
    if (!seen(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter(q => q.width > 1 && q.height > 1).map(q => ({ x: (q.left - st.left) / k, y: (q.top - st.top + q.height * .17) / k, w: q.width / k, h: q.height * .66 / k }));   // the glyphs' core, not the font's full line box
    if (!rects.length) continue;
    const key = el.closest('[data-e]') || el;
    if (!byEl.has(key)) { byEl.set(key, { i: idx++, text: '', rects: [], key }); }
    const b = byEl.get(key); b.text += n.textContent; b.rects.push(...rects);
  }
  const list = [...byEl.values()];
  const warn = [];
  for (const b of list) {
    b.text = b.text.replace(/\s+/g, ' ').trim().slice(0, 50);
    for (const q of b.rects) {
      const off = [q.x < 60 && `left ${q.x.toFixed(0)}`, q.y < 60 && `top ${q.y.toFixed(0)}`, q.x + q.w > 1860 && `right ${(q.x + q.w).toFixed(0)}`, q.y + q.h > 1020 && `bottom ${(q.y + q.h).toFixed(0)}`].filter(Boolean);
      if (off.length) { warn.push(`outside safe margin (${off.join(', ')}): "${b.text}"`); break; }
    }
  }
  for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) {
    const A = list[a], C = list[c]; if (A.key.contains(C.key) || C.key.contains(A.key)) continue;
    let worst = 0;
    for (const p of A.rects) for (const q of C.rects) {
      const ix = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), iy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (ix > 4 && iy > 4) worst = Math.max(worst, ix * iy / Math.min(p.w * p.h, q.w * q.h));
    }
    if (worst > .08) warn.push(`text overlap ${(worst * 100).toFixed(0)}%: "${A.text}" / "${C.text}"`);
  }
  return warn;
}

(async () => {
  L.mkdir(out);
  const b = await L.launch(); const { page, log } = await L.open(b, file);
  await page.addStyleTag({ content: '#toast{display:none!important}' });   // the standby toast is not part of the slide
  const S = await L.slides(page), pick = S.filter(s => !only.length || only.includes(s.id));
  const report = { file, mode, slides: S.map(s => ({ id: s.id, builds: s.builds, trans: s.trans })), shots: {}, layout: {}, motion: {}, errors: log };
  if (mode === 'slides' || mode === 'all') {
    for (const s of pick) {
      await L.settle(page, s.i, s.i === 0 ? 900 : 700);
      const f = `s-${String(s.i + 1).padStart(2, '0')}-${s.id}.png`;
      await page.screenshot({ path: L.path.join(out, f) });
      const w = await page.evaluate(textBoxes);
      report.shots[s.id] = f; if (w.length) report.layout[s.id] = w;
      console.log(`${f}${w.length ? '  ' + w.length + ' layout warnings' : ''}`); w.forEach(x => console.log('   ' + x));
    }
  }
  if (mode === 'motion' || mode === 'all') {
    // the beats: every set-piece sound is scheduled ahead (at: seconds) the moment its moment starts, even with sound off,
    // so wrapping the sound object's methods tells when the impacts and releases will be
    const wrapBeats = () => page.evaluate(() => { const s = window.__deck.sound; window.__beats = []; for (const k of ['thunk', 'snap', 'stamp', 'nock', 'knock', 'grip', 'gripSet', 'freeze', 'unfreeze', 'pull', 'creak']) { const f = s[k]; if (typeof f !== 'function') continue; s[k] = function (...a) { const o = a.find(x => x && typeof x === 'object') || {}; window.__beats.push({ k, t: performance.now() + (+o.at || 0) * 1000 }); return f.apply(this, a); }; } });
    await wrapBeats();
    const beatsSince = t0 => page.evaluate(t0 => window.__beats.filter(b => b.t >= t0).map(b => ({ k: b.k, ms: Math.round(b.t - t0) })), t0);
    // frame times: the first at `first`, one just after each beat (impacts and releases first), one after the last, within n
    const plan = (beats, n, first, tail) => {
      const key = beats.filter(b => ['thunk', 'snap', 'stamp', 'nock', 'freeze', 'unfreeze'].includes(b.k)).map(b => b.ms + 60), other = beats.filter(b => !key.includes(b.ms + 60)).map(b => b.ms + 60);
      const fill = first < 200 ? [900, 1700, 2600, 3600, 4800] : [1100, 2200, 3400];   // spread the rest over the move
      const last = Math.max(first, ...key, ...other), want = [first, ...key, last + tail, ...other, ...fill];
      const out = []; for (const t of want) { if (out.length >= n) break; if (t > 6500 || out.some(u => Math.abs(u - t) < 300)) continue; out.push(Math.round(t)); }
      return out.sort((p, q) => p - q);
    };
    for (const s of pick) {
      const frames = []; let n = 0;
      const shoot = async (label, t0) => { const f = `m-${s.id}-${++n}.png`; const t = Date.now() - t0; await page.screenshot({ path: L.path.join(out, f) }); frames.push({ f, label, t }); };
      const play = async (label, n0) => {   // trigger, then shoot to a plan re-made from the beats known so far (a release can schedule its impact later)
        const t0 = Date.now(), p0 = await page.evaluate(() => { const t = performance.now(); window.__deck.next(); return t; });
        let shot = [], beats = [], quietSince = Date.now();
        while (shot.length < n0 && Date.now() - t0 < 7000) {
          await L.sleep(60); const b = await beatsSince(p0); if (b.length !== beats.length) { beats = b; quietSince = Date.now(); }
          const el = Date.now() - t0, times = plan(beats, n0, label === 'arrive' ? 150 : 250, 700), last = shot.length ? shot[shot.length - 1] : -1e9;
          const nextT = times.find(t => t > last + 200 && t >= el - 150);   // a screenshot takes 100-300 ms: a shot may run a little late
          if (nextT === undefined) { if (Date.now() - quietSince > 2500 && el > Math.max(...times)) break; continue; }
          const d = t0 + nextT - Date.now(); if (d > 80) continue;   // not yet: keep listening for beats
          if (d > 0) await L.sleep(d);
          await shoot(`${label}+${nextT}`, t0); shot.push(nextT);
        }
        if (process.env.CHECK_DEBUG) console.log(label, JSON.stringify(beats));
        return beats;
      };
      if (s.i === 0) { await page.reload(); await L.ready(page); await page.addStyleTag({ content: '#toast{display:none!important}' }); await wrapBeats(); }
      else { await L.settle(page, s.i - 1, 600); await L.sleep(700); }
      // budget: 9 frames; the arrival 4 (up to 7 with fewer builds), the builds share the rest, the later ones first
      const nb = s.builds, arr = Math.max(4, Math.min(7, 9 - 2 * nb)), perB = Array(nb).fill(0);
      for (let left = 9 - arr, j = nb - 1; left > 0 && nb; left--, j = j > 0 ? j - 1 : nb - 1) perB[j]++;
      if (s.i === 0) { await L.sleep(300); }
      await play('arrive', arr);
      await L.idle(page); await L.sleep(400);
      for (let k = 1; k <= nb && n < 9; k++) {
        const beats = await play(`build${k}`, Math.min(perB[k - 1], 9 - n));
        const end = Math.max(0, ...beats.map(b => b.ms)); await L.sleep(Math.max(900, Math.min(5000, end + 900 - 0)));
      }
      report.motion[s.id] = frames; console.log(`${s.id}: ${frames.map(f => f.label + '@' + f.t).join(' ')}`);
    }
  }
  report.errors = log;
  L.fs.writeFileSync(L.path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`errors: ${log.length ? '\n  ' + log.join('\n  ') : 'none'}`);
  console.log(`layout warnings on ${Object.keys(report.layout).length} slides; report.json in ${out}`);
  await b.close(); process.exit(log.some(e => e.includes('pageerror')) ? 1 : 0);
})();
