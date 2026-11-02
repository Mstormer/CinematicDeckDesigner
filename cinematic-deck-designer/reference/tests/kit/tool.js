// usage: node tool.js <deck.html> <outdir>
// The presenter toolkit, end to end, headless:
//  1 speaker view: S opens it; it mirrors the slide on stage ("n/N" with the title as its tooltip, the Now preview) and follows next()
//  2 cue words: __deck.hear(<a build's cue word>) brings that build in; at the last build, the next slide's cue word moves on
//  3 timing: T opens the timing panel with a target for every slide; targets show in the panel
//  4 editor: E, select a text block, resize it and retype it, Save (showSaveFilePicker is stubbed to capture the file)
//    -> edited.html in outdir; opened fresh (no localStorage), the edits are there; the saved file passes a syntax check
//  5 speed: the editor's global speed at 0.5x and 2x stretches and shrinks a flight's duration (busy time)
//  6 the API: window.__deck has go next prev cur step busy N settle hear standby sound
// Screenshots tool-*.png. Exit 1 on any failure.
const L = require('./lib'); const { execFileSync } = require('child_process');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const STUB = () => { window.showSaveFilePicker = async o => ({ name: 'captured.html', createWritable: async () => { let buf = ''; return { write: async b => { buf += typeof b === 'string' ? b : await b.text(); }, close: async () => { window.__saved = buf; } }; } }); };

