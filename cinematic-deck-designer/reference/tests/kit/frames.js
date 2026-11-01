// usage: node frames.js <deck.html> <outdir> <slideId> [build] <ms,ms,...>
// Real-time frames of one moment: with no build, the slide's arrival from the previous slide (the cover: the first
// click from standby); with build k, build k fired from build k-1 on that slide. Frames at the given ms after the
// trigger -> f-<id>[-b<k>]-<ms>.png. A screenshot takes ~60-150 ms, so the real capture time is printed beside each.
const L = require('./lib');
const a = process.argv.slice(2), [file, out, id] = a, build = a.length > 4 ? +a[3] : 0, times = a[a.length - 1].split(',').map(Number);
(async () => {
  L.mkdir(out);
  const b = await L.launch(); const { page, log } = await L.open(b, file);
  await page.addStyleTag({ content: '#toast{display:none!important}' });
  const S = await L.slides(page), s = S.find(x => x.id === id);
  if (!s) { console.log('no slide', id, 'in', S.map(x => x.id).join(' ')); process.exit(2); }
  if (build) {
    await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), s.i);
    await L.sleep(400);
    for (let k = 1; k < build; k++) { await page.evaluate(() => window.__deck.next()); await L.sleep(3000); }   // no settle(): its .settled class would freeze the build's animations
  } else if (s.i > 0) { await L.settle(page, s.i - 1, 600); await L.sleep(700); }
  const tag = `f-${id}${build ? '-b' + build : ''}`, t0 = Date.now();
  await page.evaluate(() => window.__deck.next());
  for (const ms of times) {
    const d = t0 + ms - Date.now(); if (d > 0) await L.sleep(d);
    const at = Date.now() - t0, f = `${tag}-${ms}.png`; await page.screenshot({ path: L.path.join(out, f) });
    console.log(`${f}  (taken at ${at} ms)`);
  }
  console.log('errors:', log.length ? log : 'none');
  await b.close();
})();
