/** Tower strategy controls through real game input and read-only state snapshots. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.GAME_URL || 'http://127.0.0.1:4173/my-first-game/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const checks = [], errors = [];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
function watch(page, label) {
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('requestfailed', request => errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
}
async function boot(page) {
  await page.goto(base);
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await page.waitForFunction(() => window.__MOSSGUARD__?.view && window.__MOSSGUARD__?.pads?.length > 0);
  await page.evaluate(() => document.fonts.ready);
}
async function namedBuild(page, kind, site, touch = false) {
  const before = await state(page);
  const card = page.locator(`[data-tower="${kind}"]`), foundation = page.locator(`[data-foundation="${site}"]`);
  if (touch) await card.tap(); else await card.click();
  if (touch) await foundation.tap(); else await foundation.click();
  await page.waitForFunction(count => window.__MOSSGUARD__.towers.length === count, before.towers.length + 1);
  return state(page);
}
async function selectSite(page, site) {
  await page.locator('#battlefield canvas').scrollIntoViewIfNeeded();
  const target = await page.locator('#battlefield canvas').evaluate((canvas, site) => {
    const state = window.__MOSSGUARD__, pad = state.pads.find(pad => pad.id === site), box = canvas.getBoundingClientRect(), view = state.view;
    return { x: box.x + (pad.x - view.scrollX) * view.renderScale * view.zoom / canvas.width * box.width,
      y: box.y + (pad.y - view.scrollY) * view.renderScale * view.zoom / canvas.height * box.height };
  }, site);
  await page.mouse.click(target.x, target.y);
  await page.locator('#targeting-select').waitFor({ state: 'visible' });
}
async function screenshot(page, name) { await page.screenshot({ path: `artifacts/strategy/${name}.png`, fullPage: true }); }

try {
  await mkdir('artifacts/strategy', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page, 'desktop'); await boot(page);
  await namedBuild(page, 'archer', 0); await namedBuild(page, 'archer', 1); await selectSite(page, 0);
  const first = (await state(page)).towers.find(tower => tower.padId === 0);
  assert(first && first.targeting === 'first', 'New towers default to first enemy targeting');
  for (const mode of ['last', 'strongest', 'fastest', 'first', 'strongest']) {
    await page.locator('#targeting-select').selectOption(mode);
    await page.waitForFunction(({ id, mode }) => window.__MOSSGUARD__.towers.find(tower => tower.id === id)?.targeting === mode, { id: first.id, mode });
    assert.equal(await page.locator('#targeting-select').inputValue(), mode, 'The visible control matches the model targeting mode');
  }
  checks.push('All four targeting priorities update the selected tower and visible control');

  const beforeMove = await state(page);
  await page.locator('#move-tower').click();
  await page.locator('[data-foundation="2"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-foundation="0"]').isDisabled(), true, 'The source foundation is occupied');
  assert.equal(await page.locator('[data-foundation="1"]').isDisabled(), true, 'Another tower foundation cannot be used as a move destination');
  const siteNames = await page.locator('[data-foundation]').allTextContents();
  assert(siteNames.every(name => name.trim() && !/\d/.test(name)), 'Move controls keep descriptive foundation names without placement numbers');
  await page.locator('[data-foundation="2"]').click();
  await page.waitForFunction(id => window.__MOSSGUARD__.towers.find(tower => tower.id === id)?.padId === 2, first.id);
  const moved = await state(page), movedTower = moved.towers.find(tower => tower.id === first.id);
  assert.equal(moved.gold, beforeMove.gold - 16, 'A ranger relocation costs twenty percent of base cost');
  assert.equal(movedTower.spent, first.spent, 'Movement fees are not added to refundable tower investment');
  assert.equal(movedTower.targeting, 'strongest', 'Moving preserves target priority');
  assert.equal(moved.towers.length, beforeMove.towers.length, 'Moving relocates the same tower rather than duplicating it');
  await screenshot(page, 'moved-tower');
  checks.push('Named-site relocation rejects occupied sites, charges the fee, and preserves the same tower');

  await page.locator('#move-tower').click();
  const cancelledBefore = await state(page);
  await page.locator('#cancel-foundation').click();
  const cancelledAfter = await state(page);
  assert.equal(cancelledAfter.gold, cancelledBefore.gold);
  assert.deepEqual(cancelledAfter.towers, cancelledBefore.towers, 'Cancelling relocation preserves tower and treasury');
  checks.push('Cancelling a relocation preserves the match');

  await page.locator('#battlefield').focus(); await page.keyboard.press('u');
  await page.waitForFunction(id => window.__MOSSGUARD__.towers.find(tower => tower.id === id)?.level === 2, first.id);
  const upgraded = await state(page), upgradedTower = upgraded.towers.find(tower => tower.id === first.id);
  assert.equal(upgraded.gold, moved.gold - 55, 'The upgrade hotkey pays the actual upgrade cost');
  await page.keyboard.press('x');
  await page.waitForFunction(id => !window.__MOSSGUARD__.towers.some(tower => tower.id === id), first.id);
  const sold = await state(page);
  assert.equal(sold.gold, upgraded.gold + Math.floor(upgradedTower.spent * .7), 'The sale hotkey refunds invested tower value without movement fees');
  assert.equal(sold.towers.length, 1);
  checks.push('Upgrade and sell hotkeys honor actual costs and non-refundable movement fees');

  for (const expected of [2, 3, 1]) {
    await page.locator('#speed').click();
    assert.equal((await state(page)).speed, expected);
    assert.match(await page.locator('#speed').innerText(), new RegExp(String(expected)));
  }
  await page.locator('#battlefield').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__MOSSGUARD__.status === 'wave');
  await page.keyboard.press('p'); await page.waitForFunction(() => window.__MOSSGUARD__.paused);
  const frozen = await state(page); await page.waitForTimeout(200);
  assert.equal((await state(page)).time, frozen.time, 'Pause still freezes simulation after changing speed');
  await page.keyboard.press('p'); await page.waitForFunction(() => !window.__MOSSGUARD__.paused);
  checks.push('Speed cycles through 1×, 2×, and 3× while wave and pause hotkeys remain usable');
  await screenshot(page, 'desktop-strategy'); await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  watch(mobile, 'mobile'); await boot(mobile); await namedBuild(mobile, 'archer', 0, true);
  await mobile.locator('#targeting-select').selectOption('fastest');
  assert.equal((await state(mobile)).towers[0].targeting, 'fastest');
  await mobile.locator('#move-tower').tap();
  await mobile.locator('[data-foundation="2"]').tap();
  await mobile.waitForFunction(() => window.__MOSSGUARD__.towers[0]?.padId === 2);
  const bounds = await mobile.evaluate(() => ({ width: innerWidth, page: document.documentElement.scrollWidth,
    controls: ['targeting-select', 'move-tower'].map(id => document.getElementById(id).getBoundingClientRect().toJSON()) }));
  assert(bounds.page <= bounds.width, 'Strategy controls do not overflow a phone');
  assert(bounds.controls.every(box => box.width >= 44 && box.height >= 44), 'Strategy controls have usable touch targets');
  await screenshot(mobile, 'phone-strategy'); await mobile.close();
  checks.push('Phone target selection and paid relocation stay usable without horizontal overflow');

  assert.deepEqual(errors, [], `No strategy UI or runtime errors: ${errors.join('\n')}`);
  console.log(`PASS: ${checks.length} strategy checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
} catch (error) {
  const page = browser.contexts().flatMap(context => context.pages()).at(-1);
  if (page) await screenshot(page, 'failure').catch(() => {});
  throw error;
} finally { await browser.close(); }
