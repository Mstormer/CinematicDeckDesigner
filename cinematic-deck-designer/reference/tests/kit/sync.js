// usage: node sync.js <deck.html> <out.json> [rates=1,0.5,2] [ids...]
// Audio-picture sync proof. Sound on (M); for each rate (the editor's global speed) it walks the talk from standby with
// next() (or only the named slides: each from the previous one settled, then its builds).
// SOUND side: every AudioBufferSourceNode.start() is logged with the sound method that made it (a call stack tag; sources
//   built a task later inherit the last call within 120 ms). Per call, its loudest one-shot source gives the transient:
//   the first sample over half the source's peak in its played region. Its audible wall time is the start projected onto
//   the wall clock as a real-time device would play it: wall_at_start + (audio_time_of_transient - currentTime_at_start)
//   + outputLatency, one audio second per wall second.
//   outputLatency is pinned to a nominal wired output (20 + 5 ms; see INIT), because headless Chrome reports ~170 ms here.
//   clockRate is measured and printed only: headless Chrome's audio clock can run slower than wall time on this Mac, which
//   would make real output late; the projection does not depend on it.
// PICTURE side: the frame that shows an event = the first requestAnimationFrame after it, plus SYNC_FRAMES frames (env,
//   default 2: Chrome on macOS puts a frame on the glass about two vsyncs after its rAF; a projector adds its own lag to both).
//   Events: a slide gaining .hit (flight impact, cover miss, finale), .loosed (release), .on with data-replay (the hard cut),
//   .stamping (+160 ms: the glyphs meet the paper at 42% of .38 s), firing-N removed (the last arrow of a volley lands), and
//   for a call made with no `at` from the frame loop (landHit, a snap at release), the frame that called it.
// Pairs: a call with no `at` -> its own frame; a call with `at` -> the nearest class event of its kind (thunk: hit/firing,
// snap: loosed, stamp: stamp, nock: replay).
// Reports each pair's offset (sound minus picture, ms; + means the sound is late), and per rate the median offset (the
// model's bias) and the spread (largest distance from the median: independent of the display model, the robust number).
// Pass: every |offset| <= 34 ms (two frames).
const L = require('./lib');
const [file, outJson, rateArg = '1,0.5,2', ...only] = process.argv.slice(2);
const rates = rateArg.split(',').map(Number);
const MAP = { thunk: ['hit', 'firing', 'frame'], snap: ['loosed', 'frame'], stamp: ['stamp'], nock: ['replay'] };
const QUIET = new Set(['bedTo', 'ok', 'cut', 'varispeed', 'toggle', 'init', 'thud', 'suck', 'unfreeze', 'pass', 'whoosh', 'fly', 'creak', 'freeze', 'slow', 'rewind', 'pull']);   // textures or gain moves: no single transient to sync

