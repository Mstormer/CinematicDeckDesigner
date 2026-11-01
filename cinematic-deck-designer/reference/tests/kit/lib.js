// Shared helpers for the check tools: launch headless Chrome, open a deck, wait until it is ready, learn its slides.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const url = require('url');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const mkdir = d => { fs.mkdirSync(d, { recursive: true }); return d; };
const href = f => url.pathToFileURL(path.resolve(f)).href;

async function launch(extra = []) {
  return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', ...extra] });
}

// collects page errors and console errors (and warnings when asked) into log
function watch(page, log, tag = '') {
  page.on('pageerror', e => log.push(`${tag}pageerror: ${String(e).slice(0, 300)}`));
  page.on('console', m => { if (m.type() === 'error') log.push(`${tag}console.error: ${m.text().slice(0, 300)}`); });
}

// fonts loaded, the world's bakes drained (at most maxMs), __deck present
async function ready(page, maxMs = 9000) {
  await page.waitForFunction(() => !!window.__deck, null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready.then(() => 0));
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const left = await page.evaluate(() => typeof window.__worldBakes === 'function' ? window.__worldBakes() : 0);
    if (left === 0) break; await sleep(100);
  }
  await sleep(200);
}

async function open(browser, file, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1920, height: 1080 }, reducedMotion: o.reducedMotion || 'no-preference', hasTouch: !!o.touch, isMobile: !!o.mobile, deviceScaleFactor: o.dpr || 1 });
  if (o.init) await ctx.addInitScript(o.init);
  const page = await ctx.newPage(); const log = []; watch(page, log);
  await page.goto(href(file) + (o.hash || '')); await ready(page);
  return { ctx, page, log };
}

// slide ids, builds, transition kinds, parts, from the DOM and __deck
const slides = page => page.evaluate(() => [...document.querySelectorAll('#slides > .slide')].map((s, i) => ({ i, id: s.id, builds: window.__deck.maxStep(i), trans: s.dataset.trans || '', part: s.dataset.part, hush: !!s.dataset.hush, title: s.dataset.title || '' })));

// settled frame of slide i, all builds shown
async function settle(page, i, wait = 700) {
  await page.evaluate(i => { const D = window.__deck; D.go(i, { instant: true, toEnd: true, force: true }); }, i);
  await sleep(wait);
  await page.evaluate(() => window.__deck.settle());
  await sleep(150);
}

// waits until the deck is not busy (or ms passes)
async function idle(page, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await page.evaluate(() => window.__deck.busy))) return Date.now() - t0; await sleep(40); } return -1; }

module.exports = { chromium, launch, open, ready, watch, slides, settle, idle, sleep, mkdir, href, path, fs };
