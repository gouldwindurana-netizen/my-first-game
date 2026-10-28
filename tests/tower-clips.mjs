/** Exercise all supplied tower clips through real construction and combat input. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { enterBattle, closeTowerDetails, clickWorld } from './play-helpers.mjs';

const base = process.env.GAME_URL || 'http://127.0.0.1:4173/my-first-game/';
const families = ['archer','cannon','mortar','frost','earth','arcane','tesla','venom','prism','trap','sonic','barracks','void','solar','chrono','truesight','nexus'];
const premium = ['void','solar','chrono','truesight','nexus'];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const errors = [], loadedClips = new Set(), evidence = [];
const state = page => page.evaluate(() => window.__MOSSGUARD__);
let nextFamily = 0;

function watch(page, family) {
  page.on('pageerror', error => errors.push(`${family}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${family}: ${message.text()}`); });
  page.on('requestfailed', request => errors.push(`${family}: ${request.failure()?.errorText} ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${family}: HTTP ${response.status()} ${response.url()}`);
    const filename = new URL(response.url()).pathname.split('/').at(-1);
    const match = filename?.match(/^([a-z]+)_(idle|attack)(?:-[^.]+)?\.(?:png|webp)$/);
    if (response.ok() && match && families.includes(match[1])) loadedClips.add(`${match[1]}-${match[2]}`);
  });
}

/** Read the actual Phaser image's selected texture/frame across rendered poses. */
async function sampleClip(page, id, clip, duration = 230) {
  return page.evaluate(({ id, clip, duration }) => new Promise(resolve => {
    const samples = [], began = performance.now();
    const sample = () => {
      const tower = window.__MOSSGUARD__.animations.towers.find(tower => tower.id === id);
      if (tower?.animation === clip) samples.push({ animation: tower.animation, frame: tower.animationFrame,
        texture: tower.textureKey, name: tower.frameName, x: tower.x, y: tower.y, rotation: tower.rotation,
        width: tower.displayWidth, height: tower.displayHeight, fireSequence: tower.fireSequence });
      if (performance.now() - began >= duration) resolve(samples);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }), { id, clip, duration });
}

function assertClip(samples, family, clip) {
  assert(samples.length >= 2, `${family}: actual ${clip} poses were rendered`);
  assert(new Set(samples.map(sample => sample.name)).size > 1, `${family}: ${clip} advances through distinct supplied frames`);
  for (const sample of samples) {
    assert(Number.isInteger(sample.frame) && sample.frame >= 0 && sample.frame < 30, `${family}: ${clip} frame is in the authored 0–29 range`);
    assert.equal(sample.texture, `supplied-towers-30fps-${family}-${clip}`);
    assert.equal(sample.name, `${family}-${clip}-${sample.frame}`, `${family}: the selected rendered frame matches the clip clock`);
    assert.equal(sample.rotation, 0, `${family}: authored motion keeps the complete image upright`);
    assert(sample.width > 0 && sample.height > 0, `${family}: rendered ${clip} artwork is visible`);
  }
  assert(samples.every(sample => sample.x === samples[0].x && sample.y === samples[0].y), `${family}: ${clip} preserves the world foundation`);
}

async function inspectFamily(family) {
  // Each page gets an isolated browser context and a fresh, ordinary 300-gold defense.
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  watch(page, family);
  try {
    if (premium.includes(family)) await page.addInitScript(family => {
      localStorage.setItem('mossguard-progression-v2', JSON.stringify({ version: 2, shopRanks: { [`unlock-${family}`]: 1 } }));
    }, family);
    await page.goto(base);
    await page.waitForSelector('#battlefield[data-ready="true"]');
    await enterBattle(page);
    const fresh = await state(page);
    assert.equal(fresh.gold, 300);
    assert.equal(fresh.progression.xp, 0);
    assert.deepEqual(fresh.towerMastery, {}, `${family}: the access fixture grants no practice XP`);
    assert.equal(fresh.animations.towerFps, 30);
    await page.locator(`[data-tower="${family}"]`).click();
    if (family === 'trap') await clickWorld(page, fresh.path[1]);
    else await page.locator('[data-foundation="8"]').click();
    await page.waitForFunction(family => window.__MOSSGUARD__.towers.some(tower => tower.kind === family), family);
    const tower = (await state(page)).towers[0];
    await page.waitForFunction(id => window.__MOSSGUARD__.animations.towers.find(tower => tower.id === id)?.state === 'idle', tower.id);
    const idle = await sampleClip(page, tower.id, 'idle');
    assertClip(idle, family, 'idle');
    await closeTowerDetails(page);
    await page.locator('#start-wave').click();
    await page.waitForFunction(id => {
      const tower = window.__MOSSGUARD__.animations.towers.find(tower => tower.id === id);
      return tower?.fireSequence > 0 && tower.animation === 'attack';
    }, tower.id, { timeout: 20000 });
    const attack = await sampleClip(page, tower.id, 'attack');
    assertClip(attack, family, 'attack');
    const combat = await state(page);
    if (family === 'trap') assert(combat.traps[0].uses < tower.uses, 'A real finite-charge trigger starts the Path trap attack clip');
    if (family === 'barracks') assert(combat.troops.some(troop => troop.state === 'fighting' || troop.cooldown > 0), 'A real soldier attack starts the Barracks clip');
    evidence.push({ family, idleFrames: [...new Set(idle.map(sample => sample.frame))], attackFrames: [...new Set(attack.map(sample => sample.frame))], fireSequence: attack.at(-1).fireSequence });
    await page.screenshot({ path: `artifacts/tower-clips/${family}-combat.png` });
    console.log(`  ✓ ${family}: 30 FPS idle and real combat attack frames`);
  } catch (error) {
    await page.screenshot({ path: `artifacts/tower-clips/${family}-failure.png` }).catch(() => {});
    throw error;
  } finally { await page.close(); }
}

async function worker() {
  while (nextFamily < families.length) {
    const family = families[nextFamily++];
    await inspectFamily(family);
  }
}

try {
  await mkdir('artifacts/tower-clips', { recursive: true });
  const results = await Promise.allSettled([worker(), worker(), worker()]);
  const failures = results.filter(result => result.status === 'rejected');
  for (const failure of failures) console.error(failure.reason);
  assert.equal(failures.length, 0, 'Every all-family animation worker completes');
  assert.equal(evidence.length, 17, 'All seventeen actual tower families were exercised');
  assert.equal(loadedClips.size, 34, 'All thirty-four supplied idle and attack image sheets loaded successfully');
  assert.deepEqual(errors, [], `No runtime or asset errors: ${errors.join('\n')}`);
  await writeFile('artifacts/tower-clips/evidence.json', JSON.stringify(evidence.sort((a, b) => families.indexOf(a.family) - families.indexOf(b.family)), null, 2));
  console.log('PASS: 17 tower clip checks; every family renders changing idle and combat attack poses, and all 34 clips load.');
} finally { await browser.close(); }
