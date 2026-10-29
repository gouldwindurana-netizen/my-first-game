/** Shared user-input paths. These helpers never mutate the running game. */
import assert from 'node:assert/strict';

export async function enterBattle(page, index = 0) {
  await page.locator('#main-menu').waitFor({ state: 'visible' });
  await page.locator('#menu-play').click();
  await page.locator('#campaign').waitFor({ state: 'visible' });
  await page.locator(`[data-level="${index}"]`).click();
  await page.waitForFunction(index => window.__MOSSGUARD__?.levelIndex === index && !window.__MOSSGUARD__.paused, index);
  await page.locator('#main-menu').waitFor({ state: 'hidden' });
}

export async function closeTowerDetails(page) {
  const close = page.locator('#close-inspection');
  if (await close.isVisible()) await close.click();
}

export async function clickWorld(page, point) {
  const pixel = await page.locator('#battlefield canvas').evaluate((canvas, point) => {
    const box = canvas.getBoundingClientRect(), view = window.__MOSSGUARD__.view;
    return { x: box.x + (point.x-view.scrollX)*view.renderScale*view.zoom/canvas.width*box.width,
      y: box.y + (point.y-view.scrollY)*view.renderScale*view.zoom/canvas.height*box.height };
  }, point);
  await page.mouse.click(pixel.x, pixel.y);
}

export async function selectTower(page, id) {
  await closeTowerDetails(page);
  const point = await page.evaluate(id => {
    const state=window.__MOSSGUARD__,tower=state.towers.find(t=>t.id===id);
    return tower?.position || state.pads.find(p=>p.id===tower?.padId);
  }, id);
  assert(point, 'The defense to inspect still exists');
  await clickWorld(page, point);
  await page.locator('#upgrade').waitFor({ state: 'visible' });
}

export async function clearNextWave(page, { timeout=60000, fast=true, starfall=true }={}) {
  await closeTowerDetails(page);
  const before=await page.evaluate(()=>window.__MOSSGUARD__);
  if(before.paused) {
    if(await page.locator('#resume').isVisible()) await page.locator('#resume').click();
    else await page.locator('#pause').click();
  }
  const originalSpeed=before.speed;
  if(fast) for(let i=0;i<3&&(await page.evaluate(()=>window.__MOSSGUARD__.speed))!==3;i++) await page.locator('#speed').click();
  let snapshot=await page.evaluate(()=>window.__MOSSGUARD__);
  if(snapshot.status==='building') await page.locator('#start-wave').click();
  const targetWave=(await page.evaluate(()=>window.__MOSSGUARD__.wave));
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline) {
    snapshot=await page.evaluate(()=>window.__MOSSGUARD__);
    assert.notEqual(snapshot.status,'lost',`Defense fell while clearing wave ${targetWave}`);
    if(snapshot.status==='building'&&snapshot.wave>=targetWave || snapshot.status==='won') break;
    if(starfall && snapshot.status==='wave'&&snapshot.enemies.length&&snapshot.meteorCooldown===0&&!snapshot.paused) {
      const target=[...snapshot.enemies].sort((a,b)=>b.distance-a.distance)[0];
      await page.locator('#meteor').click();await clickWorld(page,target);
    }
    await page.waitForTimeout(80);
  }
  assert(snapshot.status==='building'||snapshot.status==='won',`Wave ${targetWave} cleared before timeout`);
  if(fast) for(let i=0;i<3&&(await page.evaluate(()=>window.__MOSSGUARD__.speed))!==originalSpeed;i++) await page.locator('#speed').click();
  return page.evaluate(()=>window.__MOSSGUARD__);
}

/** Camera and secondary game actions live in the compact HUD tools popup. */
export async function openViewTools(page) {
  if (await page.locator('#hud-camera-tools').isVisible()) return;
  if (await page.locator('#hud-view').isVisible()) {
    await page.locator('#hud-view').click();
    await page.locator('#hud-camera-tools').waitFor({ state: 'visible' });
  }
}

export async function clickViewControl(page, selector) {
  if (!await page.locator(selector).isVisible()) await openViewTools(page);
  await page.locator(selector).click();
}

async function openGameAction(page, selectors, surface) {
  for (const selector of selectors) if (await page.locator(selector).isVisible()) {
    await page.locator(selector).click();
    await page.locator(surface).waitFor({ state: 'visible' });
    return;
  }
  await openViewTools(page);
  for (const selector of selectors) if (await page.locator(selector).isVisible()) {
    await page.locator(selector).click();
    await page.locator(surface).waitFor({ state: 'visible' });
    return;
  }
  throw new Error(`No visible HUD action opens ${surface}`);
}

export const openGameSettings = page => openGameAction(page, ['#settings-open', '#rail-settings'], '#settings');
export const openGameGuide = page => openGameAction(page, ['#guide-nav', '#how-to', '#hud-guide'], '#guide');
export const openGameCampaign = page => openGameAction(page, ['#levels-open', '#rail-levels'], '#campaign');
export const openGameProgression = page => openGameAction(page, ['#progression-open', '#meta-open', '#hud-research'], '#progression');

export async function revealTowerCard(page, kind) {
  const card = page.locator(`[data-tower="${kind}"]`);
  if (!await card.isVisible()) {
    if (await page.locator('#tower-filter-select').isVisible()) await page.locator('#tower-filter-select').selectOption('all');
    else if (await page.locator('[data-tower-filter="all"]').isVisible()) await page.locator('[data-tower-filter="all"]').click();
  }
  await card.scrollIntoViewIfNeeded();
  return card;
}

export async function chooseTowerCard(page, kind, touch = false) {
  const card = await revealTowerCard(page, kind);
  if (touch) await card.tap(); else await card.click();
  return card;
}

export async function toggleGameSound(page) {
  if (await page.locator('#sound').isVisible()) {
    await page.locator('#sound').click();
  } else {
    await openGameSettings(page);
    const checkbox=page.locator('#sound-setting');
    await checkbox.setChecked(!await checkbox.isChecked());
    await page.waitForFunction(()=>!document.querySelector('#sound')?.hasAttribute('aria-busy'));
    await page.locator('#settings-done').click();
  }
}
