// usage: node sv.js <deck.html> <outdir>
// The speaker view (reference/speaker-view.js), headless. Needs window.__deck with go, next, settle, busy, state() and buildDoc(),
// and slide 3 with builds.
//  1 panel toggles: Notes, Now, Next each hide only their panel, in all 8 combinations, at three window sizes; previews refit;
//    the cue box shows only while voice listens, the status line always
//  2 notes size: A+ / A- change the notes text size, kept after reopening
//  3 layout: the layout button cycles the previews right, bottom, left, top, hidden; the toolbar sits under everything
//  4 running script: every slide in one column, the current part near the top, later text at half, cue colours, a smooth glide
//    (about 450 ms), slower (about 1.5 s) when a spoken cue moved it; the toolbar shows n/N with the title as its tooltip
//  5 sizing: dragging the bar widens the previews (kept), Reset sizes puts it back
//  6 editing: Edit notes, arrows type, Cmd/Ctrl+Enter saves into the slide's notes, Esc cancels, changing slide saves,
//    the saved file carries the edit, it survives a reload
//  7 the last slide: the Next preview shows the end card
// Screenshots sv-*.png. Exit 1 on any failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
const PREFS = () => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /sv-prefs$/.test(k)) || '') || '{}');

(async () => {
  L.mkdir(out);
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, file);
  const S = await L.slides(page);
  const openSv = async () => { const p = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null); await page.keyboard.press('s'); const sv = await p; if (sv) { await sv.setViewportSize({ width: 1440, height: 880 }); sv.on('pageerror', e => log.push('sv pageerror ' + e.message)); await L.sleep(500); } return sv; };
  let sv = await openSv();
  ok(!!sv, 'S opens the speaker view'); if (!sv) { await b.close(); process.exit(1); }
  await L.settle(page, 2, 600); await L.sleep(900);

  // 1 toggles
  const panels = () => sv.evaluate(() => { const v = q => { const e = document.querySelector(q); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), show: getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0 }; };
    const fit = id => { const f = document.getElementById(id); if (!f.clientWidth) return true; const ps = f.contentDocument && f.contentDocument.getElementById('ps'); const m = ps && /scale\(([\d.]+)\)/.exec(ps.style.transform); return !!m && Math.abs(+m[1] - f.clientWidth / 1920) < .01; };
    return { notes: v('#nt'), cues: v('#nx'), st: v('#st'), now: v('.now-p'), next: v('.next-p'), fitNow: fit('pnow'), fitNext: fit('pnext'), sw: document.documentElement.scrollWidth, iw: innerWidth }; });
  const keys = ['notes', 'now', 'next'];
  for (const [w, h] of [[1440, 880], [1024, 700], [1920, 1080]]) {
    await sv.setViewportSize({ width: w, height: h }); const bad = [];
    for (let m = 0; m < 8; m++) {
      const want = Object.fromEntries(keys.map((k, i) => [k, !(m & (1 << i))]));
      await sv.evaluate(want => { document.querySelectorAll('button.tg').forEach(b => { if ((b.getAttribute('aria-pressed') === 'true') !== want[b.dataset.k]) b.click(); }); }, want);
      await L.sleep(150); const p = await panels();
      keys.forEach(k => { if (p[k].show !== want[k]) bad.push(`${m}:${k} ${p[k].show ? 'shown' : 'hidden'}`); else if (want[k] && (p[k].w < 100 || p[k].h < 30)) bad.push(`${m}:${k} ${p[k].w}x${p[k].h}`); });
      if (p.cues.show) bad.push(`${m}: cue box shown with voice off`); if (!p.st.show) bad.push(`${m}: status line hidden`); if (!p.fitNow || !p.fitNext) bad.push(`${m}: preview not refit`); if (p.sw > p.iw + 1) bad.push(`${m}: page scrolls sideways`);
      if (w === 1440 && [0, 1, 6].includes(m)) await sv.screenshot({ path: L.path.join(out, `sv-toggle-${m}.png`) });
    }
    ok(!bad.length, `toggles at ${w}x${h}: each hides only its panel, previews fit${bad.length ? ' (' + bad.slice(0, 6).join('; ') + ')' : ''}`);
  }
  await sv.setViewportSize({ width: 1440, height: 880 });
  await sv.evaluate(() => document.querySelectorAll('button.tg[aria-pressed=false]').forEach(b => b.click())); await L.sleep(200);

  // 2 notes size
  const fs = () => sv.evaluate(() => parseFloat(getComputedStyle(document.getElementById('nt')).fontSize));
  const f0 = await fs(); await sv.click('#fsp'); await sv.click('#fsp'); const f1 = await fs(); await sv.click('#fsm'); const f2 = await fs();
  ok(f1 === f0 + 4 && f2 === f0 + 2, `A+ / A- size the notes (${f0} -> ${f1} -> ${f2} px)`);

  // 3 layout cycle, toolbar at the bottom
  const lay = () => sv.evaluate(() => { const r = q => document.querySelector(q).getBoundingClientRect(), p = r('#pvs'), l = r('#left'), hd = r('header'), mn = r('#main');
    const vis = getComputedStyle(document.getElementById('pvs')).display !== 'none' && p.width > 0;
    return { cls: [...document.body.classList].filter(c => /^lay-/.test(c)).join(' '), pos: !vis ? 'off' : p.left >= l.right - 2 ? 'r' : p.right <= l.left + 2 ? 'l' : p.top >= l.bottom - 2 ? 'b' : p.bottom <= l.top + 2 ? 't' : '?', headerLast: hd.top >= mn.bottom - 1 }; });
  const seen = [(await lay()).pos]; for (let i = 0; i < 5; i++) { await sv.click('#lay'); await L.sleep(200); seen.push((await lay()).pos); if (i === 0) await sv.screenshot({ path: L.path.join(out, 'sv-bottom.png') }); }
  ok(seen.join('') === 'rbltoffr', `the layout button cycles right, bottom, left, top, hidden (${seen.join(' ')})`);
  ok((await lay()).headerLast, 'the toolbar sits at the bottom of the window');

  // 4 running script
  const script = () => sv.evaluate(() => { const box = document.getElementById('nt'), cs = box.querySelector('.cur-s'), now = box.querySelector('.seg.now'), br = box.getBoundingClientRect();
    const col = q => { const e = box.querySelector(q); return e ? getComputedStyle(e).color : ''; };
    return { blocks: box.children.length, old: box.querySelectorAll('.old').length, fut: box.querySelectorAll('.fut').length, nowTop: now ? Math.round(now.getBoundingClientRect().top - br.top) : -1, h: box.clientHeight,
      st: box.scrollTop, cut: box.style.getPropertyValue('--cut'), curQ: col('.cur-s q'), futQ: col('.fut q'), gt: box.querySelectorAll('.gt').length, bullets: box.querySelectorAll('.b.l0').length, sub: box.querySelectorAll('.b.l1').length,
      futOp: cs && cs.nextElementSibling ? getComputedStyle(cs.nextElementSibling).opacity : '', stx: document.getElementById('st').textContent, ti: document.getElementById('ti').textContent, tip: document.getElementById('ti').title }; });
  let r = await script();
  ok(r.blocks === S.length && r.old === 2 && r.fut === S.length - 3, `one running script: ${r.blocks} slides, ${r.old} earlier, ${r.fut} later`);
  ok(r.nowTop >= 0 && r.nowTop < r.h * .3, `the current part sits near the top (${r.nowTop} px of ${r.h})`);
  ok(r.gt >= S.length && r.bullets > S.length && r.sub > 0, `bullets and red > marks (${r.bullets} points, ${r.sub} follow-ons, ${r.gt} >)`);
  ok(r.futOp === '0.5' && !!r.cut, `later text at half strength, cut line set (${r.futOp}, ${r.cut})`);
  ok(/138, 214, 168/.test(r.curQ) && /255, 122, 110/.test(r.futQ), `cues: this slide green, later slides red (${r.curQ} / ${r.futQ})`);
  ok(r.stx.length > 5, `the status line is filled ("${r.stx.slice(0, 50)}")`);
  ok(r.ti === `3/${S.length}` && r.tip === S[2].title, `the toolbar shows ${r.ti} with the title "${r.tip}" as its tooltip`);
  const st0 = r.st; await page.evaluate(() => window.__deck.go(3));
  const samples = []; for (let i = 0; i < 14; i++) { samples.push(await sv.evaluate(() => document.getElementById('nt').scrollTop)); await L.sleep(45); }
  await L.idle(page); await L.sleep(500); r = await script();
  const mid = samples.filter(v => Math.abs(v - st0) > 2 && Math.abs(v - r.st) > 2).length;
  ok(r.st > st0 && mid > 0, `the script glides to the next slide (${st0} -> ${r.st}, ${mid} in-between samples)`);
  await sv.screenshot({ path: L.path.join(out, 'sv-script.png') });
  await page.evaluate(() => window.__deck.go(1, { instant: true, force: true })); await L.sleep(1000); const back = await script();
  ok(back.st < r.st && back.nowTop < back.h * .3, `going back scrolls the script back (${r.st} -> ${back.st})`);
  // a spoken cue: the same kind of move glides at about a third of the speed
  const vc = await page.evaluate(() => { const ss = [...document.querySelectorAll('#slides > .slide')]; for (let i = 1; i < ss.length; i++) { const e = ss[i].querySelector('[data-step="1"][data-cue]'); if (e) return { i, w: e.dataset.cue.split(',')[0].trim() }; } return null; });
  if (vc) {
    const timeMove = async say => { await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), vc.i); await L.sleep(1300);
      const s0 = await sv.evaluate(() => document.getElementById('nt').scrollTop); await say(); await L.sleep(280); const s1 = await sv.evaluate(() => document.getElementById('nt').scrollTop);
      await L.sleep(1700); const s2 = await sv.evaluate(() => document.getElementById('nt').scrollTop); return s2 === s0 ? null : (s1 - s0) / (s2 - s0); };
    const click = await timeMove(() => page.evaluate(() => window.__deck.next())), spoken = await timeMove(() => page.evaluate(w => window.__deck.hear('and then ' + w), vc.w));
    ok(click !== null && spoken !== null && click > .5 && spoken < .25, `a spoken cue glides slower (at 280 ms: click ${click === null ? '-' : Math.round(click * 100)}%, voice ${spoken === null ? '-' : Math.round(spoken * 100)}% of the way)`);
  } else ok(false, 'no slide with a build cue for the voice glide');

  // 5 sizing
  const pw = () => sv.evaluate(() => Math.round(document.getElementById('pvs').getBoundingClientRect().width));
  const w0 = await pw(); const sb = await sv.evaluate(() => { const r = document.getElementById('spl').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await sv.mouse.move(sb[0], sb[1]); await sv.mouse.down(); await sv.mouse.move(200, sb[1], { steps: 8 }); await sv.mouse.up(); await L.sleep(400);
  const w1 = await pw(), fitted = (await panels()).fitNow;
  ok(w1 > w0 + 500 && fitted, `dragging the bar widens the previews (${w0} -> ${w1} px, refit ${fitted})`);
  await sv.screenshot({ path: L.path.join(out, 'sv-wide.png') });
  const kept = await sv.evaluate(PREFS).then(p => p.pw);
  await sv.click('#szr'); await L.sleep(250); const w2 = await pw();
  ok(kept > 0 && Math.abs(w2 - w0) < 3, `the width is kept (${kept}) and Reset sizes restores it (${w2})`);

  // 6 editing
  await page.evaluate(() => window.__deck.go(2, { instant: true, force: true })); await L.sleep(1000);
  const sid = S[2].id;
  await sv.click('#ednb'); await L.sleep(200);
  const ed = await sv.evaluate(() => ({ on: document.body.classList.contains('ednotes'), boxes: document.querySelectorAll('#nt .cur-s .seg[contenteditable=true]').length, focus: !!(document.activeElement && document.activeElement.classList.contains('seg')) }));
  ok(ed.on && ed.boxes === S[2].builds + 1 && ed.focus, `Edit notes: one box per build (${ed.boxes}), focused`);
  const before = await page.evaluate(() => [window.__deck.cur, window.__deck.step]);
  await sv.keyboard.press('ArrowRight'); await sv.keyboard.press('ArrowLeft'); await sv.keyboard.press('ArrowDown'); await sv.keyboard.press('Control+End');
  await sv.keyboard.type(' Zebra marker.'); await L.sleep(150);
  const after = await page.evaluate(() => [window.__deck.cur, window.__deck.step]);
  ok(before[0] === after[0] && before[1] === after[1], `arrow keys type while editing (slide ${before} -> ${after})`);
  await sv.keyboard.press('Meta+Enter'); await sv.keyboard.press('Control+Enter'); await L.sleep(400);
  const saved = await page.evaluate(id => ({ notes: document.getElementById(id).querySelector('.notes').innerHTML, st: JSON.stringify((window.__deck.state().slides || {})[id] || {}) }), sid);
  const shown = await sv.evaluate(() => ({ off: !document.body.classList.contains('ednotes'), txt: document.querySelector('#nt .cur-s').textContent }));
  ok(saved.notes.includes('Zebra marker.') && saved.st.includes('Zebra marker.') && shown.off && shown.txt.includes('Zebra marker'), 'Cmd/Ctrl+Enter saves the edit into the slide notes and the script');
  ok(saved.notes.split('[BUILD]').length === S[2].builds + 1, `the builds are kept (${saved.notes.split('[BUILD]').length} parts)`);
  await sv.click('#ednb'); await L.sleep(150); await sv.keyboard.type(' Lost words'); await sv.keyboard.press('Escape'); await L.sleep(250);
  const can = await page.evaluate(id => document.getElementById(id).querySelector('.notes').innerHTML, sid);
  ok(!can.includes('Lost words'), 'Esc cancels an edit');
  await sv.click('#ednb'); await L.sleep(150); await sv.keyboard.type(' Moved on'); await page.evaluate(() => window.__deck.go(3)); await L.idle(page); await L.sleep(400);
  const mv = await page.evaluate(id => document.getElementById(id).querySelector('.notes').innerHTML, sid);
  ok(mv.includes('Moved on'), 'changing slides mid-edit saves first');
  ok(await page.evaluate(() => window.__deck.buildDoc().includes('Zebra marker.')), 'the saved file carries the edited notes');
  const pf = await sv.evaluate(PREFS).then(p => p.fs);
  await sv.close(); await page.reload(); await L.ready(page); await L.sleep(500);
  ok(await page.evaluate(id => document.getElementById(id).querySelector('.notes').innerHTML.includes('Zebra marker.'), sid), 'an edit survives a reload');
  sv = await openSv(); await L.settle(page, 2, 600); await L.sleep(700);
  const f3 = await fs(); ok(f3 === pf, `notes size kept after reopening (${f3} px)`);

  // 7 last slide
  await page.evaluate(n => window.__deck.go(n - 1, { instant: true, force: true, toEnd: true }), S.length); await L.sleep(1000);
  const last = await sv.evaluate(() => ({ end: /End of the talk/.test(document.getElementById('pnext').contentDocument.body.textContent), lbl: document.getElementById('pnl').textContent, fut: document.querySelectorAll('#nt .fut').length, cur: !!document.querySelector('#nt .cur-s') }));
  ok(last.end && last.fut === 0 && last.cur, `last slide: end card next, no later slides (${last.lbl})`);
  await sv.screenshot({ path: L.path.join(out, 'sv-last.png') });

  ok(!log.some(e => /pageerror/.test(e)), `no page errors${log.length ? ': ' + log.slice(0, 4).join('; ') : ''}`);
  await b.close();
  console.log(fails.length ? `${fails.length} FAILED` : 'all ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
