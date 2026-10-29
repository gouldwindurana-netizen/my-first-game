import { enterBattle, openGameSettings, openGameGuide, openGameCampaign } from './play-helpers.mjs';
/** Real walking-art QA: atlas pixels, shared preview, and live unit texture frames. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.GAME_URL || 'http://127.0.0.1:4173/my-first-game/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const kinds = ['grunt', 'runner', 'brute', 'boss'];
const checks = [], errors = [];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
function watch(page, label) {
  const requests = [];
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
  page.on('request', r => requests.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${label}: HTTP ${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => errors.push(`${label}: ${r.failure()?.errorText} ${r.url()}`));
  return requests;
}
async function boot(page, inline = null) {
  if (inline === null) await page.goto(base); else await page.setContent(inline, { waitUntil: 'load' });
  await page.waitForSelector('#battlefield[data-ready="true"]');
  await enterBattle(page);
  await page.waitForFunction(() => window.__MOSSGUARD__?.view && window.__MOSSGUARD__?.animations);
  await page.evaluate(() => document.fonts.ready);
  assert.equal((await state(page)).animations.fps, 24, 'The walking presentation rate is 24 fps');
}
async function openPreview(page, mobile = false) {
  if (mobile) await openGameGuide(page); else await openGameGuide(page);
  await page.locator('#units-open').click();
  await page.locator('#unit-preview').waitFor({ state: 'visible' });
  assert.equal(await page.locator('canvas[data-walk-kind]').count(), 4, 'Each shared walking-art family has a preview');
  await page.waitForFunction(() => [...document.querySelectorAll('canvas[data-walk-kind]')].every(canvas => Number.isInteger(Number(canvas.dataset.frame))));
}
async function previewFrames(page) {
  return page.locator('canvas[data-walk-kind]').evaluateAll(canvases => Object.fromEntries(canvases.map(canvas => [canvas.dataset.walkKind, Number(canvas.dataset.frame)])));
}
async function samplePreview(page, milliseconds = 1500) {
  const frames = Object.fromEntries(kinds.map(kind => [kind, new Set()]));
  const transitionsByKind = Object.fromEntries(kinds.map(kind => [kind, 0]));
  let previous = null;
  const started = Date.now(), end = started + milliseconds;
  while (Date.now() < end) {
    const current = await previewFrames(page);
    for (const kind of kinds) frames[kind].add(current[kind]);
    if (previous !== null) for (const kind of kinds) if (current[kind] !== previous[kind]) transitionsByKind[kind]++;
    previous = current;
    await page.waitForTimeout(35);
  }
  return { frames, transitions: transitionsByKind.grunt, transitionsByKind, elapsed: Date.now() - started };
}
async function atlasMetrics(canvas) {
  return canvas.evaluate(async element => {
    const source = element.dataset.src, width = Number(element.dataset.frameWidth), height = Number(element.dataset.frameHeight), count = Number(element.dataset.frameCount);
    if (!source || !(width > 0 && height > 0 && count > 1)) throw new Error('Walking preview must expose the exact source atlas and fixed-cell metadata');
    const image = new Image(); image.src = source; await image.decode();
    const surface = document.createElement('canvas'); surface.width = width; surface.height = height;
    const context = surface.getContext('2d', { willReadFrequently: true });
    const frames = [], hashes = [], opaque = [], lower = [], bounds = [];
    for (let frame = 0; frame < count; frame++) {
      context.clearRect(0, 0, width, height); context.drawImage(image, frame * width, 0, width, height, 0, 0, width, height);
      const data = context.getImageData(0, 0, width, height).data;
      let hash = 2166136261, pixels = 0, minX = width, minY = height, maxX = -1, maxY = -1;
      const mask = new Uint8Array(width * height);
      for (let p = 0; p < data.length; p++) hash = Math.imul(hash ^ data[p], 16777619) >>> 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] >= 80) {
        pixels++; mask[y * width + x] = 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      hashes.push(hash); opaque.push(pixels); bounds.push({ minX, minY, maxX, maxY }); frames.push(mask);
    }
    // A translated copy of one drawing can be perfectly registered. Articulated limb
    // silhouettes retain a residual after the best small whole-body translation.
    for (let frame = 3; frame < count; frame += 3) {
      let best = Infinity;
      for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) {
        let difference = 0, union = 0;
        for (let y = Math.floor(height * .55); y < height - 10; y++) for (let x = 10; x < width - 10; x++) {
          const otherX = x + dx, otherY = y + dy;
          if (otherX < 0 || otherX >= width || otherY < 0 || otherY >= height) continue;
          const a = frames[0][y * width + x], b = frames[frame][otherY * width + otherX];
          difference += a !== b ? 1 : 0; union += a || b ? 1 : 0;
        }
        if (union) best = Math.min(best, difference / union);
      }
      lower.push(best);
    }
    return { source, width, height, count, fps: Number(element.dataset.fps), imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, unique: new Set(hashes).size, opaque, bounds, lower };
  });
}
async function interpolationMetrics(canvas, sourceBytes) {
  return canvas.evaluate(async (element, referenceSource) => {
    const atlas = new Image(), reference = new Image();
    atlas.src = element.dataset.src; reference.src = referenceSource;
    await Promise.all([atlas.decode(), reference.decode()]);
    const width = Number(element.dataset.frameWidth), height = Number(element.dataset.frameHeight);
    const surface = document.createElement('canvas'); surface.width = width; surface.height = height;
    const context = surface.getContext('2d', { willReadFrequently: true });
    const read = (image, frame) => {
      context.clearRect(0, 0, width, height);
      context.drawImage(image, frame * width, 0, width, height, 0, 0, width, height);
      return context.getImageData(0, 0, width, height).data;
    };
    const keyframes = [], warpedFractions = [];
    for (let key = 0; key < 8; key++) {
      const old = read(reference, key), a = read(atlas, key * 3), b = read(atlas, ((key + 1) % 8) * 3), between = read(atlas, key * 3 + 1);
      let changed = 0, nonLinear = 0, visible = 0;
      for (let pixel = 0; pixel < a.length; pixel += 4) {
        if (old[pixel + 3] !== a[pixel + 3] || old[pixel + 3] > 0 && [0, 1, 2].some(channel => old[pixel + channel] !== a[pixel + channel])) changed++;
        const aa = a[pixel + 3] / 255, ba = b[pixel + 3] / 255, mixedAlpha = aa * 2 / 3 + ba / 3;
        if (mixedAlpha < .1 && between[pixel + 3] < 25) continue;
        visible++;
        let differs = Math.abs(between[pixel + 3] - mixedAlpha * 255) > 3;
        for (let channel = 0; channel < 3 && !differs; channel++) {
          const crossfade = mixedAlpha > 0 ? (a[pixel + channel] * aa * 2 / 3 + b[pixel + channel] * ba / 3) / mixedAlpha : 0;
          differs = Math.abs(between[pixel + channel] - crossfade) > 8;
        }
        if (differs) nonLinear++;
      }
      keyframes.push(changed); warpedFractions.push(visible ? nonLinear / visible : 0);
    }
    return { keyframes, warpedFractions };
  }, `data:image/webp;base64,${sourceBytes.toString('base64')}`);
}
async function namedBuild(page, kind, site) {
  await page.locator(`[data-tower="${kind}"]`).click();
  await page.locator(`[data-foundation="${site}"]`).click();
  await page.waitForFunction(() => window.__MOSSGUARD__.towers.length > 0);
}

try {
  await mkdir('artifacts/walking', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page, 'desktop'); await boot(page); await openPreview(page);
  for (const kind of kinds) {
    const metrics = await atlasMetrics(page.locator(`canvas[data-walk-kind="${kind}"]`));
    assert.equal(metrics.fps, 24, `${kind} declares the 24-fps presentation rate`);
    assert.equal(metrics.count, 24, `${kind} has a complete interpolated 24-frame cycle`);
    assert.equal(metrics.imageWidth, metrics.width * metrics.count, `${kind} has fixed-width horizontal cells`);
    assert.equal(metrics.imageHeight, metrics.height, `${kind} has consistent cell height`);
    assert.equal(metrics.unique, 24, `${kind} has 24 distinct rendered poses`);
    assert(metrics.opaque.every(count => count > metrics.width * metrics.height * .04 && count < metrics.width * metrics.height * .85), `${kind} is visible on a transparent canvas`);
    assert(metrics.bounds.every(box => box.minX >= 0 && box.minY >= 0 && box.maxX < metrics.width && box.maxY < metrics.height), `${kind} fits every shared anchor cell`);
    assert(metrics.lower.filter(residual => residual > .025).length >= 3, `${kind} lower-body silhouettes change beyond rigid translation: ${JSON.stringify(metrics.lower)}`);
    const interpolation = await interpolationMetrics(page.locator(`canvas[data-walk-kind="${kind}"]`), await readFile(`src/assets/pack/walk-${kind}.webp`));
    assert(interpolation.keyframes.every(changed => changed === 0), `${kind} preserves all eight generated key poses exactly`);
    assert(interpolation.warpedFractions.filter(fraction => fraction > .02).length >= 4, `${kind} interpolates moving pixels rather than only crossfading: ${JSON.stringify(interpolation.warpedFractions)}`);
    checks.push(`${kind}: 24 transparent poses preserve keyframes and include motion-warped in-betweens`);
  }
  const gameTime = (await state(page)).time;
  const active = await samplePreview(page, 1800);
  assert(kinds.every(kind => active.frames[kind].size >= 12), `All four previews cycle through distinct artwork: ${JSON.stringify(Object.fromEntries(kinds.map(kind => [kind, [...active.frames[kind]]])))}`);
  assert.equal((await state(page)).time, gameTime, 'Preview locomotion runs while the inspected match remains paused');
  await page.screenshot({ path: 'artifacts/walking/gallery-a.png' }); await page.waitForTimeout(100); await page.screenshot({ path: 'artifacts/walking/gallery-b.png' });
  checks.push('All four shared-atlas previews visibly step while gameplay stays paused');
  await page.locator('#preview-play').click();
  assert.equal(await page.locator('#preview-play').getAttribute('aria-pressed'), 'true');
  const frozenPreview = await previewFrames(page); await page.waitForTimeout(250);
  assert.deepEqual(await previewFrames(page), frozenPreview, 'The preview pause control freezes actual selected frames');
  await page.locator('#preview-play').click();
  const normal = await samplePreview(page, 1600);
  assert(kinds.every(kind => normal.transitionsByKind[kind] <= Math.ceil(normal.elapsed / 1000 * 24) + 3), `Pose presentation stays within 24 fps: ${JSON.stringify(normal.transitionsByKind)}`);
  await page.locator('#preview-slow').click();
  assert.equal(await page.locator('#preview-slow').getAttribute('aria-pressed'), 'true');
  const slowed = await samplePreview(page, 1600);
  assert(slowed.transitions > 0 && slowed.transitions < normal.transitions, `Slowing reduces footstep cadence (${normal.transitions} → ${slowed.transitions})`);
  checks.push('Preview pause and slow controls change frame cadence without distorting the character');
  await page.locator('#unit-preview-close').click();
  await page.locator('#guide-done').click();

  // Windward's Hard opening includes goblins and visible runners. Both families
  // exercise the atlases without requiring a hidden enemy in an opening wave.
  await openGameCampaign(page); await page.locator('#difficulty-select').selectOption('hard'); await page.locator('[data-stage="windward"]').click();
  await namedBuild(page, 'frost', 1); await page.locator('#start-wave').click();
  await page.waitForFunction(() => window.__MOSSGUARD__.animations.enemies.some(enemy => enemy.kind === 'grunt'));
  const first = (await state(page)).animations.enemies.find(enemy => enemy.kind === 'grunt');
  await page.waitForFunction(id => { const enemy = window.__MOSSGUARD__.animations.enemies.find(enemy => enemy.id === id); return enemy && enemy.walkFrame !== 0; }, first.id);
  const before = (await state(page)).animations.enemies.find(enemy => enemy.id === first.id);
  await page.waitForTimeout(180);
  const after = (await state(page)).animations.enemies.find(enemy => enemy.id === first.id);
  assert(after && after.walkFrame !== before.walkFrame && after.frameName !== before.frameName, 'A live grunt changes its actual Phaser texture frame');
  assert.equal(after.textureKey, 'walk24-grunt'); assert.equal(after.rotation, 0);
  assert.equal(after.scaleX, before.scaleX); assert.equal(after.scaleY, before.scaleY);
  await page.locator('#speed').click();
  await page.waitForFunction(() => window.__MOSSGUARD__.animations.enemies.some(enemy => ['runner', 'scout'].includes(enemy.kind)), undefined, { timeout: 15000 });
  const runner = (await state(page)).animations.enemies.find(enemy => ['runner', 'scout'].includes(enemy.kind));
  assert.equal(runner.textureKey, 'walk24-runner'); assert.equal(runner.rotation, 0);
  await page.waitForFunction(id => { const enemy = window.__MOSSGUARD__.animations.enemies.find(enemy => enemy.id === id); return enemy && enemy.walkFrame !== 0; }, runner.id);
  await page.waitForFunction(() => window.__MOSSGUARD__.animations.enemies.some(enemy => enemy.state === 'slowed'), undefined, { timeout: 20000 });
  const cap = await page.evaluate(async () => {
    const started = performance.now(), initial = window.__MOSSGUARD__, ticks = new Set();
    await new Promise(resolve => { const sample = () => { ticks.add(window.__MOSSGUARD__.animations.poseTick); if (performance.now() - started >= 800) resolve(); else requestAnimationFrame(sample); }; sample(); });
    const final = window.__MOSSGUARD__;
    return { elapsed: performance.now() - started, ticks: ticks.size, game: final.time - initial.time, presentation: final.animations.presentationTime - initial.animations.presentationTime };
  });
  assert(cap.ticks <= Math.ceil(cap.elapsed / 1000 * 24) + 3, 'Doubling game speed does not double pose presentation FPS');
  assert(Math.abs(cap.game - cap.presentation * 2) < .04, `Simulation advances at 2× while presentation uses its own 24-fps clock: ${JSON.stringify(cap)}`);
  checks.push('Live goblins and runners use shared interpolated frames at 24 fps with fixed transforms; frost slowing and 2× remain correct');
  await page.screenshot({ path: 'artifacts/walking/live-a.png' }); await page.waitForTimeout(120); await page.screenshot({ path: 'artifacts/walking/live-b.png' });
  await page.locator('#pause').click(); await page.waitForFunction(() => window.__MOSSGUARD__.paused);
  const frozen = (await state(page)).animations; await page.waitForTimeout(250);
  assert.deepEqual((await state(page)).animations, frozen, 'Combat pause freezes every walk frame and effect');
  await page.locator('#resume').click();
  await openGameSettings(page); await page.locator('#motion-setting').check(); await page.locator('#settings-done').click();
  await page.waitForFunction(() => window.__MOSSGUARD__.animations.reduced);
  assert((await state(page)).animations.enemies.every(enemy => enemy.walkFrame === 0 && enemy.rotation === 0), 'Reduced motion holds a neutral pose during combat');
  checks.push('Combat pause and reduced motion freeze the new unit poses correctly');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  watch(mobile, 'mobile'); await boot(mobile); await openPreview(mobile, true);
  const mobileBounds = await mobile.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, controls: ['preview-play', 'preview-slow', 'unit-preview-close'].map(id => document.getElementById(id).getBoundingClientRect().toJSON()) }));
  assert(mobileBounds.scroll <= mobileBounds.width, 'The walking gallery does not overflow a phone');
  assert(mobileBounds.controls.every(box => box.width >= 44 && box.height >= 44), 'Walking gallery controls have 44px touch targets');
  await mobile.screenshot({ path: 'artifacts/walking/mobile-gallery.png', fullPage: true });
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.waitForFunction(() => [...document.querySelectorAll('canvas[data-walk-kind]')].every(canvas => Number(canvas.dataset.frame) === 0));
  const reducedFrames = await previewFrames(mobile); await mobile.waitForTimeout(200); assert.deepEqual(await previewFrames(mobile), reducedFrames);
  checks.push('Phone gallery fits, touch controls remain usable, and OS reduced motion holds neutral frames');
  await mobile.close();

  if (process.env.SKIP_STANDALONE === '1') console.log('SKIP standalone walking checks: final HTML export is pending.');
  else {
  const offlineContext = await browser.newContext({ offline: true, viewport: { width: 1366, height: 768 } });
  const offline = await offlineContext.newPage(), requests = watch(offline, 'offline');
  await offlineContext.route(/^https?:/, route => route.abort());
  await boot(offline, await readFile('samples/mossguard.html', 'utf8')); await openPreview(offline);
  assert((await offline.locator('canvas[data-walk-kind]').evaluateAll(elements => elements.map(element => element.dataset.src))).every(source => source.startsWith('data:')), 'The standalone file embeds all four walking atlases');
  const offlineFrames = await samplePreview(offline, 900);
  assert(kinds.every(kind => offlineFrames.frames[kind].size >= 3), 'All four embedded cycles play offline');
  assert.equal(requests.filter(url => /^https?:/.test(url)).length, 0, 'Walking adds no offline network requests');
  await offline.screenshot({ path: 'artifacts/walking/offline-gallery.png' });
  checks.push('Standalone HTML embeds and plays every walking cycle without network requests');
  await offlineContext.close();
  }
  assert.deepEqual(errors, [], `No walking-gallery or combat runtime errors: ${errors.join('\n')}`);
  console.log(`PASS: ${checks.length} walking checks\n${checks.map(check => `  ✓ ${check}`).join('\n')}`);
} catch (error) {
  const activePage = browser.contexts().flatMap(context => context.pages()).at(-1);
  if (activePage) await activePage.screenshot({ path: 'artifacts/walking/failure.png', fullPage: true }).catch(() => {});
  throw error;
}
finally { await browser.close(); }
