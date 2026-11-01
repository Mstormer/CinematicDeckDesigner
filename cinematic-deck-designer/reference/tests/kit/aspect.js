// usage: node aspect.js <deck.html> <outdir> <WxH,WxH,...> [ids...]
// Each slide settled (all builds) at each window size, saved as a-<W>x<H>-NN-<id>.png: the letterbox, the stage edges, the world's layers at
// other aspect ratios than 16:9.
const L = require('./lib');
const [file, out, sizes, ...ids] = process.argv.slice(2);
(async () => {
  L.mkdir(out); const b = await L.launch();
  for (const sz of sizes.split(',')) {
    const [w, h] = sz.split('x').map(Number);
    const { page, log, ctx } = await L.open(b, file, { viewport: { width: w, height: h } });
    await page.addStyleTag({ content: '#toast{display:none!important}' });
    const S = await L.slides(page);
    for (const s of S) { if (ids.length && !ids.includes(s.id)) continue; await L.settle(page, s.i, 900); await page.screenshot({ path: L.path.join(out, `a-${sz}-${String(s.i + 1).padStart(2, '0')}-${s.id}.png`) }); }
    console.log(sz, 'errors:', log.length ? log : 'none'); await ctx.close();
  }
  await b.close();
})();
