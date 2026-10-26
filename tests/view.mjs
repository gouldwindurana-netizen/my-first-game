/**
 * Run against a built server or Vite: VIEW_BASE=http://localhost:5173 npm run test:view
 * Checks CSS readability, physical render resolution, zoom/pan input, and fullscreen.
 * All game actions use real pointer/keyboard/touch input; snapshots are read-only.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.VIEW_BASE || process.env.GAME_URL || process.env.PLATFORM_BASE || 'http://localhost:5173';
const executablePath = process.env.CHROMIUM_PATH || (existsSync(chromium.executablePath()) ? undefined : '/usr/bin/chromium');
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
const screenshots = path.join(root, 'artifacts', 'view');
const errors = [];
const checks = [];
const skips = [];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
const pads = { 0: { x: 234, y: 241 }, 2: { x: 422, y: 294 }, 4: { x: 571, y: 237 } };
function watch(page, label) {
  const assets = new Set();
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('requestfailed', request => errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);
    if (response.ok() && /^image\//.test(response.headers()['content-type'] || '')) assets.add(response.url());
  });
  return assets;
}
async function boot(page) {
  await page.goto(base);
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await page.waitForFunction(() => {
    const state = window.__MOSSGUARD__, canvas = document.querySelector('#battlefield canvas');
    return state?.view && canvas?.width >= 1100 && state.view.worldWidth === 1100 && state.view.worldHeight === 680;
  });
  await page.evaluate(() => document.fonts.ready);
  assert.equal((await state(page)).gold, 240);
}
async function layout(page, label, minimumMapWidth = null) {
  await page.waitForFunction(() => {
    const box = document.querySelector('#battlefield canvas').getBoundingClientRect(), field = document.querySelector('#battlefield').getBoundingClientRect();
    return box.width > 100 && Math.abs(box.width / box.height - field.width / field.height) < .02;
  });
  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('#battlefield canvas'), map = canvas.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
    return {
      pageHeight: document.documentElement.scrollHeight, dock: document.querySelector('.tower-dock').getBoundingClientRect().toJSON(), viewport: innerWidth, viewportHeight: innerHeight, page: document.documentElement.scrollWidth, main: main.width, map: map.width,
      wave: document.querySelector('#start-wave').getBoundingClientRect().toJSON(),
      backingWidth: canvas.width, backingHeight: canvas.height,
      resources: [...document.querySelectorAll('.resource b')].map(element => parseFloat(getComputedStyle(element).fontSize)),
      cards: [...document.querySelectorAll('.tower-card')].map(card => {
        const box = card.getBoundingClientRect(), text = card.querySelector('.tower-info').getBoundingClientRect();
        return { name: card.dataset.tower, fits: text.left >= box.left - 1 && text.right <= box.right + 1 && text.top >= box.top - 1 && text.bottom <= box.bottom + 1 };
      }),
    };
  });
  assert(metrics.page <= metrics.viewport, `${label}: no horizontal overflow: ${JSON.stringify(metrics)}`);
  assert(metrics.cards.every(card => card.fits), `${label}: tower text fits: ${JSON.stringify(metrics.cards)}`);
  if (minimumMapWidth !== null) {
    assert(metrics.pageHeight <= metrics.viewportHeight + 1, `${label}: no desktop page scrolling`);
    assert(metrics.dock.top >= 0 && metrics.dock.bottom <= metrics.viewportHeight, `${label}: tower dock stays visible`);
    assert(metrics.main >= metrics.viewport * .95, `${label}: main uses at least 95% of viewport width`);
    assert(metrics.map >= minimumMapWidth, `${label}: map is ${metrics.map}px, expected at least ${minimumMapWidth}px`);
    assert(metrics.resources.every(size => size >= 18), `${label}: resource text is at least 18px`);
    assert(metrics.wave.top >= 0 && metrics.wave.bottom <= metrics.viewportHeight, `${label}: wave action stays visible within the viewport: ${JSON.stringify(metrics.wave)}`);
  }
  checks.push(`${label}: width, readable cards/resources, and no overflow`);
  return metrics;
}
async function worldPoint(page, worldX, worldY) {
  await page.locator('#battlefield canvas').scrollIntoViewIfNeeded();
  const box = await page.locator('#battlefield canvas').boundingBox();
  const geometry = await page.locator('#battlefield canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, view: window.__MOSSGUARD__.view }));
  const { view } = geometry;
  const u = (worldX - view.scrollX) * view.renderScale * view.zoom / geometry.width;
  const v = (worldY - view.scrollY) * view.renderScale * view.zoom / geometry.height;
  assert(box && u > 0 && u < 1 && v > 0 && v < 1, `World point (${worldX},${worldY}) is inside camera view: ${JSON.stringify(view)}`);
  return { x: box.x + box.width * u, y: box.y + box.height * v };
}
async function choose(page, kind) {
  const card = page.locator(`[data-tower="${kind}"]`);
  if (await card.getAttribute('aria-pressed') !== 'true') await card.click();
}
async function clickBuild(page, kind, padId) {
  const before = await state(page);
  await choose(page, kind);
  const chooserOverlapsMap = await page.evaluate(() => {
    const chooser = document.querySelector('#foundation-picker').getBoundingClientRect(), field = document.querySelector('#battlefield').getBoundingClientRect();
    return chooser.left < field.right && chooser.right > field.left && chooser.top < field.bottom && chooser.bottom > field.top;
  });
  assert.equal(chooserOverlapsMap, false, 'Build-site controls do not cover the battlefield');
  const point = await worldPoint(page, pads[padId].x, pads[padId].y);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(count => window.__MOSSGUARD__.towers.length === count, before.towers.length + 1);
  const after = await state(page);
  assert(after.towers.some(tower => tower.kind === kind && tower.padId === padId), `Pointer builds ${kind} at the intended world-space foundation`);
  assert.equal(after.gold, before.gold - ({ archer: 70, cannon: 120, frost: 90, arcane: 100 })[kind]);
}
async function zoomTo(page, target) {
  while ((await state(page)).view.zoom < target - .01) await page.locator('#zoom-in').click();
  while ((await state(page)).view.zoom > target + .01) await page.locator('#zoom-out').click();
  await page.waitForFunction(target => Math.abs(window.__MOSSGUARD__.view.zoom - target) < .01, target);
  await page.waitForFunction(target => document.querySelector('#zoom-level').textContent === `${Math.round(target * 100)}%`, target);
}
async function drag(page, dx, dy) {
  await page.locator('#battlefield canvas').scrollIntoViewIfNeeded();
  const box = await page.locator('#battlefield canvas').boundingBox();
  assert(box);
  const from = { x: box.x + box.width * .62, y: box.y + box.height * .55 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 12 });
  await page.mouse.up();
}
async function shot(page, name) { await page.screenshot({ path: path.join(screenshots, name + '.png'), fullPage: true }); }
async function fullscreenDialog(page, id) {
  await page.locator(`#${id}`).waitFor({ state: 'visible' });
  const bounds = await page.locator(`#${id} .modal`).evaluate(panel => {
    const box = panel.getBoundingClientRect(), center = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return {
      inFullscreen: Boolean(document.fullscreenElement?.contains(panel)),
      x: box.x, y: box.y, right: box.right, bottom: box.bottom,
      width: innerWidth, height: innerHeight,
      reachable: Boolean(center?.closest(`#${panel.parentElement.id}`)),
    };
  });
  assert(bounds.inFullscreen, `${id} belongs to the active native fullscreen element`);
  assert(bounds.x >= 0 && bounds.y >= 0 && bounds.right <= bounds.width + 1 && bounds.bottom <= bounds.height + 1, `${id} stays within the fullscreen viewport: ${JSON.stringify(bounds)}`);
  assert(bounds.reachable, `${id} is visible and hit-testable in native fullscreen`);
}
async function ensureFullscreen(page) {
  if (await page.evaluate(() => Boolean(document.fullscreenElement))) return;
  await page.locator('#fullscreen').click();
  await page.waitForFunction(() => document.fullscreenElement?.id === 'game-shell');
}
async function expectTouchTarget(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, `${selector} has a 44px touch target`);
}

try {
  await mkdir(screenshots, { recursive: true });
  const desktopContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const desktop = await desktopContext.newPage();
  const assets = watch(desktop, 'desktop');
  try {
    await boot(desktop);
    let metrics = await layout(desktop, '1366×768 desktop', 970);
    assert.equal(metrics.backingWidth, 1100, 'Standard-density compact desktop uses the base render backing');
    await shot(desktop, 'desktop-1366-initial');
    const baseView = (await state(desktop)).view;
    await desktop.setViewportSize({ width: 800, height: 900 });
    await desktop.waitForFunction(() => window.__MOSSGUARD__.view.visibleHeight >= 679);
    await desktop.setViewportSize({ width: 1366, height: 768 });
    await desktop.waitForFunction(top => Math.abs(window.__MOSSGUARD__.view.scrollY - top) < 1, baseView.scrollY);
    checks.push('Tablet-to-desktop resize restores the initial road framing');
    await clickBuild(desktop, 'archer', 0);
    const fontSizes = await desktop.locator('.stat-list > div').evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).fontSize)));
    assert(fontSizes.length >= 3 && fontSizes.every(size => size >= 12), 'Tower stats are at least 12px');
    assert.equal(await desktop.locator('[data-tower] .tower-art svg[data-asset]').count(), 7, 'Dock uses supplied tower frame artwork for all seven tower types');
    checks.push('1366 desktop: base pointer placement, large stats, and supplied tower artwork');

    await zoomTo(desktop, 1.5);
    await choose(desktop, 'archer');
    const beforeDrag = await state(desktop);
    await drag(desktop, -105, -12);
    const afterDrag = await state(desktop);
    assert(Math.abs(afterDrag.view.scrollX - beforeDrag.view.scrollX) > 5 || Math.abs(afterDrag.view.scrollY - beforeDrag.view.scrollY) > 5, 'Dragging a zoomed field pans its camera');
    assert.equal(afterDrag.gold, beforeDrag.gold, 'Panning while selecting a tower does not spend gold');
    assert.deepEqual(afterDrag.towers, beforeDrag.towers, 'Panning does not place a tower');
    await clickBuild(desktop, 'archer', 2);
    checks.push('150% zoom: drag pans without building, and transformed pointer placement is correct');

    await zoomTo(desktop, 2);
    await clickBuild(desktop, 'frost', 4);
    await desktop.locator('#start-wave').click();
    await desktop.waitForFunction(() => window.__MOSSGUARD__.status === 'wave' && window.__MOSSGUARD__.enemies.length > 0);
    await desktop.locator('#meteor').click();
    const beforeSpellDrag = await state(desktop);
    await drag(desktop, 70, 12);
    const afterSpellDrag = await state(desktop);
    assert(Math.abs(afterSpellDrag.view.scrollX - beforeSpellDrag.view.scrollX) > 5 || Math.abs(afterSpellDrag.view.scrollY - beforeSpellDrag.view.scrollY) > 5, 'Panning also works while a spell is armed');
    assert.equal(afterSpellDrag.meteorCooldown, 0, 'Dragging a zoomed battlefield does not cast the armed spell');
    await desktop.keyboard.press('Escape');
    checks.push('200% zoom: world-space frost placement and drag without accidental spell casting');
    await desktop.locator('#pause').click();
    await desktop.waitForFunction(() => window.__MOSSGUARD__.paused);
    const frozen = await state(desktop);
    await shot(desktop, 'desktop-1366-zoom200');

    await desktop.setViewportSize({ width: 1920, height: 1080 });
    await desktop.waitForFunction(() => document.querySelector('#battlefield canvas').width >= 2200 && window.__MOSSGUARD__.view.renderScale === 2);
    metrics = await layout(desktop, '1920×1080 desktop', 1450);
    assert.equal((await state(desktop)).gold, frozen.gold);
    assert.deepEqual((await state(desktop)).towers, frozen.towers, 'Resize to a larger render backing preserves tower state');
    await desktop.locator('#battlefield').focus();
    await desktop.keyboard.press('0');
    await desktop.waitForFunction(() => window.__MOSSGUARD__.view.zoom === 1 && Math.abs(window.__MOSSGUARD__.view.scrollX) < .01 && window.__MOSSGUARD__.view.scrollY >= 0 && window.__MOSSGUARD__.view.scrollY < 100);
    assert.equal((await state(desktop)).towers.length, 3);
    await shot(desktop, 'desktop-1920-fit');
    await desktop.setViewportSize({ width: 1366, height: 768 });
    await desktop.waitForFunction(() => document.querySelector('#battlefield canvas').width === 1100 && window.__MOSSGUARD__.view.renderScale === 1);
    assert.deepEqual((await state(desktop)).towers, frozen.towers, 'Resize back to the base backing preserves tower state');
    assert.equal((await state(desktop)).gold, frozen.gold);
    checks.push('Render backing 1×→2×→1× and reset-to-fit preserve game state');
    assert([...assets].some(url => /core-tower-upgrades[^/]*\.webp/.test(url)), 'Supplied tower atlas loads successfully');
    assert([...assets].some(url => /enemy-roster[^/]*\.webp/.test(url)), 'Supplied enemy atlas loads successfully');
    checks.push('Supplied tower/enemy atlas images load without asset errors');
  } catch (error) {
    await shot(desktop, 'desktop-failure').catch(() => {});
    throw error;
  } finally { await desktopContext.close(); }

  const retinaContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
  const retina = await retinaContext.newPage();
  watch(retina, 'DPR2');
  try {
    await boot(retina);
    const metrics = await layout(retina, 'DPR2 desktop', 970);
    assert(metrics.backingWidth >= 2200 && metrics.backingHeight > 800, 'DPR2 uses a high-resolution render backing');
    await clickBuild(retina, 'archer', 0);
    await retina.locator('#upgrade').click();
    await retina.waitForFunction(() => window.__MOSSGUARD__.towers[0].level === 2);
    assert.equal(await retina.locator('#context svg[data-asset="archer-2"]').count(), 1, 'Level II uses the supplied upgrade artwork');
    await retina.locator('#upgrade').click();
    await retina.waitForFunction(() => window.__MOSSGUARD__.towers[0].level === 3);
    assert.equal(await retina.locator('#context svg[data-asset="archer-3"]').count(), 1, 'Level III uses the supplied upgrade artwork');
    await shot(retina, 'desktop-dpr2-upgraded');
    checks.push('DPR2 pointer placement and three supplied tower tiers');

    await retina.locator('#fullscreen').click();
    await retina.waitForFunction(() => document.fullscreenElement || /Fullscreen is unavailable/.test(document.querySelector('#toast').textContent), undefined, { timeout: 5000 });
    if (await retina.evaluate(() => Boolean(document.fullscreenElement))) {
      assert.equal(await retina.evaluate(() => document.fullscreenElement?.id), 'game-shell');
      await retina.waitForFunction(() => document.querySelector('#fullscreen').getAttribute('aria-pressed') === 'true');
      assert.equal(await retina.evaluate(() => ['settings', 'guide', 'result'].every(id => document.fullscreenElement.contains(document.getElementById(id)))), true, 'Settings, guide, and result backdrops all belong to the native fullscreen shell');
      const settingsPaused = (await state(retina)).paused;
      await retina.locator('#rail-settings').click();
      await fullscreenDialog(retina, 'settings');
      assert.equal((await state(retina)).paused, true, 'Fullscreen settings pause the game');
      await retina.keyboard.press('Escape');
      assert.equal(await retina.locator('#settings').isVisible(), false, 'Escape closes fullscreen settings');
      assert.equal((await state(retina)).paused, settingsPaused, 'Closing fullscreen settings restores the prior pause state');
      // Some browsers reserve Escape to leave fullscreen. Re-enter through the
      // user-facing control before independently checking the guide there.
      await ensureFullscreen(retina);
      assert.equal(await retina.evaluate(() => document.fullscreenElement.contains(document.activeElement)), true, 'Closing settings restores focus inside the fullscreen shell');
      const guidePaused = (await state(retina)).paused;
      await retina.locator('#battlefield').focus();
      await retina.keyboard.press('?');
      await fullscreenDialog(retina, 'guide');
      assert.equal((await state(retina)).paused, true, 'Fullscreen guide pauses the game');
      await retina.locator('#guide-done').click();
      assert.equal(await retina.locator('#guide').isVisible(), false);
      assert.equal((await state(retina)).paused, guidePaused, 'Closing the fullscreen guide restores the prior pause state');
      assert.equal(await retina.evaluate(() => document.fullscreenElement.contains(document.activeElement)), true, 'Closing the guide restores focus inside fullscreen');
      checks.push('Fullscreen settings/guide are visible and reachable, restore pause/focus, and include the result backdrop');
      await retina.locator('#fullscreen').click();
      await retina.waitForFunction(() => !document.fullscreenElement);
      assert.equal((await state(retina)).towers[0].level, 3, 'Fullscreen round trip preserves game state');
      checks.push('Actual user-click fullscreen entry/exit');
    } else {
      skips.push('Fullscreen API rejected by browser policy; supported unavailable toast verified, no bypass attempted.');
    }
  } catch (error) {
    await shot(retina, 'retina-failure').catch(() => {});
    throw error;
  } finally { await retinaContext.close(); }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  watch(mobile, 'mobile');
  try {
    await boot(mobile);
    await layout(mobile, '390px touch phone');
    for (const selector of ['#zoom-in', '#zoom-out', '#fullscreen', '#pause', '#start-wave']) await expectTouchTarget(mobile, selector);
    await mobile.locator('[data-tower="arcane"]').tap();
    await expectTouchTarget(mobile, '[data-foundation="0"]');
    await mobile.locator('[data-foundation="0"]').tap();
    await mobile.waitForFunction(() => window.__MOSSGUARD__.towers[0]?.kind === 'arcane');
    assert.equal((await state(mobile)).gold, 140);
    await mobile.locator('#zoom-in').tap();
    await mobile.waitForFunction(() => window.__MOSSGUARD__.view.zoom === 1.25);
    await mobile.locator('#zoom-out').tap();
    await mobile.waitForFunction(() => window.__MOSSGUARD__.view.zoom === 1);
    await mobile.locator('#fullscreen').tap();
    await mobile.waitForFunction(() => document.fullscreenElement || /Fullscreen is unavailable/.test(document.querySelector('#toast').textContent), undefined, { timeout: 5000 });
    if (await mobile.evaluate(() => Boolean(document.fullscreenElement))) {
      await mobile.locator('#rail-settings').waitFor({ state: 'visible' });
      await expectTouchTarget(mobile, '#rail-settings');
      const mobilePaused = (await state(mobile)).paused;
      await mobile.locator('#rail-settings').tap();
      await fullscreenDialog(mobile, 'settings');
      await mobile.locator('#settings-done').tap();
      assert.equal((await state(mobile)).paused, mobilePaused, 'Mobile fullscreen settings restore pause state');
      await mobile.locator('#fullscreen').tap();
      await mobile.waitForFunction(() => !document.fullscreenElement);
      checks.push('Mobile fullscreen exposes a reachable options button and working settings dialog');
    } else {
      skips.push('Mobile fullscreen API rejected by browser policy; unavailable feedback verified.');
    }
    await mobile.evaluate(() => scrollTo(0, 0));
    await shot(mobile, 'phone-390-readable');
    checks.push('390px mobile: 44px view/build controls, touch construction, and touch zoom');
  } catch (error) {
    await shot(mobile, 'mobile-failure').catch(() => {});
    throw error;
  } finally { await mobileContext.close(); }

  assert.deepEqual(errors, [], `No browser/runtime/asset errors:\n${errors.join('\n')}`);
  console.log(`PASS: ${checks.length} view checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
  for (const skip of skips) console.log(`SKIP: ${skip}`);
  console.log(`Screenshots: ${path.relative(root, screenshots)}/`);
} finally { await browser.close(); }
