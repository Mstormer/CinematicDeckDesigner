// usage: node edsz.js <deck.html> <outdir>
// The editor's size buttons: A+ / A- beside the Size % field and Alt+= / Alt+- change the selected element by 5%,
// and the label reads "Text size %" for a single text element. Exit 1 on any failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
(async () => {
  L.mkdir(out); const b = await L.launch(); const { page, log } = await L.open(b, file);
  await L.settle(page, 1, 600); await L.sleep(800);
  await page.keyboard.press('e'); await L.sleep(400);
  const t = await page.evaluate(() => { const e = [...document.querySelectorAll('#slides > .slide.on [data-et]')].filter(x => !x.querySelector('[data-et]') && x.getBoundingClientRect().width > 40)[0]; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.click(t[0], t[1]); await L.sleep(250);
  const rd = () => page.evaluate(() => ({ v: +document.getElementById('ed-s').value / 100, lbl: document.getElementById('ed-sl').textContent }));
  const r0 = await rd(); ok(r0.lbl === 'Text size %', `a text element is labelled "${r0.lbl}"`);
  await page.click('#ed-sp'); await page.click('#ed-sp'); const r1 = await rd(); await page.click('#ed-sm'); const r2 = await rd();
  ok(Math.abs(r1.v - (r0.v + .1)) < .001 && Math.abs(r2.v - (r0.v + .05)) < .001, `A+ / A- step 5% (${r0.v} -> ${r1.v} -> ${r2.v})`);
  await page.keyboard.press('Alt+Equal'); const r3 = await rd(); await page.keyboard.press('Alt+Minus'); await page.keyboard.press('Alt+Minus'); const r4 = await rd();
  ok(Math.abs(r3.v - (r2.v + .05)) < .001 && Math.abs(r4.v - (r3.v - .1)) < .001, `Alt+= / Alt+- step 5% (${r2.v} -> ${r3.v} -> ${r4.v})`);
  await page.keyboard.press('Escape'); await L.sleep(200);
  const blk = await page.evaluate(() => { const e = document.querySelector('#slides > .slide.on [data-e]:not([data-et])'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + 4, r.y + 4]; });
  await page.screenshot({ path: L.path.join(out, 'edsz.png') });
  ok(!log.some(e => /pageerror/.test(e)), 'no page errors');
  await b.close(); console.log(fails.length ? `${fails.length} FAILED` : 'all ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
