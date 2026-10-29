import { toggleGameSound, enterBattle, clearNextWave } from './play-helpers.mjs';
/**
 * Build first: npm run build
 * Serve the project prefix: BASE_PATH=/my-first-game/ node scripts/serve.mjs
 * Run: npm run test:platforms
 * Optional: PLATFORM_BASE, STANDALONE_FILE, BROWSER=chromium|firefox|webkit,
 * CHROMIUM_PATH. Mobile profiles emulate viewport/touch, not physical devices.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = path.resolve(root, process.env.STANDALONE_FILE || 'samples/mossguard.html');
const standaloneUrl = pathToFileURL(standalone).href;
const base = new URL(process.env.PLATFORM_BASE || 'http://127.0.0.1:4173/my-first-game/');
const engineName = process.env.BROWSER || 'chromium';
const engine = { chromium, firefox, webkit }[engineName];
assert(engine, `Unsupported BROWSER=${engineName}; choose chromium, firefox, or webkit`);
const launch = { headless: true };
if (engineName === 'chromium') {
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  else if (!existsSync(engine.executablePath()) && existsSync('/usr/bin/chromium')) launch.executablePath = '/usr/bin/chromium';
  launch.args = ['--no-sandbox'];
}
const browser = await engine.launch(launch);
const errors = [];
const checks = [];
const screenshots = path.join(root, 'artifacts', 'platforms', engineName);
const state = page => page.evaluate(() => window.__MOSSGUARD__);

function monitor(page, label) {
  const requests = [];
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()} (${message.location().url})`);
  });
  page.on('request', request => requests.push({ url: request.url(), type: request.resourceType() }));
  page.on('requestfailed', request => errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);
  });
  return requests;
}
async function boot(page, url, inlineHtml = null) {
  if (inlineHtml !== null) await page.setContent(inlineHtml, { waitUntil: 'load' });
  else await page.goto(url);
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await enterBattle(page);
  await page.waitForFunction(() => { const canvas = document.querySelector('#battlefield canvas'); const view = window.__MOSSGUARD__?.view; return canvas && canvas.width >= 1100 && view?.worldWidth === 1100 && view?.worldHeight === 680; });
  await page.evaluate(() => document.fonts.ready);
  assert.equal((await state(page)).gold, 300, 'A new session starts with 300 gold');
  assert.equal(await page.locator('[data-tower]').count(), 17, 'All seventeen tower families are present');
  const pixels = await page.locator('#battlefield canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Sample actual map landmarks after the fitted camera transform. Canvas
    // corners can now correctly contain letterboxing on short/wide screens.
    const view = window.__MOSSGUARD__.view;
    return [[100, 100], [550, 340], [900, 500], [400, 600]].map(([x, y]) => {
      const u = Math.max(0, Math.min(canvas.width - 1, Math.round((x - view.scrollX) * view.renderScale * view.zoom)));
      const v = Math.max(0, Math.min(canvas.height - 1, Math.round((y - view.scrollY) * view.renderScale * view.zoom)));
      return Array.from(ctx.getImageData(u, v, 1, 1).data);
    });
  });
  assert(pixels && pixels.every(pixel => pixel[3] === 255) && new Set(pixels.map(pixel => pixel.join(','))).size > 1, 'The rendered map is populated with visible image content');
}
async function layout(page, label, mobile = false) {
  await page.waitForFunction(() => {
    const box = document.querySelector('#battlefield canvas').getBoundingClientRect(), field = document.querySelector('#battlefield').getBoundingClientRect();
    return box.width > 100 && box.height > 50 && Math.abs(box.width / box.height - field.width / field.height) < .02;
  });
  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('#battlefield canvas');
    const box = canvas.getBoundingClientRect();
    return {
      width: innerWidth, scroll: document.documentElement.scrollWidth,
      canvas: { width: box.width, height: box.height }, touchAction: getComputedStyle(canvas).touchAction,
      cards: [...document.querySelectorAll('.tower-card')].map(card => {
        const box = card.getBoundingClientRect(), text = card.querySelector('.tower-info').getBoundingClientRect();
        return { name: card.dataset.tower, fits: text.left >= box.left - 1 && text.right <= box.right + 1 && text.top >= box.top - 1 && text.bottom <= box.bottom + 1 };
      }),
      wave: document.querySelector('#start-wave').getBoundingClientRect().toJSON(),
    };
  });
  assert(metrics.scroll <= metrics.width, `${label}: no horizontal overflow (${metrics.scroll} > ${metrics.width})`);
  assert(metrics.canvas.width <= metrics.width, `${label}: battlefield fits the viewport`);
  assert(metrics.cards.every(card => card.fits), `${label}: tower names fit cards: ${JSON.stringify(metrics.cards)}`);
  assert.equal(metrics.touchAction, 'none', `${label}: canvas keeps direct game touches from scrolling the page`);
  if (mobile) assert(metrics.wave.height >= 44 && metrics.wave.width >= 44, `${label}: wave control has a 44px touch target`);
  checks.push(`${label}: readable layout${mobile ? ' and touch controls' : ''}`);
}
async function build(page, kind, padId, touch = false, captureName = null) {
  const before = await state(page);
  const card = page.locator(`[data-tower="${kind}"]`);
  if (touch) await card.tap(); else await card.click();
  const site = page.locator(`#foundation-picker [data-foundation="${padId}"]`);
  await site.waitFor({ state: 'visible' });
  assert.equal(await site.isDisabled(), false, 'The chosen foundation is available');
  if (captureName) await screenshot(page, captureName);
  assert((await site.getAttribute('aria-label') || await site.innerText()).trim(), 'Foundation has an accessible name');
  if (touch) {
    const box = await site.boundingBox();
    assert(box && box.width >= 44 && box.height >= 44, 'Named foundation is a 44px touch target');
    await site.tap();
  } else {
    await site.focus();
    await page.keyboard.press('Enter');
  }
  await page.waitForFunction(count => window.__MOSSGUARD__.towers.length === count, before.towers.length + 1);
  const after = await state(page);
  assert(after.towers.some(tower => tower.padId === padId && tower.kind === kind), 'Chosen tower is built at the intended named foundation');
  const costs = { archer: 80, cannon: 100, frost: 90, arcane: 160, tesla: 180 };
  assert.equal(after.gold, before.gold - costs[kind], 'Construction spends the expected gold');
}
async function pauseAndLifecycle(page) {
  if (await page.locator('#close-inspection').isVisible()) await page.locator('#close-inspection').click();
  await page.locator('#pause').click();
  await page.waitForFunction(() => window.__MOSSGUARD__.paused);
  const frozen = await state(page);
  await new Promise(resolve => setTimeout(resolve, 250));
  const still = await state(page);
  assert.equal(still.time, frozen.time, 'Pause freezes simulation time');
  assert.deepEqual(still.enemies, frozen.enemies, 'Pause freezes active enemies');
  await page.locator('#resume').click();
  await page.waitForFunction(() => !window.__MOSSGUARD__.paused);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForFunction(() => window.__MOSSGUARD__.paused);
  assert.equal(await page.locator('#pause-overlay').isVisible(), true, 'A page lifecycle exit pauses combat and shows resume');
  await page.locator('#resume').click();
  await page.waitForFunction(() => !window.__MOSSGUARD__.paused);
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(screenshots, name + '.png'), fullPage: true });
}
async function profile(name, viewport, touch = false, rotate = null) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: touch, ...(touch && engineName !== 'firefox' ? { isMobile: true } : {}) });
  const page = await context.newPage();
  const requests = monitor(page, name);
  try {
    await boot(page, base.href);
    await layout(page, name, touch);
    if (touch) {
      await build(page, 'arcane', 0, true, `${name}-foundations`);
      checks.push(`${name}: touch builds an arcane tower on a named foundation`);
    } else {
      await build(page, 'archer', 0);
      checks.push(`${name}: keyboard builds a ranger on a named foundation`);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await screenshot(page, name);
    if (rotate) {
      await page.setViewportSize(rotate);
      await layout(page, `${name} rotated`, true);
      await build(page, 'frost', 4, true);
      assert.equal((await state(page)).towers.length, 2, 'Rotation preserves the existing tower and accepts a new touch build');
      checks.push(`${name}: orientation change preserves state and touch placement`);
      await page.evaluate(() => scrollTo(0, 0));
      await screenshot(page, `${name}-rotated`);
    }
    const http = requests.filter(request => /^https?:/.test(request.url));
    assert(http.length >= 3, `${name}: the production scripts/styles/map were requested`);
    assert(http.every(request => new URL(request.url).origin === base.origin && new URL(request.url).pathname.startsWith(base.pathname)), `${name}: all game assets load under the project subpath: ${JSON.stringify(http)}`);
    assert(http.some(request => request.type === 'image' && /\.webp(?:\?|$)/.test(request.url)), `${name}: the illustrated map was loaded successfully from the project subpath`);
  } catch (error) {
    await screenshot(page, `${name}-failure`).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

try {
  await mkdir(screenshots, { recursive: true });
  console.log(`Engine: ${engineName} ${browser.version()}${launch.executablePath ? ` (${launch.executablePath})` : ' (Playwright managed)'}; touch devices below are emulated.`);
  if (process.env.SKIP_STANDALONE === '1') {
    console.log('SKIP standalone sample checks: SKIP_STANDALONE=1; hosted profiles only.');
  } else {
  assert(existsSync(standalone), `Standalone HTML is missing: ${standalone}. Run its export command first.`);
  const html = await readFile(standalone, 'utf8');
  assert(/data:image\/webp;base64,/.test(html), 'Standalone sample embeds the illustrated map');
  assert(!/<script\b[^>]*\bsrc=/i.test(html), 'Standalone sample embeds its scripts');
  const embeddedAudio = html.match(/data:audio\/[^;,]+;base64,[A-Za-z0-9+/=]+/g) || [];
  assert(embeddedAudio.length >= 12, 'Standalone sample embeds all twelve supplied WAV effects');
  assert(!/<link\b[^>]*\brel=["']stylesheet["']/i.test(html), 'Standalone sample embeds its styles');
  // Probe direct file navigation once. Managed browsers may prohibit this protocol;
  // honor that policy and verify the identical inline HTML in an offline opaque page.
  const probeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, offline: true });
  const probePage = await probeContext.newPage();
  try {
    await probePage.goto(standaloneUrl, { waitUntil: 'load' });
    await probePage.waitForSelector('#battlefield[data-ready="true"]');
    checks.push('Direct file:// navigation and game boot');
  } catch (error) {
    if (!/ERR_BLOCKED_BY_ADMINISTRATOR/.test(String(error))) throw error;
    console.log('SKIP direct file:// execution: this browser is blocked by administrator policy; no bypass attempted.');
  } finally { await probeContext.close(); }
  const offline = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, offline: true });
  await offline.route(/^https?:\/\//, route => route.abort());
  const filePage = await offline.newPage();
  const offlineRequests = monitor(filePage, 'standalone');
  try {
    await boot(filePage, null, html);
    await layout(filePage, 'Standalone offline inline HTML desktop');
    await toggleGameSound(filePage);
    await filePage.waitForFunction(() => document.querySelector('#sound').getAttribute('aria-label') === 'Mute sound' && !document.querySelector('#sound').hasAttribute('aria-busy'), undefined, { timeout: 20000 });
    checks.push('Standalone offline inline HTML: twelve embedded WAV effects decode and sound enables without network access');
    await build(filePage, 'tesla', 0);
    assert.equal((await state(filePage)).gold, 120);
    await clearNextWave(filePage, { starfall: false });
    await filePage.waitForFunction(()=>window.__MOSSGUARD__.animations.towers[0].animation==='idle');
    const offlinePractice=await state(filePage);
    assert(offlinePractice.towerMastery.tesla>0,'Offline real combat earns family XP without network access');
    assert.equal(offlinePractice.progression.towerMastery.tesla,offlinePractice.towerMastery.tesla,'Offline family XP reconciles into session progression');
    assert.equal(offlinePractice.animations.towerFps,30,'Offline towers use the supplied 30 FPS animation clips');
    assert.match(offlinePractice.animations.towers[0].frameName,/^tesla-idle-\d+$/,'Offline construction uses an embedded supplied tower frame');
    await filePage.locator('#battlefield').focus();
    await filePage.keyboard.press('Space');
    await filePage.waitForFunction(() => window.__MOSSGUARD__.status === 'wave');
    await filePage.waitForFunction(() => window.__MOSSGUARD__.enemies.some(enemy => enemy.hp < enemy.maxHp && enemy.hp % 1 !== 0), undefined, { timeout: 20000 });
    const chain = await state(filePage);
    assert(chain.enemies.some(enemy => enemy.hp < enemy.maxHp && enemy.hp % 1 !== 0), 'Offline Tesla combat damages a secondary target with chain falloff');
    await filePage.waitForFunction(() => window.__MOSSGUARD__.kills > 0, undefined, { timeout: 20000 });
    assert((await state(filePage)).gold > 120, 'Offline combat awards gold');
    await pauseAndLifecycle(filePage);
    await screenshot(filePage, 'standalone-offline-combat');
    const http = offlineRequests.filter(request => /^https?:/.test(request.url));
    const externalFiles = offlineRequests.filter(request => request.url.startsWith('file:') && request.url !== standaloneUrl);
    assert.deepEqual(http, [], 'The standalone game makes zero HTTP requests, with all network access blocked');
    assert.deepEqual(externalFiles, [], 'The standalone game loads no companion files');
    checks.push('Standalone offline inline HTML: embedded 30 FPS towers, earned family XP, map, real chain combat, rewards, pause/resume, pagehide auto-pause, zero network/companion files');
  } catch (error) {
    await screenshot(filePage, 'standalone-failure').catch(() => {});
    throw error;
  } finally { await offline.close(); }

  }

  await profile('desktop-1280', { width: 1280, height: 900 });
  await profile('iphone-portrait', { width: 390, height: 844 }, true, { width: 844, height: 390 });
  await profile('android-portrait', { width: 360, height: 800 }, true, { width: 800, height: 360 });
  await profile('phone-landscape', { width: 844, height: 390 }, true);
  await profile('tablet-portrait', { width: 768, height: 1024 }, true);
  assert.deepEqual(errors, [], `No browser errors, failed asset requests, or HTTP errors:\n${errors.join('\n')}`);
  console.log(`PASS: ${checks.length} platform checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
  console.log(`Screenshots: ${path.relative(root, screenshots)}/`);
} finally { await browser.close(); }
