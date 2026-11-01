// usage: node rm.js <deck.html> <outdir>
// Reduced motion (prefers-reduced-motion: reduce). Walks the whole talk with next() as a presenter would (the first
// click from standby, every build, every slide). After each step it waits 1.5 s, then takes two frames 400 ms apart:
// the step passes if under 0.1% of pixels change by more than 6/255 and no CSS/WAAPI animation is still running
// (infinite ones count). A moving step is looked at again at 4.4 s to tell 'settles late' from 'keeps moving'. Saves rm-NN-<id>-k<step>.png; exit 1 on any moving step or page error.
const L = require('./lib'); const { PNG } = require('pngjs');
const [file, out] = process.argv.slice(2);
const diff = (a, b) => { const A = PNG.sync.read(a).data, B = PNG.sync.read(b).data; let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) > 6 || Math.abs(A[i + 1] - B[i + 1]) > 6 || Math.abs(A[i + 2] - B[i + 2]) > 6) n++; return n / (A.length / 4); };
(async () => {
  L.mkdir(out);
  const b = await L.launch(); const { page, log } = await L.open(b, file, { reducedMotion: 'reduce' });
  await page.addStyleTag({ content: '#toast{display:none!important}' });
  const rm = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const S = await L.slides(page), bad = [];
  console.log('reduced motion media query:', rm);
  let guard = 0;
  for (;;) {
    await page.evaluate(() => window.__deck.next()); await L.idle(page, 6000); await L.sleep(1500);
    const st = await page.evaluate(() => ({ cur: window.__deck.cur, step: window.__deck.step, run: document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.id || 'anim') + '@' + ((a.effect && a.effect.target && (a.effect.target.id || a.effect.target.className && String(a.effect.target.className.baseVal ?? a.effect.target.className))) || '?').slice(0, 30)) }));
    const s = S[st.cur], f = `rm-${String(st.cur + 1).padStart(2, '0')}-${s.id}-k${st.step}.png`;
    const a1 = await page.screenshot({ path: L.path.join(out, f) }); await L.sleep(400); const a2 = await page.screenshot();
    const d = diff(a1, a2), ok = d < .001 && !st.run.length;
    console.log(`${ok ? 'still ' : 'MOVING'} ${f}  changed ${(d * 100).toFixed(3)}%${st.run.length ? '  running: ' + st.run.slice(0, 5).join(', ') : ''}`);
    if (!ok) {   // slow to settle, or never still? look again 2.5 s later
      await L.sleep(2500); const b1 = await page.screenshot(); await L.sleep(400); const b2 = await page.screenshot(), d2 = diff(b1, b2);
      const run2 = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
      console.log(`       at 4.4 s: changed ${(d2 * 100).toFixed(3)}%, ${run2} running -> ${d2 < .001 && !run2 ? 'settles late' : 'keeps moving'}`);
      bad.push(f);
    }
    if ((st.cur === S.length - 1 && st.step >= S[st.cur].builds) || ++guard > 120) break;
  }
  console.log(`errors: ${log.length ? log.join('\n  ') : 'none'}`);
  console.log(bad.length ? `${bad.length} steps still moving after 1.5 s` : 'every step still after 1.5 s');
  await b.close(); process.exit(bad.length || log.some(e => e.includes('pageerror')) ? 1 : 0);
})();
