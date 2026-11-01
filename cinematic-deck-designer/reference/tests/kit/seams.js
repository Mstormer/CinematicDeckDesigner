// usage: node seams.js [--run 256] [--step .8] [--out dir] <png...>
// Straight seams: the edge of a layer, a band or a gradient that ends inside the frame, even a faint one under film grain and stars.
// The picture is averaged in 32 px blocks along the run and 4 px across it; a seam at row y is a run of blocks where the mean of rows y..y+3
// differs from rows y-4..y-1 by more than --step luma levels (0..255), with one sign, standing out 2x from the same difference 4 px above and
// below it (a step, not a ramp), over at least --run px. The same for columns. Text, props and frames also have long straight edges: read
// the marked copies (--out, seams in red) on world-only frames (arrivals.js --world), or compare before and after on the same frames.
const fs = require('fs'), path = require('path'), { PNG } = require('pngjs');
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf(k); if (i < 0) return d; const v = a[i + 1]; a.splice(i, 2); return v; };
const RUN = +opt('--run', 256), STEP = +opt('--step', .8), OUT = opt('--out', null), B = 32; if (OUT) fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const f of a) {
  const png = PNG.sync.read(fs.readFileSync(f)), W = png.width, H = png.height, d = png.data;
  const I = new Float64Array((W + 1) * (H + 1));   // integral image of luma
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; row += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  const box = (x0, y0, x1, y1) => { x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1); if (x1 <= x0 || y1 <= y0) return 0; return (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0)); };
  const hits = [];
  for (const ax of ['y', 'x']) {
    const N = ax === 'y' ? H : W, M = ax === 'y' ? W : H, nb = Math.floor(M / B);
    const dif = (p, j) => ax === 'y' ? box(j * B, p, j * B + B, p + 4) - box(j * B, p - 4, j * B + B, p) : box(p, j * B, p + 4, j * B + B) - box(p - 4, j * B, p, j * B + B);
    const raw = [];
    for (let p = 8; p < N - 8; p++) {
      for (const sg of [1, -1]) {
        let s0 = -1, acc = 0;
        for (let j = 0; j <= nb; j++) {
          let ok = false, dd = 0;
          if (j < nb) { dd = dif(p, j); ok = sg * dd > STEP && Math.abs(dd) > 2 * Math.max(Math.abs(dif(p - 4, j)), Math.abs(dif(p + 4, j))); }
          if (ok) { if (s0 < 0) { s0 = j; acc = 0; } acc += Math.abs(dd); }
          else if (s0 >= 0) { if ((j - s0) * B >= RUN) raw.push({ ax, p, s0: s0 * B, s1: j * B, step: acc / (j - s0) }); s0 = -1; }
        }
      }
    }
    // one hit per seam: neighbours within 3 px overlapping in run keep the strongest
    raw.sort((u, v) => v.step * (v.s1 - v.s0) - u.step * (u.s1 - u.s0));
    for (const r of raw) if (!hits.some(h => h.ax === r.ax && Math.abs(h.p - r.p) <= 3 && h.s0 < r.s1 && r.s0 < h.s1)) hits.push(r);
  }
  hits.sort((u, v) => u.ax.localeCompare(v.ax) || u.p - v.p);
  for (const h of hits) console.log(`${path.basename(f)}  ${h.ax}=${h.p}  run ${h.s0}-${h.s1} (${h.s1 - h.s0} px)  step ${h.step.toFixed(2)}`);
  total += hits.length;
  if (OUT && hits.length) {
    const put = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = 255; d[i + 1] = 0; d[i + 2] = 0; };
    for (const h of hits) for (let j = h.s0; j < h.s1; j++) for (const o of [-5, 5]) h.ax === 'y' ? put(j, h.p + o) : put(h.p + o, j);
    fs.writeFileSync(path.join(OUT, path.basename(f)), PNG.sync.write(png));
  }
}
console.log('seams:', total, 'in', a.length, 'images');
