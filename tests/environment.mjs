import { enterBattle, openGameSettings, openGameCampaign } from './play-helpers.mjs';
/** Map proportions, real camera input, and interpolated scenery through read-only diagnostics. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.GAME_URL || 'http://127.0.0.1:4173/my-first-game/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const checks = [], errors = [];
const maps = [
  { key: 'eldervale', width: 1595, height: 986, worldHeight: 680, pictures: 6 },
  { key: 'frostbound', width: 757, height: 324, worldHeight: 1100 * 324 / 757, pictures: 5 },
  { key: 'ember', width: 759, height: 320, worldHeight: 1100 * 320 / 759, pictures: 5 },
  { key: 'mirewood', width: 760, height: 324, worldHeight: 1100 * 324 / 760, pictures: 4 },
  { key: 'crystal', width: 757, height: 344, worldHeight: 1100 * 344 / 757, pictures: 4 },
];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
const env = page => page.evaluate(() => window.__MOSSGUARD__.animations.environment);
function monitor(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText} ${request.url()}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
}
async function chooseMap(page, index) {
  await openGameCampaign(page);
  await page.locator('#campaign').waitFor({ state: 'visible' });
  const card = page.locator(`[data-stage="${maps[index].key}"]`);
  const stageIndex = Number(await card.getAttribute('data-level'));
  const thumb = card.locator('.level-thumb');
  const aspect = await thumb.evaluate(element => { const box = element.getBoundingClientRect(); return box.width / box.height; });
  const expected = 1100 / maps[index].worldHeight;
  assert(Math.abs(aspect / expected - 1) < .015, `${maps[index].key}: campaign preview preserves the whole map ratio`);
  await card.click();
  await page.waitForFunction(index => window.__MOSSGUARD__.levelIndex === index && window.__MOSSGUARD__.animations?.environment?.levelId === window.__MOSSGUARD__.mapKey, stageIndex);
  return state(page);
}
function assertCamera(snapshot, map) {
  const v = snapshot.view;
  assert.equal(v.mapKey, map.key);
  assert(Math.abs(v.worldHeight - map.worldHeight) < .001, `${map.key}: logical height follows the original panel ratio`);
  assert(Math.abs((v.sourceWidth / v.sourceHeight) / (v.worldWidth / v.worldHeight) - 1) < .015, `${map.key}: artwork is not stretched`);
  if (map.key !== 'eldervale') assert(v.sourceWidth >= 1800, `${map.key}: loads the restored high-resolution map, not the 760px concept crop`);
  assert.equal(v.zoom, 1);
  assert(v.scrollX <= .1 && v.scrollY <= .1 && v.scrollX + v.visibleWidth >= v.worldWidth - .1 && v.scrollY + v.visibleHeight >= v.worldHeight - .1,
    `${map.key}: the complete map fits at 100%: ${JSON.stringify(v)}`);
  assert.equal(v.canPan, false, `${map.key}: fit view needs no pan to reach the map edges`);
}
async function pointerBuild(page, pad) {
  await page.locator('[data-tower="archer"]').click();
  // Collapse the optional named-site picker so even foundations underneath its
  // overlay remain available to direct canvas placement.
  await page.locator('#close-inspection').click();
  assert.equal(await page.locator('[data-tower="archer"]').getAttribute('aria-pressed'), 'true', 'Collapsing placement controls keeps the tower blueprint armed');
  assert.equal(await page.locator('#foundation-picker').isVisible(), false, 'Collapsed placement controls expose the battlefield');
  const point = await page.locator('#battlefield canvas').evaluate((canvas, pad) => {
    const view = window.__MOSSGUARD__.view, box = canvas.getBoundingClientRect();
    return { x: box.x + (pad.x - view.scrollX) * view.renderScale * view.zoom / canvas.width * box.width,
      y: box.y + (pad.y - view.scrollY) * view.renderScale * view.zoom / canvas.height * box.height };
  }, pad);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(id => window.__MOSSGUARD__.towers.some(tower => tower.padId === id), pad.id);
  assert.equal((await state(page)).towers.find(tower => tower.padId === pad.id).kind, 'archer');
}
async function canvasFingerprint(page) {
  return page.locator('#battlefield canvas').evaluate(canvas => {
    const pixels = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let i = 0; i < pixels.length; i += 4) hash = Math.imul(hash ^ pixels[i] ^ pixels[i + 1] ^ pixels[i + 2], 16777619) >>> 0;
    return hash;
  });
}

try {
  await mkdir('artifacts/environment', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  monitor(page);
  await page.goto(base);
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await enterBattle(page);
  await page.waitForFunction(() => window.__MOSSGUARD__?.animations?.environment?.items?.length > 0);
  await page.evaluate(() => document.fonts.ready);
  const counts = new Map();
  for (let index = 0; index < maps.length; index++) {
    const map = maps[index], initial = await chooseMap(page, index);
    assertCamera(initial, map);
    const viewBox = await page.locator('.minimap svg').getAttribute('viewBox');
    assert.equal(viewBox, `0 0 1100 ${map.worldHeight}`, `${map.key}: minimap route and image share the same aspect ratio`);
    assert(initial.pads.every(pad => pad.x >= 0 && pad.x <= 1100 && pad.y >= 0 && pad.y <= map.worldHeight), `${map.key}: all tower sites stay on the restored artwork`);
    const a = await env(page);
    assert.equal(a.fps, 24); assert.equal(a.loopSeconds, 12);
    assert.equal(a.imageCount, map.pictures); assert.equal(a.textureCount, map.pictures);
    assert(a.items.some(item => item.shape === 'texture') && a.items.some(item => item.shape !== 'texture'), `${map.key}: local map texture and scenery primitives both animate`);
    assert(a.items.length > 20 && a.items.length < 100, `${map.key}: scenery has a fixed bounded object count`);
    counts.set(map.key, { images: a.imageCount, textures: a.textureCount, items: a.items.length });
    const pictureA = await canvasFingerprint(page);
    await page.waitForTimeout(170);
    const b = await env(page), pictureB = await canvasFingerprint(page);
    assert.notEqual(b.frame, a.frame, `${map.key}: authored scenery frames advance`);
    assert(b.blend > 0 && b.blend < 1, `${map.key}: rendered pose interpolates between authored frames`);
    assert(a.items.some((item, i) => Math.abs(item.x - b.items[i].x) > .01 || Math.abs(item.y - b.items[i].y) > .01), `${map.key}: actual scenery moves`);
    assert.notEqual(pictureB, pictureA, `${map.key}: motion changes actual canvas pixels`);
    await page.screenshot({ path: `artifacts/environment/${map.key}-fit.png` });
    await pointerBuild(page, initial.pads[0]);
    await pointerBuild(page, initial.pads.at(-1));
    checks.push(`${map.key}: native ratio, full fit, high-resolution art, aligned minimap, interpolated scenery, and pointer placement at both ends`);
  }
  for (let index = 0; index < maps.length; index++) {
    await chooseMap(page, index);
    const current = await env(page), expected = counts.get(maps[index].key);
    assert.deepEqual({ images: current.imageCount, textures: current.textureCount, items: current.items.length }, expected,
      `${maps[index].key}: returning to a map does not leak scenery objects or temporary textures`);
    assert(current.phase < .05, `${maps[index].key}: a fresh map starts its scenery clock from the beginning`);
  }
  checks.push('Repeated map changes reset scenery clocks and retain fixed image/texture counts');

  await page.locator('#pause').click();
  await page.waitForFunction(() => window.__MOSSGUARD__.paused);
  const frozen = await env(page), frozenPixels = await canvasFingerprint(page);
  await page.waitForTimeout(240);
  assert.deepEqual(await env(page), frozen, 'Pause freezes every sampled and interpolated scenery property exactly');
  assert.equal(await canvasFingerprint(page), frozenPixels, 'Paused scenery leaves canvas pixels unchanged');
  await page.locator('#resume').click();
  await page.waitForFunction(frame => window.__MOSSGUARD__.animations.environment.frame !== frame, frozen.frame);
  checks.push('Pause and resume freeze and restore the actual scenery render');

  for (const speed of [2, 3]) {
    await page.locator('#speed').click();
    await page.waitForTimeout(130);
    const snapshot = await state(page);
    assert.equal(snapshot.speed, speed);
    const expected = ((snapshot.animations.presentationTime % 12) + 12) % 12;
    assert(Math.abs(snapshot.animations.environment.phase * 12 - expected) < .00001, 'Scenery follows wall presentation time at accelerated combat speeds');
  }
  checks.push('2× and 3× combat preserve the independent real-time scenery loop');

  await openGameSettings(page);
  await page.locator('#motion-setting').check();
  await page.locator('#settings-done').click();
  await page.waitForFunction(() => window.__MOSSGUARD__.animations.environment.reduced);
  const reduced = await env(page);
  assert.equal(reduced.frame, 0); assert.equal(reduced.blend, 0); assert.equal(reduced.phase, 0);
  assert(reduced.items.every(item => item.alpha === 0), 'Reduced motion suppresses decorative scenery');
  await page.waitForTimeout(180);
  assert.deepEqual(await env(page), reduced);
  await page.screenshot({ path: 'artifacts/environment/reduced-motion.png' });
  checks.push('Reduced motion suppresses decorative scenery and holds a stable pose');
  await page.close();

  if (process.env.SKIP_STANDALONE === '1') console.log('SKIP standalone scenery checks: final HTML export is pending.');
  else {
  const offlineContext = await browser.newContext({ offline: true, viewport: { width: 1366, height: 768 } });
  const offline = await offlineContext.newPage(), offlineRequests = [];
  monitor(offline);
  offline.on('request', request => { if (/^https?:/.test(request.url())) offlineRequests.push(request.url()); });
  await offlineContext.route(/^https?:/, route => route.abort());
  await offline.setContent(await readFile('samples/mossguard.html', 'utf8'), { waitUntil: 'load' });
  await offline.waitForFunction(() => window.__MOSSGUARD__?.animations?.environment?.items?.length > 0);
  await enterBattle(offline);
  const offlineMap = await chooseMap(offline, 2);
  assertCamera(offlineMap, maps[2]);
  const offlinePixels = await canvasFingerprint(offline);
  await offline.waitForTimeout(170);
  assert.notEqual(await canvasFingerprint(offline), offlinePixels, 'The embedded map and scenery animate without HTTP');
  assert.deepEqual(offlineRequests, [], 'The standalone HTML needs no network requests for restored art or scenery');
  await offline.screenshot({ path: 'artifacts/environment/offline-ember.png' });
  await offlineContext.close();
  checks.push('Standalone HTML embeds the restored map and animated scenery for offline play');
  }
  assert.deepEqual(errors, [], `No scenery or map errors: ${errors.join('\n')}`);
  console.log(`PASS: ${checks.length} environment checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
} finally { await browser.close(); }
