// usage: node snd.js <deck.html> <out.json>
// Sound log. Taps the deck's AudioContext output (every connect() to its destination also feeds an AnalyserNode) and
// wraps each method of the deck's sound object to log the call (wall time, slide, build, whether sound.ok()).
// Turns sound on with M (a real key press), waits for the bank, then walks the talk with next() from standby, every
// build and slide, waiting for the deck to come to rest and 3 s past the last sound the step scheduled. Reports per step: the calls, and the output's
// peak and RMS (dBFS) over that step. Checks: nothing sounds before M; the hush slide (the sacred, silent one) makes no event calls and
// its output stays under -50 dBFS RMS after its first second; the master never passes -0.3 dBFS; and a flush test:
// a flight is followed, the moment it lands (go() refuses while busy), by a jump to the hush slide: from 600 ms after
// the jump the output must stay under -50 dBFS RMS (the cut lets go of the impact, its tail and anything scheduled ahead).
// Also measures the audio clock against wall time (headless Chrome on this Mac can run it slow). Exit 1 on failure.
const L = require('./lib');
const [file, outJson] = process.argv.slice(2);
const QUIET = new Set(['bedTo', 'ok', 'cut', 'varispeed', 'toggle', 'init', 'thud', 'unfreeze']);   // housekeeping, or calls that only move gains

const INIT = () => {
  const orig = AudioNode.prototype.connect; window.__meter = [];
  AudioNode.prototype.connect = function (dst, ...r) {
    const ret = orig.call(this, dst, ...r);
    try {
      if (dst instanceof AudioDestinationNode && this.context instanceof AudioContext) {
        const c = this.context;
        if (!c.__an) {
          c.__an = c.createAnalyser(); c.__an.fftSize = 2048; const buf = new Float32Array(2048);
          window.__ctx = c;
          setInterval(() => { c.__an.getFloatTimeDomainData(buf); let pk = 0, s = 0; for (const v of buf) { const a = Math.abs(v); if (a > pk) pk = a; s += v * v; } window.__meter.push([performance.now(), pk, Math.sqrt(s / buf.length), c.currentTime]); if (window.__meter.length > 200000) window.__meter.shift(); }, 20);
        }
        orig.call(this, c.__an);
      }
    } catch (e) {}
    return ret;
  };
};
const db = v => v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120;

