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
