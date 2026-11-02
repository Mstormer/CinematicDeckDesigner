// usage: node ed.js <deck.html> <outdir>
// The slide editor (reference/deck-editor.js), headless at 1920x1080, on the first slide with a group of two or more text elements:
//  1 E opens the panel; no plug-in sections or light-image controls unless the deck supplies them; Save / Save as… labels; tips
//  2 click selects the group, click again selects the text inside it; labels "Size %" (group) and "Text size %" (text)
//  3 drag moves it; the side handle sets the width; the corner handle resizes
//  4 arrows nudge 1 px, Shift 10; Size % field; A- / A+ and Alt+- / Alt+= step 5%
//  5 Delete hides; Ctrl/Cmd+Z undoes, Shift+Z redoes
//  6 Enter types, Esc finishes; Esc climbs to the group, then lets go; › / PgDn change slides; Ctrl/Cmd+S saves; E / Done return
// Screenshots ed-*.png. Exit 1 on any failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const STUB = () => { window.__saved = 0; window.showSaveFilePicker = async o => ({ name: 'captured.html', createWritable: async () => ({ write: async () => {}, close: async () => { window.__saved++; } }) }); };
(async () => {
  L.mkdir(out); const b = await L.launch(); const { page, log } = await L.open(b, file, { init: STUB });
  const gi = await page.evaluate(() => [...document.querySelectorAll('#slides > .slide')].findIndex(s => [...s.querySelectorAll('[data-e]')].some(g => !g.parentElement.closest('[data-e]') && g.querySelectorAll('[data-e]').length >= 2 && getComputedStyle(g).display !== 'none')));
  await page.evaluate(i => window.__deck.go(i, { instant: true, toEnd: true, force: true }), gi); await L.idle(page); await L.sleep(800);
  await page.keyboard.press('e'); await L.sleep(600);
  const p1 = await page.evaluate(() => ({ on: document.body.classList.contains('edit') && !document.getElementById('ed').hidden, plug: document.querySelectorAll('#ed .ed-plug, #ed .ed-link').length,
    light: /light image|particle|light rays/i.test(document.getElementById('ed').textContent), save: document.getElementById('ed-save').textContent, as: document.getElementById('ed-saveas').textContent, tips: document.querySelector('#ed .ed-tips summary').textContent }));
  ok(p1.on, 'E opens the editor panel');
  ok(p1.plug === 0 && !p1.light, `no plug-in sections or light-image controls without a plug-in (${p1.plug})`);
  ok(p1.save === 'Save' && p1.as === 'Save as…' && p1.tips === 'How editing works', `"${p1.save}", "${p1.as}", "${p1.tips}"`);
  // the group and a text inside it
  const G = await page.evaluate(() => { const s = document.querySelector('#slides > .slide.on'), g = [...s.querySelectorAll('[data-e]')].find(g => !g.parentElement.closest('[data-e]') && g.querySelectorAll('[data-e]').length >= 2 && getComputedStyle(g).display !== 'none'); const t = g.querySelector('[data-et]'), r = t.getBoundingClientRect(); return { g: g.dataset.e, t: t.dataset.e, sid: s.id, x: r.x + Math.min(20, r.width / 2), y: r.y + r.height / 2 }; });
  const rec = k => page.evaluate(([sid, k]) => JSON.parse(JSON.stringify((((window.__deck.state().slides[sid] || {}).els) || {})[k] || {})), [G.sid, k]);
  const selK = () => page.evaluate(() => { const s = window.__deck.editor.sel; return s && s.dataset ? s.dataset.e : null; });
  const lbl = () => page.evaluate(() => document.getElementById('ed-sl').textContent);
  await page.mouse.click(G.x, G.y); await L.sleep(200);
  ok(await selK() === G.g && await lbl() === 'Size %', `a click selects the group (${await selK()}, "${await lbl()}")`);
  await page.mouse.click(G.x, G.y); await L.sleep(200);
  ok(await selK() === G.t && await lbl() === 'Text size %', `a second click selects the text inside it (${await selK()}, "${await lbl()}")`);
  await page.keyboard.press('Escape'); await L.sleep(100); ok(await selK() === G.g, 'Esc climbs back to the group');
  // drag moves
  await page.mouse.move(G.x, G.y); await page.mouse.down(); await page.mouse.move(G.x + 40, G.y + 30, { steps: 5 }); await page.mouse.up(); await L.sleep(200);
  let r = await rec(G.g); ok(r.x && r.y, `dragging moves it (${r.x}, ${r.y})`);
  // side handle: width; corner handle: size
  const hd = q => page.evaluate(q => { const e = document.querySelector(q).getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; }, q);
  let h = await hd('#sel .hd-w'); await page.mouse.move(h[0], h[1]); await page.mouse.down(); await page.mouse.move(h[0] + 80, h[1], { steps: 5 }); await page.mouse.up(); await L.sleep(200);
  r = await rec(G.g); ok(r.w > 0, `the side handle sets the width (${r.w} px)`);
  h = await hd('#sel .hd-s'); await page.mouse.move(h[0], h[1]); await page.mouse.down(); await page.mouse.move(h[0] + 60, h[1] + 30, { steps: 5 }); await page.mouse.up(); await L.sleep(200);
  r = await rec(G.g); ok(r.s > 1.02, `the corner handle resizes (${r.s})`);
  await page.screenshot({ path: L.path.join(out, 'ed-group.png') });
  // nudge
  const x0 = (await rec(G.g)).x || 0; await page.keyboard.press('ArrowRight'); const x1 = (await rec(G.g)).x; await page.keyboard.press('Shift+ArrowRight'); const x2 = (await rec(G.g)).x;
  ok(x1 === x0 + 1 && x2 === x0 + 11, `arrows nudge 1, Shift 10 (${x0} -> ${x1} -> ${x2})`);
  // size: field, buttons, keys
  await page.fill('#ed-s', '120'); await L.sleep(100); const sz = (await rec(G.g)).s;
  await page.click('#ed-sp'); const a1 = (await rec(G.g)).s; await page.click('#ed-sm'); await page.click('#ed-sm'); const a2 = (await rec(G.g)).s;
  await page.mouse.move(5, 5); await page.keyboard.press('Alt+Equal'); const a3 = (await rec(G.g)).s; await page.keyboard.press('Alt+Minus'); const a4 = (await rec(G.g)).s;
  ok(Math.abs(sz - 1.2) < .001 && Math.abs(a1 - 1.25) < .001 && Math.abs(a2 - 1.15) < .001 && Math.abs(a3 - 1.2) < .001 && Math.abs(a4 - 1.15) < .001, `Size % 120 -> ${sz}; A+ ${a1}, A- A- ${a2}; Alt+= ${a3}, Alt+- ${a4}`);
  // hide, undo, redo
  await page.keyboard.press('Delete'); const hid = (await rec(G.g)).hide; await page.keyboard.press('ControlOrMeta+z'); const un = (await rec(G.g)).hide; await page.keyboard.press('ControlOrMeta+Shift+z'); const re = (await rec(G.g)).hide;
  ok(hid === true && !un && re === true, `Delete hides (${hid}), Ctrl/Cmd+Z undoes (${!!un}), Shift+Z redoes (${re})`);
  await page.keyboard.press('ControlOrMeta+z'); await L.sleep(100);
  // typing
  await page.mouse.click(G.x + 40, G.y + 30); await L.sleep(150); if (await selK() !== G.t) { await page.mouse.click(G.x + 40, G.y + 30); await L.sleep(150); }
  await page.keyboard.press('Enter'); await L.sleep(150);
  const typing = await page.evaluate(() => !!document.querySelector('#slides [contenteditable=true]'));
  await page.keyboard.press('End'); await page.keyboard.type(' EDCHECK'); await page.keyboard.press('Escape'); await L.sleep(200);
  r = await rec(G.t); ok(typing && /EDCHECK/.test(r.html || ''), `Enter types and Esc keeps it (${(r.html || '').slice(-30)})`);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await L.sleep(100); ok(await selK() === null && await page.evaluate(() => document.body.classList.contains('edit')), 'Esc lets go of the selection, the editor stays open');
  // slides and save
  await page.click('#ed-next'); await L.sleep(400); const c1 = await page.evaluate(() => window.__deck.cur); await page.keyboard.press('PageDown'); await L.sleep(400); const c2 = await page.evaluate(() => window.__deck.cur); await page.keyboard.press('PageUp'); await L.sleep(400); const c3 = await page.evaluate(() => window.__deck.cur);
  ok(c1 === gi + 1 && c2 === gi + 2 && c3 === gi + 1, `› and Page Down/Up change slides (${gi + 1} -> ${c1 + 1} -> ${c2 + 1} -> ${c3 + 1})`);
  await page.keyboard.press('ControlOrMeta+s'); await page.waitForFunction(() => window.__saved > 0, null, { timeout: 4000 }).catch(() => {});
  ok(await page.evaluate(() => window.__saved) > 0, 'Ctrl/Cmd+S saves');
  await page.screenshot({ path: L.path.join(out, 'ed-panel.png') });
  await page.keyboard.press('e'); await L.sleep(400); const off1 = await page.evaluate(() => !document.body.classList.contains('edit'));
  await page.keyboard.press('e'); await L.sleep(400); await page.click('#ed-done'); await L.sleep(400); const off2 = await page.evaluate(() => !document.body.classList.contains('edit'));
  ok(off1 && off2, 'E and Done return to presenting');
  ok(!log.some(e => /pageerror/.test(e)), `no page errors${log.length ? ': ' + log.slice(0, 3).join('; ') : ''}`);
  await b.close(); console.log(fails.length ? `${fails.length} FAILED` : 'all ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
