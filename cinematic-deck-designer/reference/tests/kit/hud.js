// usage: node hud.js <deck.html> <outdir>
// The presenting UI (reference/deck-ui.js), headless at 1920x1080:
//  1 HUD: ← counter → Voice Sound Timing Notes Speaker view Slides Edit Fullscreen, in that order (buttons the deck lacks are left out)
//  2 progress bar: width follows the slide, P hides and shows it
//  3 blank: B blanks, → only unblanks
//  4 slides list: G opens one button per slide, the current one marked; a click jumps and closes it
//  5 help: ? opens it with key rows; Esc closes it
//  6 timing: T opens it; a target for every slide, a time per build; the pace changes the suggested times; a typed cue word is kept
//    in the edit state and is heard; Reset clears it
//  7 voice cues: __deck.hear with a build's cue word brings it in; after the last build the next slide's cue moves on
// Screenshots hud-*.png. Exit 1 on any failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
const fails = []; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails.push(m); };
(async () => {
  L.mkdir(out); const b = await L.launch(); const { page, log } = await L.open(b, file);
  const S = await L.slides(page), n = S.length, $t = (q, f) => page.evaluate(([q, f]) => { const e = document.querySelector(q); return e ? (f === 'hidden' ? e.hidden : e.textContent) : null; }, [q, f]);
  await L.settle(page, 2, 600); await page.mouse.move(700, 400); await L.sleep(300);
  // 1 HUD
  const hud = await page.evaluate(() => [...document.getElementById('hud').children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent.trim()));
  const want = ['←', `3 / ${n}`, '→', 'Voice: off', 'Sound: off', 'Timing', 'Notes', 'Speaker view', 'Slides', 'Edit', 'Fullscreen'];
  const hasSound = hud.includes('Sound: off'), want2 = hasSound ? want : want.filter(x => x !== 'Sound: off');
  ok(JSON.stringify(hud) === JSON.stringify(want2), `HUD in order: ${hud.join(' | ')}`);
  ok(await page.evaluate(() => document.body.classList.contains('awake') && getComputedStyle(document.getElementById('hud')).opacity === '1'), 'the HUD shows while the mouse moves');
  await page.screenshot({ path: L.path.join(out, 'hud-hud.png') });
  // 2 bar
  const bw = await page.evaluate(() => parseFloat(document.getElementById('bar').style.width));
  ok(Math.abs(bw - 2 / (n - 1) * 100) < .01, `progress bar at ${bw.toFixed(1)}% on slide 3`);
  await page.keyboard.press('p'); const nb = await page.evaluate(() => document.body.classList.contains('nobar')); await page.keyboard.press('p'); const nb2 = await page.evaluate(() => document.body.classList.contains('nobar'));
  ok(nb && !nb2, 'P hides and shows the bar');
  // 3 blank
  await page.keyboard.press('b'); const bl = await page.evaluate(() => document.getElementById('black').classList.contains('on'));
  const c0 = await page.evaluate(() => [window.__deck.cur, window.__deck.step]); await page.keyboard.press('ArrowRight'); await L.sleep(200);
  const c1 = await page.evaluate(() => [window.__deck.cur, window.__deck.step]), bl2 = await page.evaluate(() => document.getElementById('black').classList.contains('on'));
  ok(bl && !bl2 && c0.join() === c1.join(), 'B blanks; → unblanks without moving on');
  // 4 slides list
  await page.keyboard.press('g'); await L.sleep(200);
  const jl = await page.evaluate(() => ({ open: !document.getElementById('jump').hidden, n: document.querySelectorAll('#jumplist button').length, cur: [...document.querySelectorAll('#jumplist button')].findIndex(b => b.classList.contains('cur')) }));
  ok(jl.open && jl.n === n && jl.cur === 2, `G opens the slide list (${jl.n} slides, current ${jl.cur + 1})`);
  await page.screenshot({ path: L.path.join(out, 'hud-slides.png') });
  await page.click('#jumplist button:nth-child(5)'); await L.idle(page); await L.sleep(500);
  ok(await page.evaluate(() => window.__deck.cur) === 4 && await $t('#jump', 'hidden'), 'a click jumps to slide 5 and closes the list');
  // 5 help
  await page.keyboard.press('?'); await L.sleep(200);
  const hp = await page.evaluate(() => ({ open: !document.getElementById('help').hidden, rows: document.querySelectorAll('#help dt').length, kbd: document.querySelectorAll('#help kbd').length }));
  ok(hp.open && hp.rows >= 10 && hp.kbd >= 10, `? opens help (${hp.rows} rows)`);
  await page.screenshot({ path: L.path.join(out, 'hud-help.png') });
  await page.keyboard.press('Escape'); ok(await $t('#help', 'hidden'), 'Esc closes help');
  // 6 timing
  await page.keyboard.press('t'); await L.sleep(300);
  const tm = await page.evaluate(() => ({ open: !document.getElementById('cues').hidden, s: document.querySelectorAll('#cuelist .r.s input.tgt').length, b: document.querySelectorAll('#cuelist .r.b input.bat').length }));
  const builds = S.reduce((a, s) => a + s.builds, 0);
  ok(tm.open && tm.s === n && tm.b === builds, `T opens timing: ${tm.s} slide targets, ${tm.b} build times (${builds} builds)`);
  const ph0 = await page.evaluate(() => document.querySelector('#cuelist input.bat').placeholder);
  await page.fill('#pace', '100'); await L.sleep(100); const ph1 = await page.evaluate(() => document.querySelector('#cuelist input.bat').placeholder);
  ok(+ph1 > +ph0, `a slower pace pushes the build times later (${ph0} -> ${ph1} s)`);
  const bi = S.findIndex((s, i) => i > 0 && s.builds >= 1), key = S[bi].id + ':1', bid = 'cue-' + key.replace(/[^a-z0-9]/gi, '-');
  await page.fill('#' + bid, 'zebrafish'); await L.sleep(100);
  ok(await page.evaluate(k => ((window.__deck.state().timing.over || {})[k] || {}).cue === 'zebrafish', key), `a typed cue word is kept (${key})`);
  await page.screenshot({ path: L.path.join(out, 'hud-timing.png') });
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), bi); await L.idle(page); await L.sleep(900);
  await page.evaluate(() => window.__deck.hear('a zebrafish swims')); await L.sleep(300);
  ok(await page.evaluate(() => window.__deck.step) === 1, 'the typed cue word brings the build in');
  await page.keyboard.press('t'); await L.sleep(200); await page.click('#cues-reset'); await L.sleep(200);
  ok(await page.evaluate(() => Object.keys(window.__deck.state().timing.over || {}).length === 0 && window.__deck.state().timing.wpm === 140), 'Reset clears the timing and cues');
  await page.click('#cues-close'); ok(await $t('#cues', 'hidden'), 'Done closes it');
  // 7 voice cues (speech recognition hands over the whole running transcript, so the test keeps adding to it)
  const vc = await page.evaluate(() => [...document.querySelectorAll('#slides > .slide')].map((s, i, a) => ({ i, c1: ((s.querySelector('[data-step="1"][data-cue]') || {}).dataset || {}).cue || '', max: window.__deck.maxStep(i), nc: a[i + 1] ? a[i + 1].dataset.cue || '' : '' })).find(x => x.i > 0 && x.c1 && x.nc && x.max >= 1));
  await page.evaluate(i => window.__deck.go(i, { instant: true, force: true }), vc.i); await L.idle(page); await L.sleep(900);
  let said = 'a zebrafish swims so ' + vc.c1.split(',')[0].trim(); await page.evaluate(t => window.__deck.hear(t), said); await L.sleep(300);
  ok(await page.evaluate(() => window.__deck.step) === 1, `voice: "${said}" brings build 1`);
  await L.settle(page, vc.i, 300); await L.sleep(2800); said += ' and ' + vc.nc.split(',')[0].trim(); await page.evaluate(t => window.__deck.hear(t), said); await L.sleep(300);
  ok(await page.evaluate(() => window.__deck.cur) === vc.i + 1, `voice: the next slide's cue moves on (slide ${vc.i + 2})`);
  ok(!log.some(e => /pageerror/.test(e)), `no page errors${log.length ? ': ' + log.slice(0, 3).join('; ') : ''}`);
  await b.close(); console.log(fails.length ? `${fails.length} FAILED` : 'all ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
