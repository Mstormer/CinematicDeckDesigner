// usage: node notes.js <deck.html> <outdir>
// The on-slide notes strip (N), from reference/deck-ui.js, headless, at 1280x720 and 1920x1080:
//  1 a lower third no taller than 150 px by default that does not overlap the HUD
//  2 only the current slide's notes: one block per build of this slide, nothing of other slides
//  3 the current part at the top, the next two lines at half strength, nothing beyond (the --cut line)
//  4 the next cue: the next build's cue words mid-slide, the next slide's at the last build, nothing at the end of the talk
//  5 it glides on a build change (about 450 ms), slower (about 1.5 s) when a spoken cue (__deck.hear) moved it
//  6 A+ / A- size the text (2 px), the top edge drags the height; both survive a reload; the cue still shows at the smallest height
// Screenshots notes-*.png. Exit 1 on any failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const READ = () => {
  const n = document.getElementById('notes'), scr = document.getElementById('nscr'), now = scr.querySelector('.seg.now'), cue = document.getElementById('ncue'), hud = document.getElementById('hud');
  const nr = n.getBoundingClientRect(), sr = scr.getBoundingClientRect(), hr = hud.getBoundingClientRect(), lh = parseFloat(getComputedStyle(scr).lineHeight);
  const lines = els => { const out = [], r = document.createRange(); els.forEach(el => { const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { if (!t.textContent.trim()) continue; r.selectNodeContents(t);
    for (const q of r.getClientRects()) { if (q.height < 2 || q.width < 1) continue; const c = (q.top + q.bottom) / 2, g = out.find(l => Math.abs(l.c - c) < lh * .5); if (g) { g.top = Math.min(g.top, q.top); g.bottom = Math.max(g.bottom, q.bottom); g.op = Math.min(g.op, +getComputedStyle(el).opacity); } else out.push({ c, top: q.top, bottom: q.bottom, op: +getComputedStyle(el).opacity }); } } }); return out.sort((a, b) => a.top - b.top); };
  const after = []; if (now) for (let x = now.nextElementSibling; x; x = x.nextElementSibling) after.push(x);
  const cut = parseFloat(scr.style.getPropertyValue('--cut')), nowR = now ? now.getBoundingClientRect() : null, ls = lines(after);
  const D = window.__deck, s = document.querySelectorAll('#slides > .slide, .slide')[D.cur];
  return { open: !n.hidden, h: Math.round(nr.height), top: nr.top, bottom: nr.bottom, hudTop: hr.top, hudOverlap: !(nr.bottom <= hr.top || nr.top >= hr.bottom || nr.right <= hr.left || nr.left >= hr.right),
    segs: scr.querySelectorAll('.seg').length, parts: (s.querySelector('.notes') || { innerHTML: '' }).innerHTML.split('[BUILD]').length, nowTop: nowR ? Math.round(nowR.top - sr.top) : -99,
    visible: ls.filter(l => l.top >= nowR.bottom - 2 && l.bottom <= sr.top + cut + 1), beyond: ls.filter(l => l.bottom > sr.top + cut + 1), cut, boxH: sr.height, total: ls.length,
    cue: cue.textContent, cueH: cue.getBoundingClientRect().height, cueIn: cue.getBoundingClientRect().bottom <= nr.bottom + 1, fs: parseFloat(getComputedStyle(n).fontSize), tall: n.classList.contains('tall'), st: scr.scrollTop, txt: scr.textContent };
};
(async () => {
  L.mkdir(out); const b = await L.launch();
  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const { ctx, page, log } = await L.open(b, file, { viewport: { width: w, height: h } });
    const S = await L.slides(page), tag = `${w}x${h}`;
    // a slide with two or more builds and a cue on build 1, whose next slide has a cue
    const info = await page.evaluate(() => [...document.querySelectorAll('#slides > .slide')].map((s, i, a) => ({ i, max: window.__deck.maxStep(i), c1: ((s.querySelector('[data-step="1"][data-cue]') || {}).dataset || {}).cue || '', nc: a[i + 1] ? a[i + 1].dataset.cue || '' : '' })));
    const pick = info.find(x => x.i > 0 && x.max >= 2 && x.c1 && x.nc), i = pick.i;
    await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), i); await L.idle(page); await L.sleep(900);
    await page.mouse.move(w / 2, h / 2); await page.keyboard.press('n'); await L.sleep(700);
    let r = await page.evaluate(READ);
    ok(r.open && r.h <= 150 && !r.hudOverlap, `${tag}: a lower third ${r.h} px tall (<= 150), clear of the HUD (strip bottom ${Math.round(r.bottom)}, HUD top ${Math.round(r.hudTop)})`);
    ok(r.segs === r.parts && r.parts === pick.max + 1, `${tag}: only this slide's notes (${r.segs} parts for ${pick.max} builds)`);
    const nextTxt = await page.evaluate(i => { const n = document.querySelectorAll('#slides > .slide')[i + 1].querySelector('.notes'); return n ? n.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : ''; }, i);
    ok(!r.txt.replace(/\s+/g, ' ').includes(nextTxt), `${tag}: nothing of the next slide's script`);
    ok(Math.abs(r.nowTop) <= 2, `${tag}: the current part sits at the top (${r.nowTop} px)`);
    ok(r.visible.length === Math.min(2, r.total) && r.visible.every(l => Math.abs(l.op - .5) < .01) && r.beyond.every(l => l.top >= r.visible[r.visible.length - 1].bottom - 1), `${tag}: the next ${r.visible.length} lines at half strength, ${r.beyond.length} beyond the cut (cut ${r.cut} px, box ${Math.round(r.boxH)} px)`);
    const c1 = pick.c1.split(',')[0].trim();
    ok(/Next build/i.test(r.cue) && r.cue.toLowerCase().includes(c1.toLowerCase()), `${tag}: the next build's cue shows ("${r.cue}")`);
    await page.screenshot({ path: L.path.join(out, `notes-${tag}.png`) });
    // glide on a build change, and slower after a spoken cue
    const timeMove = async say => { await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), i); await L.idle(page); await L.sleep(1300);
      const s0 = (await page.evaluate(READ)).st; await say(); await L.sleep(280); const s1 = (await page.evaluate(READ)).st; await L.sleep(1700); const s2 = (await page.evaluate(READ)).st; return s2 === s0 ? null : (s1 - s0) / (s2 - s0); };
    const click = await timeMove(() => page.evaluate(() => window.__deck.next())), spoken = await timeMove(() => page.evaluate(w => window.__deck.hear('and then ' + w), c1));
    ok(click !== null && click > .5 && click < 1.01, `${tag}: a build change glides (at 280 ms ${click === null ? '-' : Math.round(click * 100)}% of the way)`);
    ok(spoken !== null && spoken < .25, `${tag}: slower after a spoken cue (at 280 ms ${spoken === null ? '-' : Math.round(spoken * 100)}%)`);
    r = await page.evaluate(READ); ok(Math.abs(r.nowTop) <= 2 && r.visible.length === Math.min(2, r.total), `${tag}: after the glide the new part is at the top (${r.nowTop} px), ${r.visible.length} lines after it`);
    // the last build: the next slide's cue
    await page.evaluate(i => window.__deck.go(i, { instant: true, force: true, toEnd: true }), i); await L.idle(page); await L.sleep(900);
    r = await page.evaluate(READ); const nc = pick.nc.split(',')[0].trim();
    ok(/Next slide/i.test(r.cue) && r.cue.toLowerCase().includes(nc.toLowerCase()) && r.cue.includes(S[i + 1].title), `${tag}: at the last build the next slide's cue shows ("${r.cue}")`);
    await page.screenshot({ path: L.path.join(out, `notes-${tag}-last.png`) });
    // the end of the talk: no cue
    await page.evaluate(n => window.__deck.go(n - 1, { instant: true, force: true, toEnd: true }), S.length); await L.idle(page); await L.sleep(900);
    r = await page.evaluate(READ); ok(r.cue === '' && r.cueH === 0, `${tag}: nothing at the last build of the last slide ("${r.cue}")`);
    if (w === 1280) {   // 6 sizing, kept per browser
      await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), i); await L.idle(page); await L.sleep(900);
      const f0 = (await page.evaluate(READ)).fs; await page.click('#n-sp'); await page.click('#n-sp'); const f1 = (await page.evaluate(READ)).fs; await page.click('#n-sm'); const f2 = (await page.evaluate(READ)).fs;
      ok(f1 === f0 + 4 && f2 === f0 + 2, `A+ / A- size the notes (${f0} -> ${f1} -> ${f2} px)`);
      const grip = await page.evaluate(() => { const g = document.querySelector('#notes .ngrip').getBoundingClientRect(); return [g.x + g.width / 2, g.y + g.height / 2]; });
      await page.mouse.move(grip[0], grip[1]); await page.mouse.down(); await page.mouse.move(grip[0], grip[1] - 120, { steps: 6 }); await page.mouse.up(); await L.sleep(300);
      r = await page.evaluate(READ); const hTall = r.h;
      ok(hTall >= 260 && r.tall, `dragging the top edge makes it taller (${hTall} px, tall mode ${r.tall})`);
      await page.screenshot({ path: L.path.join(out, 'notes-tall.png') });
      await page.reload(); await L.ready(page); await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), i); await L.idle(page); await L.sleep(700); await page.keyboard.press('n'); await L.sleep(500);
      r = await page.evaluate(READ); ok(r.fs === f2 && Math.abs(r.h - hTall) <= 1, `text size and height survive a reload (${r.fs} px, ${r.h} px)`);
      const g2 = await page.evaluate(() => { const g = document.querySelector('#notes .ngrip').getBoundingClientRect(); return [g.x + g.width / 2, g.y + g.height / 2]; });
      await page.mouse.move(g2[0], g2[1]); await page.mouse.down(); await page.mouse.move(g2[0], g2[1] + 600, { steps: 8 }); await page.mouse.up(); await L.sleep(300);
      r = await page.evaluate(READ); ok(r.h >= 60 && r.h <= 61 && r.cueH > 8 && r.cueIn && /Next build/.test(r.cue), `at the smallest height (${r.h} px) the next cue still shows ("${r.cue}")`);
      await page.screenshot({ path: L.path.join(out, 'notes-small.png') });
      await page.keyboard.press('n'); await L.sleep(200);
      ok(await page.evaluate(() => { const n = document.getElementById('notes'), c = n.querySelector('.nctl'); return n.hidden && c.getBoundingClientRect().width === 0; }), 'the strip and its controls are gone when it is hidden');
    }
    ok(!log.some(e => /pageerror/.test(e)), `${tag}: no page errors${log.length ? ': ' + log.slice(0, 3).join('; ') : ''}`);
    await ctx.close();
  }
  await b.close(); console.log(fails.length ? `${fails.length} FAILED` : 'all ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
