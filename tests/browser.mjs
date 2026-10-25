/** Run `npm run dev -- --port 5173` first, then `npm run test:browser`.
 * Uses real UI input and the read-only snapshot. Set GAME_URL or CHROMIUM_PATH if needed.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.GAME_URL || 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const failures = [];
const checks = [];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
function watch(page, label) {
  page.on('pageerror', error => failures.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`${label}: ${message.text()} (${message.location().url})`); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) failures.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
}
async function boot(page) {
  await page.goto(base);
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await page.waitForFunction(() => { const canvas = document.querySelector('canvas'); const view = window.__MOSSGUARD__?.view; return canvas && canvas.width >= 1100 && view?.worldWidth === 1100 && view?.worldHeight === 680; });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('canvas').getBoundingClientRect().height > 100);
}
async function point(page, x, y, touch = false) {
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const canvas = await page.locator('canvas').boundingBox();
  assert(canvas && canvas.width > 0 && canvas.height > 0, 'Battlefield is visible');
  const geometry = await page.locator('canvas').evaluate(element => ({ width: element.width, height: element.height, view: window.__MOSSGUARD__.view }));
  const { view } = geometry;
  const px = canvas.x + (x - view.scrollX) * view.renderScale * view.zoom / geometry.width * canvas.width;
  const py = canvas.y + (y - view.scrollY) * view.renderScale * view.zoom / geometry.height * canvas.height;
  if (touch) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
}
async function fit(page, label) {
  await page.waitForFunction(() => { const box = document.querySelector('canvas').getBoundingClientRect(), field = document.querySelector('#battlefield').getBoundingClientRect(); return Math.abs(box.width / box.height - field.width / field.height) < 0.02; });
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, canvas: document.querySelector('canvas').getBoundingClientRect().toJSON(), field: document.querySelector('#battlefield').getBoundingClientRect().toJSON() }));
  assert(dimensions.scroll <= dimensions.width, `${label} has no horizontal overflow: ${JSON.stringify(dimensions)}`);
  assert(dimensions.canvas.width <= dimensions.width, `${label} battlefield fits viewport`);
  assert(Math.abs(dimensions.canvas.width / dimensions.canvas.height - dimensions.field.width / dimensions.field.height) < 0.02, `${label} canvas fills its viewport without distortion`);
  const dockCards = await page.locator('.tower-card').evaluateAll(cards => cards.map(card => { const box = card.getBoundingClientRect(); const info = card.querySelector('.tower-info').getBoundingClientRect(); return { name: card.getAttribute('aria-label'), fits: info.left >= box.left - 1 && info.right <= box.right + 1 && info.top >= box.top - 1 && info.bottom <= box.bottom + 1 }; }));
  assert(dockCards.every(card => card.fits), `${label} tower dock text fits its cards: ${JSON.stringify(dockCards)}`);
  checks.push(`${label} layout and readable tower dock`);
}
try {
  await mkdir('artifacts', { recursive: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  watch(desktop, 'desktop');
  await boot(desktop);
  await fit(desktop, 'Desktop');
  assert.equal((await state(desktop)).gold, 240);
  assert.equal(await desktop.locator('.command-towers').isVisible(), false, 'Desktop command panel avoids repeating the dock artwork');
  const perfStart = await state(desktop);
  const wallStart = Date.now();
  await new Promise(resolve => setTimeout(resolve, 2000));
  const perfEnd = await state(desktop);
  console.log(`Performance: ${(perfEnd.time - perfStart.time).toFixed(2)} game seconds in ${((Date.now() - wallStart) / 1000).toFixed(2)} wall seconds`);
  assert.equal(await desktop.locator('#meteor').isDisabled(), true, 'Meteor disabled before a wave');
  await desktop.screenshot({ path: 'artifacts/desktop-initial.png', fullPage: true });
  assert.equal(await desktop.locator('[data-tower]').count(), 7, 'All seven tower disciplines are available');
  assert.match(await desktop.locator('#wave').innerText(), /\/ 12$/, 'Campaign has twelve waves');
  await desktop.locator('#rail-map').click();
  assert.equal(await desktop.locator('#rail-map').getAttribute('aria-pressed'), 'true');
  assert.equal(await desktop.locator('#minimap-toggle').evaluate(element => element.classList.contains('active')), true);
  await desktop.locator('#minimap-toggle').click();
  assert.equal(await desktop.locator('#rail-map').getAttribute('aria-pressed'), 'false');
  assert.equal(await desktop.locator('#minimap-toggle').evaluate(element => element.classList.contains('active')), false);
  checks.push('Seven towers, twelve opening-level waves, and tactical map/minimap controls');

  await desktop.locator('[data-tower="archer"]').click();
  await point(desktop, 234, 241);
  await desktop.waitForFunction(() => window.__MOSSGUARD__.towers.length === 1);
  assert.equal((await state(desktop)).gold, 170);
  await desktop.locator('[data-tower="cannon"]').click();
  await point(desktop, 422, 294);
  await desktop.waitForFunction(() => window.__MOSSGUARD__.towers.length === 2);
  assert.equal((await state(desktop)).gold, 50);
  await point(desktop, 234, 241);
  assert.equal(await desktop.locator('#upgrade').isDisabled(), true, 'Unaffordable upgrades are disabled');
  checks.push('Tower placement and gold spending');

  await desktop.locator('[data-tower="frost"]').click();
  assert.equal(await desktop.locator('[data-tower="frost"]').getAttribute('aria-pressed'), 'true');
  await desktop.keyboard.press('Escape');
  assert.equal(await desktop.locator('[data-tower="frost"]').getAttribute('aria-pressed'), 'false');
  checks.push('Selection cancellation');

  await desktop.locator('#start-wave').focus();
  await desktop.keyboard.press('Space');
  await desktop.waitForFunction(() => window.__MOSSGUARD__.status === 'wave' && window.__MOSSGUARD__.enemies.length > 0);
  assert.equal(await desktop.locator('#start-wave').isDisabled(), true);
  await desktop.waitForFunction(() => window.__MOSSGUARD__?.kills >= 1, undefined, { timeout: 20000 });
  assert((await state(desktop)).gold >= 61, 'Combat awards gold');
  checks.push('Keyboard wave start, live spawning, combat, and rewards');

  await desktop.locator('#pause').click();
  await desktop.waitForFunction(() => window.__MOSSGUARD__.paused);
  const paused = await state(desktop);
  await new Promise(resolve => setTimeout(resolve, 350));
  const stillPaused = await state(desktop);
  assert.equal(stillPaused.time, paused.time, 'Pause freezes simulation time');
  assert.deepEqual(stillPaused.enemies, paused.enemies, 'Pause freezes enemy movement');
  assert.equal(await desktop.locator('#pause-overlay').isVisible(), true);
  await desktop.locator('#guide-nav').click();
  assert.equal(await desktop.locator('#guide').isVisible(), true);
  await desktop.locator('#guide-done').click();
  assert.equal((await state(desktop)).paused, true, 'Guide restores previous paused state');
  await desktop.locator('#settings-open').click();
  await desktop.locator('#motion-setting').focus();
  await desktop.keyboard.press('Escape');
  assert.equal(await desktop.locator('#settings').isVisible(), false, 'Escape closes settings while a checkbox has focus');
  assert.equal((await state(desktop)).paused, true, 'Settings preserve a previously paused game');
  await desktop.locator('#resume').click();
  await desktop.waitForFunction(() => !window.__MOSSGUARD__.paused);
  checks.push('Pause, resume, and guide pause preservation');

  await desktop.locator('#speed').click();
  assert.equal((await state(desktop)).speed, 2);
  await desktop.locator('#guide-nav').click();
  assert.equal((await state(desktop)).paused, true);
  await desktop.locator('#guide-done').click();
  assert.equal((await state(desktop)).paused, false, 'Guide resumes an active game');
  checks.push('Double speed and field guide');

  await desktop.locator('#settings-open').click();
  assert.equal(await desktop.locator('#settings').isVisible(), true);
  assert.equal((await state(desktop)).paused, true, 'Settings pause active combat');
  await desktop.locator('#motion-setting').check();
  await desktop.locator('#sound-setting').check();
  await desktop.waitForFunction(() => document.querySelector('#sound').getAttribute('aria-label') === 'Mute sound' && !document.querySelector('#sound').hasAttribute('aria-busy'), undefined, { timeout: 20000 });
  await desktop.locator('#sound-setting').uncheck();
  await desktop.waitForFunction(() => document.querySelector('#sound').getAttribute('aria-label') === 'Enable sound' && !document.querySelector('#sound').hasAttribute('aria-busy'));
  await desktop.locator('#settings-done').click();
  assert.equal((await state(desktop)).paused, false, 'Settings restore active combat');
  await desktop.locator('#settings-open').click();
  assert.equal(await desktop.locator('#motion-setting').isChecked(), true, 'Reduced motion preference survives closing settings');
  await desktop.locator('#motion-setting').uncheck();
  await desktop.locator('#motion-setting').focus();
  await desktop.keyboard.press('Escape');
  assert.equal(await desktop.locator('#settings').isVisible(), false);
  assert.equal((await state(desktop)).paused, false, 'Escape restores active combat from focused settings checkbox');
  checks.push('Settings pause/resume, reduced motion, and synchronized sound preferences');

  await desktop.locator('#meteor').click();
  assert.equal(await desktop.locator('#meteor').evaluate(element => element.classList.contains('armed')), true);
  const target = (await state(desktop)).enemies[0];
  await point(desktop, target?.x || 150, target?.y || 170);
  assert((await state(desktop)).meteorCooldown > 20, 'Meteor activates cooldown');
  assert.equal(await desktop.locator('#meteor').isDisabled(), true);
  assert.equal(await desktop.locator('#meteor').evaluate(element => element.classList.contains('armed')), false);
  checks.push('Targeted meteor and cooldown');

  await point(desktop, 234, 241);
  await desktop.waitForFunction(() => window.__MOSSGUARD__.gold >= 56);
  await desktop.locator('#upgrade').click();
  assert.equal((await state(desktop)).towers.find(tower => tower.padId === 0).level, 2, 'Upgrade changes tower level');
  await point(desktop, 422, 294);
  const beforeSale = await state(desktop);
  await desktop.locator('#sell').click();
  const afterSale = await state(desktop);
  assert.equal(afterSale.towers.some(tower => tower.padId === 2), false);
  assert(afterSale.gold >= beforeSale.gold + 84, 'Selling refunds 70%');
  checks.push('Upgrade and sale');
  await desktop.screenshot({ path: 'artifacts/desktop-combat.png', fullPage: true });
  if (await desktop.locator('#sound').getAttribute('aria-label') === 'Mute sound') await desktop.locator('#sound').click();
  await desktop.locator('#sound').click();
  await desktop.waitForFunction(() => document.querySelector('#sound').getAttribute('aria-label') === 'Mute sound' && !document.querySelector('#sound').hasAttribute('aria-busy'), undefined, { timeout: 20000 });
  await desktop.locator('#sound').click();
  await desktop.waitForFunction(() => document.querySelector('#sound').getAttribute('aria-label') === 'Enable sound' && !document.querySelector('#sound').hasAttribute('aria-busy'));
  checks.push('Sound control');
  await desktop.setViewportSize({ width: 1280, height: 900 });
  await fit(desktop, '1280px desktop');
  await desktop.screenshot({ path: 'artifacts/desktop-1280.png', fullPage: true });
  console.log('1280px controls:', await desktop.locator('#start-wave').boundingBox());

  // Only arcane towers attack on this fresh page. Two wounded foes at the same time
  // before the lead foe can reach the distant tower demonstrates a real chain hit.
  const arcane = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  watch(arcane, 'arcane');
  await boot(arcane);
  await arcane.locator('[data-tower="arcane"]').click();
  await point(arcane, 234, 241);
  await arcane.locator('[data-tower="arcane"]').click();
  await point(arcane, 961, 271);
  const arcaneBuilt = await state(arcane);
  assert.equal(arcaneBuilt.towers.filter(tower => tower.kind === 'arcane').length, 2);
  assert.equal(arcaneBuilt.gold, 40);
  await arcane.locator('#start-wave').click();
  await arcane.waitForFunction(() => window.__MOSSGUARD__.enemies.filter(enemy => enemy.hp < enemy.maxHp).length >= 2, undefined, { timeout: 20000 });
  const chainState = await state(arcane);
  assert(chainState.enemies.every(enemy => enemy.distance < 400), 'The chain is observed before the distant tower can attack');
  assert(chainState.enemies.some(enemy => enemy.hp < enemy.maxHp && enemy.hp % 1 !== 0), 'A secondary target receives fractional chain-falloff damage');
  await arcane.screenshot({ path: 'artifacts/arcane-combat.png', fullPage: true });
  await arcane.waitForFunction(() => window.__MOSSGUARD__.kills >= 1, undefined, { timeout: 20000 });
  assert((await state(arcane)).gold > 40, 'Arcane kills award gold');
  checks.push('Arcane placement, real chain damage/falloff, kills, and rewards');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  watch(mobile, 'mobile');
  await boot(mobile);
  await fit(mobile, 'Mobile');
  await mobile.locator('[data-tower="frost"]').tap();
  await mobile.locator('canvas').scrollIntoViewIfNeeded();
  await point(mobile, 571, 237, true);
  await mobile.waitForFunction(() => window.__MOSSGUARD__.towers.length === 1);
  const mobileState = await state(mobile);
  assert.equal(mobileState.towers[0].kind, 'frost');
  assert.equal(mobileState.gold, 150);
  await mobile.locator('#how-to').tap();
  assert.equal(await mobile.locator('#guide').isVisible(), true);
  await mobile.locator('#guide-done').tap();
  assert.equal((await state(mobile)).paused, false);
  await mobile.evaluate(() => scrollTo(0, 0));
  await mobile.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  checks.push('Mobile touch placement and guide');
  assert.deepEqual(failures, [], `No browser runtime/HTTP errors: ${failures.join('; ')}`);
  console.log(`PASS: ${checks.length} browser checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
  console.log('Screenshots: artifacts/desktop-initial.png, artifacts/desktop-combat.png, artifacts/desktop-1280.png, artifacts/arcane-combat.png, artifacts/mobile.png');
} finally {
  await browser.close();
}
