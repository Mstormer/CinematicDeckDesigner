// usage: node save.js <deck.html> <outdir>
// Saving (reference/deck-save.js), headless, with the file picker stubbed (a plain, storable handle; writes are captured):
//  1 the Save button reads "Save" before a file is chosen; the first Save asks once, suggesting the deck's own file name
//  2 a second Save writes straight back without asking; the button now reads "Save to <file>"
//  3 Save as… asks for "<name> copy.html" and writes there; Save still writes to the first file
//  4 after a reload the deck still knows its file: Save writes without asking
// Needs the editor's #ed-save / #ed-saveas buttons, E to open the editor, and window.__deck.enterEdit. Exit 1 on any failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const STUB = () => {
  window.__picks = []; window.__writes = [];
  // a handle the deck can keep in IndexedDB: plain data, with the file methods on the prototype
  Object.defineProperty(Object.prototype, 'createWritable', { configurable: true, enumerable: false, value: async function () { const h = this; let buf = ''; return { write: async b => { buf += typeof b === 'string' ? b : await b.text(); }, close: async () => { window.__writes.push({ name: h.name, bytes: buf.length }); } }; } });
  window.showSaveFilePicker = async o => { window.__picks.push(o.suggestedName); return { name: o.suggestedName.replace(/^.*\//, ''), kind: 'file' }; };
};
(async () => {
  L.mkdir(out); const b = await L.launch(); const { ctx, page, log } = await L.open(b, file);
  await ctx.addInitScript(STUB); await page.reload(); await L.ready(page); await L.sleep(600);
  const own = await page.evaluate(() => decodeURIComponent(location.pathname.split('/').pop()));
  await page.evaluate(() => window.__deck.enterEdit()); await L.sleep(400);
  const lbl = () => page.evaluate(() => document.getElementById('ed-save').textContent);
  ok(await lbl() === 'Save', `before a file is chosen the button reads "${await lbl()}"`);
  await page.click('#ed-save'); await L.sleep(600);
  let st = await page.evaluate(() => ({ picks: window.__picks.slice(), writes: window.__writes.slice() }));
  ok(st.picks.length === 1 && st.picks[0] === own && st.writes.length === 1 && st.writes[0].bytes > 10000, `the first Save asks once for "${st.picks[0]}" and writes ${st.writes[0] && st.writes[0].bytes} bytes`);
  await page.click('#ed-save'); await L.sleep(600);
  st = await page.evaluate(() => ({ picks: window.__picks.slice(), writes: window.__writes.slice() }));
  ok(st.picks.length === 1 && st.writes.length === 2, `a second Save writes straight back (${st.picks.length} pick, ${st.writes.length} writes)`);
  ok(await lbl() === `Save to ${own}`, `the button now reads "${await lbl()}"`);
  await page.click('#ed-saveas'); await L.sleep(600);
  st = await page.evaluate(() => ({ picks: window.__picks.slice(), writes: window.__writes.slice() }));
  const copy = own.replace(/\.html$/i, '') + ' copy.html';
  ok(st.picks[1] === copy && st.writes[2] && st.writes[2].name === copy, `Save as… asks for "${st.picks[1]}" and writes there`);
  await page.click('#ed-save'); await L.sleep(600);
  st = await page.evaluate(() => ({ picks: window.__picks.slice(), writes: window.__writes.slice() }));
  ok(st.picks.length === 2 && st.writes[3] && st.writes[3].name === own, `Save still writes to ${st.writes[3] && st.writes[3].name}`);
  await page.reload(); await L.ready(page); await L.sleep(900);
  await page.evaluate(() => window.__deck.enterEdit()); await L.sleep(400);
  const l2 = await lbl(); await page.click('#ed-save'); await L.sleep(700);
  st = await page.evaluate(() => ({ picks: window.__picks.slice(), writes: window.__writes.slice() }));
  ok(l2 === `Save to ${own}` && st.picks.length === 0 && st.writes.length === 1 && st.writes[0].name === own, `after a reload Save writes to ${own} without asking ("${l2}")`);
  await page.screenshot({ path: L.path.join(out, 'save.png') });
  ok(!log.some(e => /pageerror/.test(e)), `no page errors${log.length ? ': ' + log.slice(0, 3).join('; ') : ''}`);
  await b.close(); console.log(fails.length ? `${fails.length} FAILED` : 'all ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
