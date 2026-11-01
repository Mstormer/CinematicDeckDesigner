// usage: node perf.js <deck.html> [ids...]   e.g. node perf.js ../out/mark4.html cover split lawless stay
// Frame pacing while each named slide's arrival plays (the cover means the opening from standby).
// Prints mean / p95 / worst frame time and the share of frames over 20 ms and over 33 ms. Headless numbers are relative: compare builds, not machines.
// PERF_CPU=4 node perf.js ... throttles the CPU 4x (CDP) to stand in for a slower presenting laptop; on a fast Mac the
// unthrottled run sits at 16.7 ms everywhere and cannot tell builds apart.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const file = path.resolve(process.argv[2]), ids = process.argv.slice(3);
  const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  if (+process.env.PERF_CPU > 1) { const c = await p.context().newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: +process.env.PERF_CPU }); console.log(`CPU throttled ${process.env.PERF_CPU}x`); }
  await p.goto(require('url').pathToFileURL(file).href); await p.waitForTimeout(1200);
  const all = [];
  for (const id of ids.length ? ids : ['cover']) {
    const idx = await p.evaluate(id => [...document.querySelectorAll('#slides > .slide')].findIndex(s => s.id === id), id);
    if (idx < 0) { console.log(id, 'not found'); continue; }
    if (idx === 0) { await p.reload(); await p.waitForTimeout(1200); }
    else { await p.evaluate(i => window.__deck.go(i - 1, { instant: true, toEnd: true, force: true }), idx); await p.waitForTimeout(1500); }
    const r = await p.evaluate(async idx => {
      const D = window.__deck, ts = []; let last = performance.now(), run = true;
      const tick = now => { ts.push(now - last); last = now; if (run) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      if (idx === 0) D.next(); else { let g = 0; while (D.cur !== idx && g++ < 12) { D.next(); await new Promise(r => setTimeout(r, 60)); } }
      await new Promise(r => setTimeout(r, 3600)); run = false;
      const s = ts.slice(2).sort((a, b) => a - b), n = s.length, mean = s.reduce((a, b) => a + b, 0) / n;
      return { n, mean: +mean.toFixed(1), p95: +s[Math.floor(n * .95)].toFixed(1), worst: +s[n - 1].toFixed(1), over20: +(s.filter(x => x > 20).length / n * 100).toFixed(1), over33: +(s.filter(x => x > 33).length / n * 100).toFixed(1) };
    }, idx);
    all.push({ id, ...r });
    console.log(`${id.padEnd(10)} frames ${r.n}  mean ${r.mean} ms  p95 ${r.p95}  worst ${r.worst}  >20ms ${r.over20}%  >33ms ${r.over33}%`);
  }
  console.log('errors', errors);
  await b.close();
})();
