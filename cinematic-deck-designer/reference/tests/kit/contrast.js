// usage: node contrast.js <deck.html> <outdir> [slideIds...]
// Text contrast against what is really behind it. Each slide is settled with every build shown and rendered twice:
// with its text (A) and with only the glyphs hidden (B: text nodes wrapped in <x-t style="visibility:hidden">, SVG <text>
// hidden), so cards, glows and the world stay. For each visible text line (its glyph core box): the text luminance is the
// median of A's pixels that differ most from B (glyph cores); the contrast is WCAG's (L1+.05)/(L2+.05) against every
// B pixel in the box, and the line's score is the worst decile (10th percentile). Flags < 4.5 for text under 32 px on the
// stage, < 3 for larger. Writes contrast.json and c-<id>-a.png / c-<id>-b.png. Exit 0 always (it is a measurement).
const L = require('./lib'); const { PNG } = require('pngjs');
const [file, out, ...only] = process.argv.slice(2);
const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
const lum = (d, i) => .2126 * lin(d[i]) + .7152 * lin(d[i + 1]) + .0722 * lin(d[i + 2]);

function lines() {   // in the page: visible text lines of the slide on stage, in device px (the stage is 1:1 at 1920x1080)
  const s = document.querySelector('#slides > .slide.on'), out = [];
  const seen = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < .05) return false; } return true; };
  const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT); let n; const by = new Map();
  while ((n = w.nextNode())) {
    const el = n.parentElement; if (!n.textContent.trim() || el.closest('aside, script, style') || !seen(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const q of r.getClientRects()) {
      if (q.width < 4 || q.height < 4) continue;
      const key = (el.closest('[data-e]') || el).dataset.e + '|' + Math.round(q.top / 6);
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const b = by.get(key) || { text: '', x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, fs: 0 };
      b.text += n.textContent; b.x0 = Math.min(b.x0, q.left); b.x1 = Math.max(b.x1, q.right); b.y0 = Math.min(b.y0, q.top + q.height * .17); b.y1 = Math.max(b.y1, q.bottom - q.height * .17); b.fs = Math.max(b.fs, fs);
      by.set(key, b);
    }
  }
  for (const b of by.values()) out.push({ text: b.text.replace(/\s+/g, ' ').trim().slice(0, 48), x: Math.round(b.x0), y: Math.round(b.y0), w: Math.round(b.x1 - b.x0), h: Math.round(b.y1 - b.y0), fs: Math.round(b.fs) });
  return out;
}
function hideGlyphs() {
  const s = document.querySelector('#slides > .slide.on'), w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT), list = []; let n;
  while ((n = w.nextNode())) if (n.textContent.trim() && !n.parentElement.closest('aside, script, style, svg')) list.push(n);
  for (const t of list) { const x = document.createElement('x-t'); t.replaceWith(x); x.appendChild(t); }
  return () => { document.querySelectorAll('.slide.on x-t').forEach(x => { x.style.visibility = 'hidden'; }); document.querySelectorAll('.slide.on svg text').forEach(t => { t.style.visibility = 'hidden'; }); };
}

(async () => {
  L.mkdir(out);
  const b = await L.launch(); const { page, log } = await L.open(b, file);
  await page.addStyleTag({ content: '#toast{display:none!important}' });
  const S = (await L.slides(page)).filter(s => !only.length || only.includes(s.id)), res = {};
  for (const s of S) {
    await L.settle(page, s.i, s.i === 0 ? 900 : 700); await L.sleep(300);
    await page.evaluate(() => { window.__hide = null; }); await page.evaluate(`window.__hide = (${hideGlyphs})()`);
    await L.sleep(100);
    const L1 = await page.evaluate(lines), A = PNG.sync.read(await page.screenshot({ path: L.path.join(out, `c-${s.id}-a.png`) }));
    await page.evaluate(() => window.__hide()); await L.sleep(100);
    const B = PNG.sync.read(await page.screenshot({ path: L.path.join(out, `c-${s.id}-b.png`) }));
    const W = A.width, rows = [];
    for (const ln of L1) {
      const px = [], bg = [];
      for (let y = Math.max(0, ln.y); y < Math.min(A.height, ln.y + ln.h); y++) for (let x = Math.max(0, ln.x); x < Math.min(W, ln.x + ln.w); x++) {
        const i = (y * W + x) * 4, d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
        bg.push(lum(B.data, i)); if (d > 60) px.push([d, lum(A.data, i)]);
      }
      if (px.length < 8) continue;   // nothing drawn (a fully transparent line)
      px.sort((p, q) => q[0] - p[0]); const core = px.slice(0, Math.max(4, Math.floor(px.length * .3))).map(p => p[1]).sort((p, q) => p - q), Lt = core[core.length >> 1];
      const cr = bg.map(Lb => (Math.max(Lt, Lb) + .05) / (Math.min(Lt, Lb) + .05)).sort((p, q) => p - q);
      const p10 = cr[Math.floor(cr.length * .1)], med = cr[cr.length >> 1], need = ln.fs >= 32 ? 3 : 4.5;
      rows.push({ ...ln, p10: +p10.toFixed(2), median: +med.toFixed(2), need, low: p10 < need });
    }
    rows.sort((p, q) => p.p10 - q.p10); res[s.id] = rows;
    const low = rows.filter(r => r.low);
    console.log(`${s.id.padEnd(9)} ${rows.length} lines, worst ${rows[0] ? rows[0].p10 : '-'}${low.length ? `  LOW ${low.length}: ` + low.slice(0, 4).map(r => `"${r.text}" ${r.fs}px p10 ${r.p10} (med ${r.median})`).join('; ') : ''}`);
  }
  L.fs.writeFileSync(L.path.join(out, 'contrast.json'), JSON.stringify(res, null, 1));
  console.log(`errors: ${log.length ? log.join('\n  ') : 'none'}`);
  await b.close();
})();