(async () => {
  L.mkdir(out);
  const b = await L.launch();
  // ---- 6 API, 1 speaker view, 2 cues, 3 timing
  {
    const { ctx, page, log } = await L.open(b, file);
    const api = await page.evaluate(() => ['go', 'next', 'prev', 'cur', 'step', 'busy', 'N', 'settle', 'hear', 'standby', 'sound'].filter(k => !(k in window.__deck)));
    ok(!api.length, `__deck API complete${api.length ? ' (missing ' + api + ')' : ''}`);
    const S = await L.slides(page);
    const popP = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await page.keyboard.press('s'); const sv = await popP;
    ok(!!sv, 'S opens the speaker view');
    if (sv) {
      await sv.setViewportSize({ width: 1440, height: 880 });
      const read = () => sv.evaluate(() => { const f = document.getElementById('pnow'), sl = f && f.contentDocument && f.contentDocument.querySelector('.slide'); return { t: document.getElementById('ti').textContent, c: document.getElementById('ti').title, now: sl ? sl.dataset.title : '', notes: document.getElementById('nt').textContent.length }; });
      await L.settle(page, 2, 600); await L.sleep(1300);
      let r = await read();
      ok(r.now === S[2].title && r.t === `3/${S.length}` && r.c === S[2].title && r.notes > 20, `speaker view mirrors slide 3 (${r.now}, "${r.t} ${r.c}", notes ${r.notes} chars)`);
      await sv.screenshot({ path: L.path.join(out, 'tool-speaker.png') });
      await page.evaluate(() => window.__deck.next()); await L.idle(page); await L.sleep(500);
      r = await read(); const cur = await page.evaluate(() => [window.__deck.cur, window.__deck.step]);
      ok(r.now === S[cur[0]].title && r.t === `${cur[0] + 1}/${S.length}` && r.c === S[cur[0]].title, `speaker view follows next() (${r.now}, "${r.t}")`);
    }
    // cue words: the first slide with builds and cues after the cover
    const cueS = await page.evaluate(() => [...document.querySelectorAll('#slides > .slide')].map((s, i) => ({ i, b: (s.querySelector('[data-step="1"][data-cue]') || s.querySelector('[data-step="1"]') || {}).dataset?.cue || '', max: window.__deck.maxStep(i) })).filter(x => x.i > 0 && x.b && x.max >= 1));
    if (cueS.length) {
      const c = cueS[0]; await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), c.i); await L.sleep(900);
      // speech recognition hands over the whole running transcript each time, so the test does too
      const w = c.b.split(',')[0].trim(); let said = 'and then ' + w; await page.evaluate(t => window.__deck.hear(t), said); await L.sleep(300);
      const st = await page.evaluate(() => window.__deck.step); ok(st === 1, `cue word "${w}" brings build 1 of ${S[c.i].id} (step ${st})`);
      await L.settle(page, c.i, 300); await L.sleep(2800);
      const nx = await page.evaluate(i => (document.querySelectorAll('#slides > .slide')[i + 1].dataset.cue || '').split(',')[0].trim(), c.i);
      said += ' so ' + nx; await page.evaluate(t => window.__deck.hear(t), said); await L.sleep(300);
      const cur = await page.evaluate(() => window.__deck.cur); ok(cur === c.i + 1, `next slide's cue "${nx}" moves on (now slide ${cur + 1})`);
      await L.idle(page);
    } else ok(false, 'no slide with a build cue found');
    // timing panel
    await page.keyboard.press('t'); await L.sleep(300);
    const tm = await page.evaluate(() => { const p = document.getElementById('cues'); const rows = [...p.querySelectorAll('.r.s')]; return { open: !p.hidden, rows: rows.length, targets: rows.filter(r => { const i = r.querySelector('input[type=number], input'); return i && /\d/.test(i.value + i.placeholder); }).length }; });
    ok(tm.open && tm.rows === S.length && tm.targets === S.length, `T opens the timing panel: ${tm.rows} slides, ${tm.targets} with a target`);
    await page.screenshot({ path: L.path.join(out, 'tool-timing.png') });
    await page.keyboard.press('Escape');
    ok(!log.some(e => e.includes('pageerror')), `no page errors (speaker/cues/timing)${log.length ? ': ' + log.join('; ') : ''}`);
    await ctx.close();
  }
  // ---- 4 editor save and reload
  {
    const { ctx, page, log } = await L.open(b, file, { init: STUB });
    const S = await L.slides(page), si = S.findIndex(s => s.id === 'being') >= 0 ? S.findIndex(s => s.id === 'being') : 1;
    await page.evaluate(i => window.__deck.go(i, { instant: true, toEnd: true, force: true }), si); await L.idle(page); await L.sleep(900);
    await page.keyboard.press('e'); await L.sleep(500);
    ok(await page.evaluate(() => document.body.classList.contains('edit')), 'E enters the editor');
    // the largest visible text block on the slide
    const tgt = await page.evaluate(() => { const s = document.querySelector('#slides > .slide.on'); let best = null, ba = 0; for (const e of s.querySelectorAll('[data-et]')) { const r = e.getBoundingClientRect(), a = r.width * r.height; if (a > ba && e.textContent.trim().length > 6 && getComputedStyle(e).opacity > .5) { ba = a; best = e; } } return best && { key: best.dataset.e, x: best.getBoundingClientRect().left + 8, y: best.getBoundingClientRect().top + best.getBoundingClientRect().height / 2 }; });
    ok(!!tgt, `a text block to edit (${tgt && tgt.key})`);
    await page.mouse.click(tgt.x, tgt.y); await L.sleep(200);
    await page.evaluate(() => { const r = document.getElementById('ed-s'); r.value = '130'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
    await L.sleep(600);
    await page.mouse.dblclick(tgt.x, tgt.y); await L.sleep(200);
    const typing = await page.evaluate(() => !!document.querySelector('#slides [contenteditable=true]'));
    ok(typing, 'double-click starts typing');
    await page.keyboard.type('TOOLCHECK edit'); await page.keyboard.press('Escape'); await L.sleep(300);
    await page.screenshot({ path: L.path.join(out, 'tool-editor.png') });
    await page.click('#ed-save'); await page.waitForFunction(() => !!window.__saved, null, { timeout: 5000 }).catch(() => {});
    const saved = await page.evaluate(() => window.__saved || '');
    ok(saved.length > 100000, `Save writes the file (${saved.length} bytes)`);
    const ef = L.path.join(out, 'edited.html'); L.fs.writeFileSync(ef, saved);
    try { execFileSync('node', [L.path.join(__dirname, 'jscheck.js'), ef], { stdio: 'pipe' }); ok(true, 'the saved file passes jscheck'); } catch (e) { ok(false, 'the saved file fails jscheck: ' + String(e.stdout).slice(0, 300)); }
    ok(!log.some(e => e.includes('pageerror')), `no page errors (editor)${log.length ? ': ' + log.join('; ') : ''}`);
    await ctx.close();
    const o2 = await L.open(b, ef);   // a fresh context: no localStorage, only what is in the file
    await o2.page.evaluate(i => window.__deck.go(i, { instant: true, toEnd: true, force: true }), si); await L.sleep(1200);
    const got = await o2.page.evaluate(k => { const e = document.querySelector(`[data-e="${k}"]`); return e && { html: e.innerHTML, st: e.getAttribute('style') || '', sc: getComputedStyle(e).scale + ' ' + getComputedStyle(e).transform }; }, tgt.key);
    ok(got && got.html.includes('TOOLCHECK edit'), `the retyped text persists on reload (${got && got.html.slice(0, 40)})`);
    ok(got && /1\.3/.test(got.st + got.sc), `the resize persists on reload (${got && (got.st + ' | ' + got.sc).slice(0, 120)})`);
    await o2.page.screenshot({ path: L.path.join(out, 'tool-reloaded.png') });
    ok(!o2.log.some(e => e.includes('pageerror')), `no page errors (reloaded copy)${o2.log.length ? ': ' + o2.log.join('; ') : ''}`);
    await o2.ctx.close();
  }
  // ---- 5 speed: a flight's busy time at 1x, 0.5x, 2x (each in a fresh context)
  {
    const dur = {};
    for (const sp of [1, .5, 2]) {
      const { ctx, page } = await L.open(b, file);
      const S = await L.slides(page), to = S.findIndex((s, i) => i > 1 && s.part !== S[i - 1].part && !s.trans);
      if (sp !== 1) { await page.keyboard.press('e'); await L.sleep(400); await page.evaluate(v => { const r = document.getElementById('ed-gs'); r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); }, sp); await L.sleep(600); await page.keyboard.press('e'); await L.sleep(500); }
      await L.settle(page, to - 1, 600); await L.sleep(500);
      const t = await page.evaluate(async () => { const D = window.__deck, t0 = performance.now(); D.next(); await new Promise(r => requestAnimationFrame(r)); while (D.busy) await new Promise(r => setTimeout(r, 16)); return performance.now() - t0; });
      dur[sp] = Math.round(t); await ctx.close();
      if (sp === 1) console.log(`     flight into ${S[to].id}`);
    }
    const r05 = dur[.5] / dur[1], r2 = dur[2] / dur[1];
    ok(r05 > 1.6 && r05 < 2.4, `speed 0.5x stretches the flight: ${dur[1]} -> ${dur[.5]} ms (x${r05.toFixed(2)})`);
    ok(r2 > .4 && r2 < .65, `speed 2x shrinks it: ${dur[1]} -> ${dur[2]} ms (x${r2.toFixed(2)})`);
  }
  console.log(fails.length ? `${fails.length} failures` : 'toolkit: all ok');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