(async () => {
  const b = await L.launch(); const { page, log } = await L.open(b, file, { init: INIT });
  const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
  ok(await page.evaluate(() => !window.__ctx && !window.__deck.sound.on), 'no audio before M');
  await page.keyboard.press('m');
  await page.waitForFunction(() => window.__deck.sound.ready, null, { timeout: 30000 }).catch(() => {});
  ok(await page.evaluate(() => window.__deck.sound.on && window.__deck.sound.ready), 'M turns sound on and the bank is ready');
  // wrap the sound object's methods
  await page.evaluate(() => {
    const s = window.__deck.sound, D = window.__deck; window.__calls = []; let depth = 0;
    for (const k of Object.keys(s)) {
      const d = Object.getOwnPropertyDescriptor(s, k); if (!d || typeof d.value !== 'function') continue;
      const f = d.value; s[k] = function (...a) { if (k !== 'bedTo' && k !== 'ok') window.__calls.push({ t: performance.now(), k, cur: D.cur, step: D.step, ok: s.ok(), nested: depth > 0, at: +((a.find(x => x && typeof x === 'object') || {}).at) || 0, a: JSON.stringify(a).slice(0, 80) }); depth++; try { return f.apply(this, a); } finally { depth--; } };
    }
  });
  // the audio clock against the wall clock
  const clk = await page.evaluate(async () => { const c = window.__ctx, a0 = c.currentTime, w0 = performance.now(); await new Promise(r => setTimeout(r, 2000)); return (c.currentTime - a0) / ((performance.now() - w0) / 1000); });
  console.log(`audio clock runs at ${(clk * 100).toFixed(0)}% of wall time${clk < .9 ? ' (slow: sounds land late and stretched in wall time; sync.js projects onto the wall clock)' : ''}`);
  const S = await L.slides(page), steps = [];
  let guard = 0;
  for (;;) {
    const t0 = await page.evaluate(() => performance.now());
    await page.evaluate(() => window.__deck.next()); await L.sleep(300); await L.idle(page, 12000);
    // rest: 3 s of tails after the last sound the step scheduled (a build can schedule its impact 4 s ahead)
    await page.evaluate(async t0 => { const end = () => Math.max(performance.now() + 3000, ...window.__calls.filter(c => c.t >= t0).map(c => c.t + c.at * 1000 + 3000)); const e = end(); while (performance.now() < e) await new Promise(r => setTimeout(r, 100)); }, t0);
    const st = await page.evaluate(() => [window.__deck.cur, window.__deck.step]);
    const r = await page.evaluate(([t0]) => { const t1 = performance.now(), m = window.__meter.filter(x => x[0] >= t0 && x[0] < t1), late = m.filter(x => x[0] >= t0 + 1000); return { calls: window.__calls.filter(c => c.t >= t0 && c.t < t1), pk: Math.max(0, ...m.map(x => x[1])), rms: Math.sqrt(m.reduce((a, x) => a + x[2] * x[2], 0) / Math.max(1, m.length)), lateRms: Math.max(0, ...late.map(x => x[2])), t0, t1 }; }, [t0]);
    const s = S[st[0]], ev = r.calls.filter(c => !QUIET.has(c.k) && !c.nested);
    steps.push({ id: s.id, step: st[1], peakDb: db(r.pk), rmsDb: db(r.rms), lateMaxRmsDb: db(r.lateRms), calls: r.calls.map(c => ({ t: Math.round(c.t - t0), k: c.k, ok: c.ok, nested: c.nested, a: c.a })) });
    console.log(`${(s.id + ' k' + st[1]).padEnd(13)} peak ${String(db(r.pk)).padStart(6)} dBFS  rms ${String(db(r.rms)).padStart(6)}  ${ev.map(c => `${c.k}@${Math.round(c.t - t0)}${c.ok ? '' : '(off)'}`).join(' ')}`);
    if (s.hush) {
      ok(!ev.some(c => c.ok), `${s.id} k${st[1]} makes no event calls while sound is on (${ev.map(c => c.k).join(' ') || 'none'})`);
      ok(db(r.lateRms) < -50, `${s.id} k${st[1]} output after its first second stays under -50 dBFS RMS (max ${db(r.lateRms)})`);
    }
    if ((st[0] === S.length - 1 && st[1] >= s.builds) || ++guard > 120) break;
  }
  const allPk = Math.max(...steps.map(x => x.peakDb)); ok(allPk <= -0.3, `master peak ${allPk} dBFS (soft clip holds)`);
  // flush: a flight, then a jump to the hush slide the moment it lands
  const hush = S.find(s => s.hush), fl = S.find((s, i) => i > 1 && s.part !== S[i - 1].part && !s.trans && s !== hush);
  if (hush && fl) {
    await L.settle(page, fl.i - 1, 600); await L.sleep(1500);
    const t0 = await page.evaluate(() => performance.now());
    await page.evaluate(() => window.__deck.next()); await L.sleep(300);
    await page.evaluate(i => { const D = window.__deck; const w = () => { if (D.busy) return setTimeout(w, 20); D.go(i, { instant: true, force: true }); window.__jump = performance.now(); }; w(); }, hush.i);
    await L.sleep(4000);
    const r = await page.evaluate(([t0]) => { const m = window.__meter.filter(x => x[0] >= window.__jump + 600); return { rms: Math.max(0, ...m.map(x => x[2])), calls: window.__calls.filter(c => c.t >= t0).map(c => c.k + (c.ok ? '' : '(off)')) }; }, [t0]);
    ok(db(r.rms) < -50, `flush: a flight into ${fl.id} then a jump to ${hush.id} as it lands, max RMS from 600 ms after the jump ${db(r.rms)} dBFS (calls: ${r.calls.join(' ')})`);
  }
  L.fs.writeFileSync(outJson, JSON.stringify({ file, audioClockRate: +clk.toFixed(3), steps, fails, errors: log }, null, 1));
  console.log(`errors: ${log.length ? log.join('\n  ') : 'none'}`);
  console.log(fails.length ? `${fails.length} failures` : 'sound: all ok'); console.log('log in', outJson);
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