const INIT = () => {
  // a nominal wired output: 20 ms output + 5 ms base latency, so the deck schedules as it would on a laptop's own output or
  // HDMI (headless Chrome here reports ~170 ms, which would clamp every immediate sound late). Audible = audio clock + this.
  Object.defineProperty(AudioContext.prototype, 'outputLatency', { get: () => .02, configurable: true });
  Object.defineProperty(AudioContext.prototype, 'baseLatency', { get: () => .005, configurable: true });
  window.__src = []; window.__ev = []; window.__tag = null; window.__lastCall = null; let frame = 0;
  const raf = t => { frame = t; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  // the picture: a marked moment is shown on the next frame
  window.__mark = (kind, info, plus = 0) => { const t = performance.now(); requestAnimationFrame(f => window.__ev.push({ kind, info, t, f: f + plus })); };
  const st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when = 0, offset = 0, dur) {
    try {
      const c = this.context; if (c instanceof AudioContext && this.buffer && !this.loop) {   // bank entries share long buffers: only the played region counts
        const now = performance.now(), tag = window.__tag || (window.__lastCall && now - window.__lastCall.t < 120 ? window.__lastCall : null);
        const b = this.buffer, d = b.getChannelData(0), sr = b.sampleRate, i0 = Math.floor(offset * sr), i1 = Math.min(d.length, i0 + Math.floor((dur ? dur : .8) * sr));
        let pk = 0; for (let i = i0; i < i1; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
        let it = i0; while (it < i1 && Math.abs(d[it]) < pk * .5) it++;
        const rate = this.playbackRate.value, ct = c.currentTime, t0 = Math.max(when, ct), ta = t0 + (it - i0) / sr / rate;
        window.__src.push({ wall: now, ct, ta, pk, call: tag && tag.k, id: tag && tag.id, lat: (c.outputLatency || 0) + (c.baseLatency || 0) });   // as the deck's sndLat reads it
      }
    } catch (e) {}
    return st.call(this, when, offset, dur);
  };
};
const AFTER = () => {   // once the deck is up: tag sound calls, watch the slides
  const s = window.__deck.sound; let n = 0;
  for (const k of Object.keys(s)) {
    const d = Object.getOwnPropertyDescriptor(s, k); if (!d || typeof d.value !== 'function' || k === 'ok' || k === 'bedTo') continue;
    const f = d.value; s[k] = function (...a) {
      const outer = !window.__tag, o = a.find(x => x && typeof x === 'object') || {}, at = +o.at || 0;
      const tag = outer ? { k, id: ++n, t: performance.now(), at, ok: s.ok(), walk: window.__walk || '' } : window.__tag;
      if (outer) { window.__tag = tag; window.__lastCall = tag; (window.__calls = window.__calls || []).push(tag); if (!at && tag.ok) window.__mark('frame', { k, id: n }); }
      try { return f.apply(this, a); } finally { if (outer) window.__tag = null; }
    };
  }
  document.querySelectorAll('#slides > .slide').forEach(s => new MutationObserver(ms => { ms.forEach((m, j) => {
    // one record per class change: its new value is the next record's old value (the live class for the last one)
    const el = m.target, was = new Set((m.oldValue || '').split(/\s+/)), now = new Set((j + 1 < ms.length ? ms[j + 1].oldValue || '' : el.className).split(/\s+/)), id = el.id, added = c => now.has(c) && !was.has(c);
    if (added('hit')) window.__mark('hit', { id }); if (added('loosed')) window.__mark('loosed', { id });
    if (added('stamping')) window.__mark('stamp', { id }, 160 / (window.__rate || 1));   // the stamp's CSS runs at the deck's RATE
    if (added('on') && el.dataset.replay) window.__mark('replay', { id });
    for (const c of was) if (/^firing-\d$/.test(c) && !now.has(c)) window.__mark('firing', { id, c });
  }); }).observe(s, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] }));
};

