/** Campaign QA uses real menu/build/combat input and the read-only game snapshot. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.GAME_URL || 'http://127.0.0.1:4173/my-first-game/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const errors = [], checks = [], skips = [];
const kinds = ['archer', 'cannon', 'frost', 'arcane', 'mortar', 'tesla', 'venom'];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
function monitor(page, label) {
  const requests = [];
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('request', request => requests.push(request.url()));
  page.on('requestfailed', request => errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
  return requests;
}
async function boot(page, inlineHtml = null) {
  if (inlineHtml === null) await page.goto(base);
  else await page.setContent(inlineHtml, { waitUntil: 'load' });
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await page.waitForFunction(() => window.__MOSSGUARD__?.pads?.length > 0 && window.__MOSSGUARD__?.view);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('[data-tower]').count(), 7);
  assert.equal((await state(page)).levelIndex, 0, 'A new browser session starts on Eldervale');
}
async function capture(page, name) { await page.screenshot({ path: `artifacts/campaign/${name}.png`, fullPage: true }); }
async function openCampaign(page, touch = false) {
  if (touch) await page.locator('#levels-open').tap(); else await page.locator('#levels-open').click();
  await page.locator('#campaign').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#campaign [data-level]').count(), 5, 'All five maps are available from the campaign menu');
}
async function selectLevel(page, index, touch = false) {
  await openCampaign(page, touch);
  const button = page.locator(`#campaign [data-level="${index}"]`);
  assert.equal(await button.isDisabled(), false, 'Levels can be selected before combat');
  if (touch) await button.tap(); else await button.click();
  await page.locator('#campaign').waitFor({ state: 'hidden' });
  await page.waitForFunction(index => window.__MOSSGUARD__.levelIndex === index && window.__MOSSGUARD__.status === 'building' && window.__MOSSGUARD__.wave === 0, index);
  await page.waitForTimeout(80);
  return state(page);
}
async function choose(page, kind, touch = false) {
  const card = page.locator(`[data-tower="${kind}"]`);
  if (touch) await card.tap(); else await card.click();
  assert.equal(await card.getAttribute('aria-pressed'), 'true', `${kind} can be selected from the expanded tower bar`);
}
async function assertNamedSites(page) {
  const buttons = await page.locator('[data-foundation]').evaluateAll(elements => elements.map(element => ({ label: element.getAttribute('aria-label'), text: element.textContent.trim() })));
  assert(buttons.length >= 5, 'Named foundation controls are present');
  assert(buttons.every(button => button.text && !/\d/.test(button.text) && !/\d/.test(button.label || '')), `Placement controls use names without numbers: ${JSON.stringify(buttons)}`);
  assert.equal(new Set(buttons.map(button => button.text)).size, buttons.length, 'Each foundation has a distinct descriptive name');
}
async function build(page, kind, padId = 0, touch = false) {
  const before = await state(page);
  await choose(page, kind, touch);
  await assertNamedSites(page);
  const site = page.locator(`[data-foundation="${padId}"]`);
  assert.equal(await site.isDisabled(), false, `${kind} is affordable at the chosen empty site`);
  if (touch) await site.tap(); else await site.click();
  await page.waitForFunction(count => window.__MOSSGUARD__.towers.length === count, before.towers.length + 1);
  const after = await state(page);
  assert(after.towers.some(tower => tower.kind === kind && tower.padId === padId));
  assert(after.gold < before.gold, 'Construction spends gold');
  await page.waitForFunction(() => window.__MOSSGUARD__.animations.towers.length > 0);
  return after;
}
async function clickWorldPad(page, pad) {
  const canvas = page.locator('#battlefield canvas');
  const box = await canvas.boundingBox();
  const geometry = await canvas.evaluate(element => ({ width: element.width, height: element.height, view: window.__MOSSGUARD__.view }));
  const { view } = geometry;
  const u = (pad.x - view.scrollX) * view.renderScale * view.zoom / geometry.width;
  const v = (pad.y - view.scrollY) * view.renderScale * view.zoom / geometry.height;
  assert(box && u > 0 && u < 1 && v > 0 && v < 1, `Named foundation ${pad.name} is inside the fitted camera`);
  await page.mouse.click(box.x + box.width * u, box.y + box.height * v);
  await page.waitForFunction(id => window.__MOSSGUARD__.towers.some(tower => tower.padId === id && tower.kind === 'archer'), pad.id);
}
async function layout(page, label) {
  const metrics = await page.evaluate(() => ({
    width: innerWidth, scroll: document.documentElement.scrollWidth,
    cards: [...document.querySelectorAll('[data-tower]')].map(card => {
      const box = card.getBoundingClientRect(), text = card.querySelector('.tower-info').getBoundingClientRect();
      return { kind: card.dataset.tower, width: box.width, height: box.height, fits: text.left >= box.left - 1 && text.right <= box.right + 1 && text.top >= box.top - 1 && text.bottom <= box.bottom + 1 };
    }),
  }));
  assert(metrics.scroll <= metrics.width, `${label}: seven towers do not overflow the page`);
  assert(metrics.cards.every(card => card.fits), `${label}: tower names fit their cards: ${JSON.stringify(metrics.cards)}`);
  assert(metrics.cards.every(card => card.width >= 44 && card.height >= 44), `${label}: every tower card has a usable touch target`);
}

try {
  await mkdir('artifacts/campaign', { recursive: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  monitor(desktop, 'desktop');
  await boot(desktop);
  await layout(desktop, 'Desktop');
  const levels = [];
  for (let index = 0; index < 5; index++) {
    const level = await selectLevel(desktop, index);
    assert.equal(level.view.mapKey, level.mapKey, 'The Phaser renderer displays the selected map texture');
    if (level.view.visibleWidth > level.view.worldWidth + 1) {
      const expectedLeft = -(level.view.visibleWidth - level.view.worldWidth) / 2;
      assert(Math.abs(level.view.scrollX - expectedLeft) < 1, `Fitted ${level.levelName} artwork is centered inside its viewport: ${JSON.stringify(level.view)}`);
    }
    assert.equal(level.towers.length, 0); assert.equal(level.enemies.length, 0);
    assert.equal(level.lives, 20); assert.equal(level.meteorCooldown, 0);
    assert.equal(level.paused, false); assert.equal(level.speed, 1);
    assert(level.wavesTotal >= 8 && level.wavesTotal <= 12, 'Each map has a complete wave sequence');
    assert(level.path.length >= 4 && level.pads.length >= 5, 'Each map exposes a playable route and foundations');
    assert(level.pads.every(pad => typeof pad.name === 'string' && pad.name.trim() && !/\d/.test(pad.name)), 'Map foundations use descriptive names');
    assert.equal(new Set(level.pads.map(pad => pad.name)).size, level.pads.length);
    assert((await desktop.locator('h1').innerText()).includes(level.levelName), 'Mission heading follows the selected map');
    await choose(desktop, 'archer');
    await assertNamedSites(desktop);
    await desktop.keyboard.press('Escape');
    await capture(desktop, `level-${index}-initial`);
    await choose(desktop, 'archer');
    await clickWorldPad(desktop, level.pads[0]);
    levels.push(level);
    checks.push(`${level.levelName}: independent route, named sites, camera-correct pointer building, waves, and clean starting state`);
  }
  assert.equal(new Set(levels.map(level => level.levelId)).size, 5, 'All levels have distinct identities');
  assert.equal(new Set(levels.map(level => level.mapKey)).size, 5, 'All levels select distinct map artwork');
  assert.equal(new Set(levels.map(level => JSON.stringify(level.path))).size, 5, 'The maps use different playable routes');
  for (const kind of kinds) {
    await choose(desktop, kind);
    await desktop.keyboard.press('Escape');
  }
  checks.push('All seven tower blueprints remain reachable in the desktop tower bar');
  await selectLevel(desktop, 1);
  const newMapStart = await state(desktop);
  await build(desktop, 'venom');
  await selectLevel(desktop, 2);
  assert.equal((await state(desktop)).towers.length, 0, 'Switching maps clears built towers');
  await selectLevel(desktop, 1);
  assert.equal((await state(desktop)).gold, newMapStart.gold, 'Returning to a map restores its own starting economy');
  assert.equal((await state(desktop)).towers.length, 0, 'A prior match does not leak into the returned map');
  checks.push('Map switching resets match state and each map’s economy');
  const beforeFullscreen = await state(desktop);
  await desktop.locator('#fullscreen').click();
  await desktop.waitForFunction(() => document.fullscreenElement || /Fullscreen is unavailable/.test(document.querySelector('#toast').textContent), undefined, { timeout: 5000 });
  if (await desktop.evaluate(() => Boolean(document.fullscreenElement))) {
    await desktop.locator('#rail-levels').click();
    await desktop.locator('#campaign').waitFor({ state: 'visible' });
    const bounds = await desktop.locator('#campaign .modal').evaluate(panel => {
      const box = panel.getBoundingClientRect(), center = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { inside: document.fullscreenElement.contains(panel), reachable: Boolean(center?.closest('#campaign')), x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: innerWidth, height: innerHeight };
    });
    assert(bounds.inside && bounds.reachable, 'Campaign menu is inside native fullscreen and hit-testable');
    assert(bounds.x >= 0 && bounds.y >= 0 && bounds.right <= bounds.width + 1 && bounds.bottom <= bounds.height + 1, 'Fullscreen campaign menu stays within the viewport');
    assert.equal((await state(desktop)).paused, true, 'Fullscreen campaign menu pauses defense');
    await capture(desktop, 'fullscreen-campaign-menu');
    await desktop.locator('#campaign-done').click();
    assert.equal((await state(desktop)).paused, beforeFullscreen.paused, 'Closing fullscreen campaign menu restores prior pause state');
    await desktop.locator('#fullscreen').click();
    await desktop.waitForFunction(() => !document.fullscreenElement);
    const afterFullscreen = await state(desktop);
    assert.equal(afterFullscreen.levelIndex, beforeFullscreen.levelIndex);
    assert.equal(afterFullscreen.gold, beforeFullscreen.gold);
    assert.deepEqual(afterFullscreen.towers, beforeFullscreen.towers, 'Fullscreen campaign entry/exit preserves the match');
    checks.push('Native fullscreen campaign menu remains reachable and restores pause and match state');
  } else skips.push('Fullscreen API rejected by browser policy; supported unavailable feedback verified.');
  await desktop.close();

  for (const seed of [
    { expected: 7, progress: null, label: 'Legacy personal best migrates into Eldervale campaign progress' },
    { expected: 5, progress: { eldervale: { best: 5, completed: false } }, label: 'Existing campaign progress takes precedence over the legacy personal best' },
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    monitor(page, 'save-compatibility');
    try {
      await page.addInitScript(({ progress }) => {
        if (sessionStorage.getItem('mossguard-qa-seeded')) return;
        sessionStorage.setItem('mossguard-qa-seeded', 'true');
        localStorage.setItem('mossguard-best', '7');
        if (progress) localStorage.setItem('mossguard-campaign', JSON.stringify(progress));
        else localStorage.removeItem('mossguard-campaign');
      }, seed);
      await boot(page);
      assert.match(await page.locator('#record').innerText(), new RegExp(`best ${seed.expected} / 12`));
      if (seed.progress) {
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mossguard-campaign')));
        assert.equal(saved.eldervale.best, seed.expected);
        assert.equal(saved.eldervale.completed, false);
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('mossguard-best')), '7', 'Compatibility loading keeps the original score intact');
      await page.reload();
      await page.waitForSelector('#battlefield[data-ready="true"]');
      assert.match(await page.locator('#record').innerText(), new RegExp(`best ${seed.expected} / 12`), 'The selected score survives a real reload');
      checks.push(seed.label);
    } finally { await page.close(); }
  }

  for (const kind of ['mortar', 'tesla', 'venom']) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    monitor(page, kind);
    try {
      await boot(page);
      await build(page, kind);
      assert.equal(await page.locator(`#context svg[data-asset="${kind}-1"]`).count(), 1, 'Specialist inspection uses its supplied artwork');
      await page.locator('#start-wave').click();
      await page.waitForFunction(() => window.__MOSSGUARD__.animations.towers.some(tower => tower.fireSequence > 0), undefined, { timeout: 20000 });
      await page.waitForFunction(() => window.__MOSSGUARD__.kills > 0, undefined, { timeout: 25000 });
      if (kind === 'venom') await page.waitForFunction(() => window.__MOSSGUARD__.enemies.some(enemy => enemy.poisonUntil > window.__MOSSGUARD__.time && enemy.poisonDps > 0), undefined, { timeout: 20000 });
      await capture(page, `${kind}-combat`);
      checks.push(`${kind}: supplied artwork, live firing animation, damage, and kill rewards${kind === 'venom' ? ', with poison status' : ''}`);
      if (kind === 'tesla') {
        const before = await state(page);
        await openCampaign(page);
        assert.equal((await state(page)).paused, true, 'Campaign menu pauses active combat');
        assert.equal(await page.locator('#campaign [data-level]:disabled').count(), 5, 'Every map switch is disabled during an active wave');
        assert.equal((await state(page)).levelIndex, before.levelIndex);
        await page.keyboard.press('Escape');
        await page.locator('#campaign').waitFor({ state: 'hidden' });
        assert.equal((await state(page)).paused, false, 'Closing the campaign menu resumes previously active combat');
        await page.locator('#pause').click();
        await openCampaign(page);
        await page.keyboard.press('Escape');
        assert.equal((await state(page)).paused, true, 'Closing the campaign menu preserves an existing pause');
        checks.push('Active-wave map changes are blocked and campaign menu restores pause state');
      }
    } finally { await page.close(); }
  }

  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await touchContext.newPage();
  monitor(mobile, 'mobile');
  try {
    await boot(mobile);
    await layout(mobile, '390px mobile');
    await selectLevel(mobile, 3, true);
    await build(mobile, 'tesla', 0, true);
    await mobile.setViewportSize({ width: 844, height: 390 });
    await layout(mobile, 'Rotated mobile');
    assert.equal((await state(mobile)).levelIndex, 3);
    assert.equal((await state(mobile)).towers[0].kind, 'tesla');
    await mobile.evaluate(() => scrollTo(0, 0));
    await capture(mobile, 'mobile-level-rotation');
    checks.push('Mobile campaign selection, specialist touch construction, seven-card layout, and rotation preserve state');
  } finally { await touchContext.close(); }

  const offline = await browser.newContext({ viewport: { width: 1280, height: 900 }, offline: true });
  await offline.route(/^https?:\/\//, route => route.abort());
  const standalone = await offline.newPage();
  const requests = monitor(standalone, 'standalone');
  try {
    const html = await readFile('samples/mossguard.html', 'utf8');
    await boot(standalone, html);
    for (const index of [1, 2, 3, 4]) await selectLevel(standalone, index);
    await build(standalone, 'venom');
    await capture(standalone, 'standalone-final-map');
    assert.deepEqual(requests.filter(url => /^https?:|^file:/.test(url)), [], 'New maps and specialist artwork need no external files or network');
    checks.push('Standalone HTML embeds every new map and specialist artwork for offline selection and construction');
  } finally { await offline.close(); }
  assert.deepEqual(errors, [], `No campaign runtime or asset errors:\n${errors.join('\n')}`);
  console.log(`PASS: ${checks.length} campaign checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
  for (const skip of skips) console.log(`SKIP: ${skip}`);
  console.log('Screenshots: artifacts/campaign/');
} catch (error) {
  for (const [index, context] of browser.contexts().entries()) for (const page of context.pages()) await capture(page, `failure-${index}`).catch(() => {});
  throw error;
} finally { await browser.close(); }
