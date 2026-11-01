// usage: node phone.js <deck.html> <outdir>
// A phone with touch (isMobile, hasTouch, DPR 3): portrait 390x844 and landscape 844x390.
// Portrait: the turn card shows; a tap hides it. Both: the stage fits the screen, a tap starts the cover from standby,
// a second tap after it lands moves on. No page errors. A left swipe moving on is reported (WARN), not failed. Saves ph-<orient>-N.png. Exit 1 on failure.
const L = require('./lib');
const [file, out] = process.argv.slice(2);
(async () => {
  L.mkdir(out);
  const b = await L.launch(), fails = [], logs = [];
  for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const { ctx, page, log } = await L.open(b, file, { viewport: vp, touch: true, mobile: true, dpr: 3 });
    const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${name}: ${m}`); if (!c) fails.push(`${name}: ${m}`); };
    const shot = n => page.screenshot({ path: L.path.join(out, `ph-${name}-${n}.png`) });
    const turn = () => page.evaluate(() => { const t = document.getElementById('turn'); return !!t && getComputedStyle(t).display !== 'none'; });
    const fitR = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top) }; });
    ok(fitR.w <= vp.width + 1 && fitR.h <= vp.height + 1 && (Math.abs(fitR.w - vp.width) <= 1 || Math.abs(fitR.h - vp.height) <= 1), `stage fits ${JSON.stringify(fitR)}`);
    await shot(1);
    const t0 = await turn();
    if (name === 'portrait') {
      ok(t0, 'turn card shows');
      await page.touchscreen.tap(vp.width / 2, vp.height / 2); await L.sleep(300);
      ok(!(await turn()), 'a tap hides the turn card'); await shot(2);
    } else ok(!t0, 'no turn card in landscape');
    ok(await page.evaluate(() => window.__deck.standby), 'starts in standby');
    await page.touchscreen.tap(vp.width / 2, vp.height / 2);
    await L.sleep(1200); ok(!(await page.evaluate(() => window.__deck.standby)), 'a tap starts the cover');
    await L.idle(page, 9000); await L.sleep(800); await shot(3);
    await page.touchscreen.tap(vp.width / 2, vp.height / 2); await L.sleep(300);
    await L.idle(page, 9000); await L.sleep(600);
    const c1 = await page.evaluate(() => window.__deck.cur); ok(c1 === 1, `a second tap moves on (slide ${c1 + 1})`); await shot(4);
    // a left swipe: touch events through CDP, as a finger would
    const cdp = await ctx.newCDPSession(page), y = vp.height / 2, pts = x => [{ x, y }];
    const before = await page.evaluate(() => [window.__deck.cur, window.__deck.step]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(vp.width * .8) });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(vp.width * (.8 - .1 * i)) }); await L.sleep(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await L.sleep(400);
    const after = await page.evaluate(() => [window.__deck.cur, window.__deck.step]);
    const sw = after[0] > before[0] || after[1] > before[1];   // a warning, not a failure: the brief asks for the turn card and tap-to-start
    console.log(`${sw ? 'ok  ' : 'WARN'} ${name}: a left swipe moves on (${before} -> ${after})${sw ? '' : ' - the browser cancels the pointer for a pan (pointercancel); #stage needs touch-action:none'}`);
    await L.idle(page, 9000); await L.sleep(600); await shot(5);
    ok(!log.some(e => e.includes('pageerror')), `no page errors${log.length ? ': ' + log.join('; ') : ''}`); logs.push(...log);
    await ctx.close();
  }
  console.log(fails.length ? `${fails.length} failures` : 'phone: all ok');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