(async () => {
  const b = await L.launch(), result = { file, rates: {} }; let bad = 0;
  for (const rate of rates) {
    const { ctx, page, log } = await L.open(b, file, { init: INIT });
    if (rate !== 1) { await page.keyboard.press('e'); await L.sleep(400); await page.evaluate(v => { const r = document.getElementById('ed-gs'); r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); }, rate); await L.sleep(600); await page.keyboard.press('e'); await L.sleep(400); await page.evaluate(() => window.__deck.go(0, { instant: true, force: true, hold: true })); await L.sleep(500); }
    await page.evaluate(r => { window.__rate = r; }, rate);
    await page.keyboard.press('m'); await page.waitForFunction(() => window.__deck.sound.ready, null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(AFTER);
    const clk = await page.evaluate(async () => { const c = window.__deck.sound.ctx, a0 = c.currentTime, w0 = performance.now(); await new Promise(r => setTimeout(r, 1500)); return (c.currentTime - a0) / ((performance.now() - w0) / 1000); });
    const S = await L.slides(page), rest = async () => {   // until the deck is idle and 1.5 s past the last sound the step scheduled;
      // an arrival rests at least 4.2 s of deck time (the lawless stamp is a timer 3.6 s after its arrival, not a scheduled sound)
      const t0 = await page.evaluate(() => performance.now()) - 300, arrival = await page.evaluate(() => / k0$/.test(window.__walk || '')); await L.sleep(250); await L.idle(page, 15000);
      await page.evaluate(async ([t0, r, arr]) => { const e = Math.max(performance.now() + 1500, arr ? t0 + 4200 / r : 0, ...(window.__calls || []).filter(c => c.t >= t0).map(c => c.t + c.at * 1000 / r + 1500)); while (performance.now() < e) await new Promise(q => setTimeout(q, 100)); }, [t0, rate, arrival]);
    };
    const go = label => page.evaluate(l => { window.__walk = l; window.__deck.next(); }, label);
    if (!only.length) { let g = 0; for (;;) { const [c0, k0] = await page.evaluate(() => [window.__deck.cur, window.__deck.step]); await go(k0 < S[c0].builds && !(await page.evaluate(() => window.__deck.standby)) ? `${S[c0].id} k${k0 + 1}` : `${S[Math.min(S.length - 1, (await page.evaluate(() => window.__deck.standby)) ? 0 : c0 + 1)].id} k0`); await rest(); const [c, k] = await page.evaluate(() => [window.__deck.cur, window.__deck.step]); if ((c === S.length - 1 && k >= S[c].builds) || ++g > 120) break; } }
    else for (const id of only) { const s = S.find(x => x.id === id); if (!s) continue; if (s.i === 0) { await page.evaluate(() => window.__deck.go(0, { instant: true, force: true, hold: true })); await L.sleep(800); } else { await L.settle(page, s.i - 1, 500); await L.sleep(800); } await go(`${s.id} k0`); await rest(); for (let k = 1; k <= s.builds; k++) { await go(`${s.id} k${k}`); await rest(); } }
    const { src, ev, calls } = await page.evaluate(() => ({ src: window.__src, ev: window.__ev, calls: window.__calls || [] }));
    const frameMs = 1000 / 60 * (+process.env.SYNC_FRAMES || 2), pairs = [], loose = [];
    for (const c of calls) {
      if (!c.ok || QUIET.has(c.k)) continue;
      const mine = src.filter(x => x.id === c.id); if (!mine.length) continue;
      const loud = mine.reduce((p, q) => q.pk > p.pk ? q : p), audible = loud.wall + (loud.ta - loud.ct) * 1000 + loud.lat * 1000;   // a real device's audio clock runs at wall rate
      const kinds = MAP[c.k] || ['frame'];
      const cand = ev.filter(e => kinds.includes(e.kind) && (e.kind !== 'frame' || e.info.id === c.id) && (e.kind === 'frame' ? !c.at : true)).map(e => ({ e, d: audible - (e.f + frameMs) }));
      // a call with no `at` was made on the frame that drew its moment: that frame is the anchor. A call scheduled ahead
      // (`at`) pairs with the nearest class event of its kind.
      const own = cand.find(x => x.e.kind === 'frame'), pick = own || cand.filter(x => x.e.kind !== 'frame').sort((p, q) => Math.abs(p.d) - Math.abs(q.d))[0];
      const where = c.walk;
      if (!pick || Math.abs(pick.d) > 400) { loose.push(`${where} ${c.k}${c.at ? ' at+' + c.at : ''}: no picture anchor within 400 ms`); continue; }
      pairs.push({ where, call: c.k, at: c.at, anchor: pick.e.kind + (pick.e.info.c ? ':' + pick.e.info.c : ''), offsetMs: Math.round(pick.d * 10) / 10, ok: Math.abs(pick.d) <= 34 });
    }
    const off = pairs.filter(p => !p.ok); bad += off.length;
    const os = pairs.map(p => p.offsetMs).sort((p, q) => p - q), med = os.length ? os[os.length >> 1] : 0, spread = Math.max(0, ...os.map(o => Math.abs(o - med)));
    const lat = src.length ? src[src.length - 1].lat : 0;
    console.log(`\nrate ${rate}: audio clock ${(clk * 100).toFixed(0)}% of wall time, output latency ${Math.round(lat * 1000)} ms; ${pairs.length} pairs, ${off.length} over 34 ms, median ${med} ms, spread ±${spread} ms`);
    for (const p of pairs) console.log(`  ${p.ok ? '  ' : '!!'} ${p.where.padEnd(13)} ${p.call.padEnd(7)} ${p.at ? ('at+' + p.at).padEnd(8) : '        '} vs ${p.anchor.padEnd(10)} ${String(p.offsetMs).padStart(5)} ms`);
    loose.forEach(x => console.log('     (unpaired) ' + x));
    result.rates[rate] = { clockRate: +clk.toFixed(3), latency: lat, medianMs: med, spreadMs: spread, pairs, unpaired: loose, errors: log, events: ev.map(e => [e.kind, e.info.id, Math.round(e.f)]), calls: calls.filter(c => c.ok).map(c => [c.k, c.walk, Math.round(c.t), c.at]) };
    await ctx.close();
  }
  L.fs.writeFileSync(outJson, JSON.stringify(result, null, 1));
  console.log(`\n${bad ? bad + ' pairs over 34 ms' : 'all pairs within 34 ms'}; log in ${outJson}`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
