/** Difficulty lengths, larger battlefields, counters and the compact HUD through real UI. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { enterBattle, openGameCampaign, openGameProgression, closeTowerDetails, chooseTowerCard, openViewTools, clickWorld } from './play-helpers.mjs';
const base=process.env.GAME_URL||'http://127.0.0.1:4173/my-first-game/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[];let active=null;
const state=page=>page.evaluate(()=>window.__MOSSGUARD__);
function monitor(page,label){active=page;page.on('pageerror',e=>errors.push(`${label}: ${e.message}`));page.on('requestfailed',r=>errors.push(`${label}: ${r.failure()?.errorText} ${r.url()}`));page.on('response',r=>{if(r.status()>=400)errors.push(`${label}: HTTP${r.status()} ${r.url()}`);});}
async function boot(page){await page.goto(base);await page.waitForSelector('#battlefield[data-ready="true"]');await enterBattle(page);await page.evaluate(()=>document.fonts.ready);}
async function capture(page,name){await page.screenshot({path:`artifacts/endurance/${name}.png`,fullPage:true});}
async function classicHud(page,label){
 for(const selector of ['.site-header','.mission-heading','.site-footer','.field-rail','.minimap-panel'])assert.equal(await page.locator(selector).isVisible(),false,`${label}: ${selector} does not surround the battlefield`);
 assert.equal(await page.locator('.build-panel').isVisible(),false,`${label}: inspector stays closed until a defense is selected`);
 const m=await page.evaluate(()=>({width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,field:document.querySelector('#battlefield').getBoundingClientRect().toJSON(),bar:document.querySelector('.battle-bar').getBoundingClientRect().toJSON(),dock:document.querySelector('.tower-dock').getBoundingClientRect().toJSON()}));
 assert(m.pageWidth<=m.width&&m.pageHeight<=m.height+1,`${label}: HUD fits without page scrolling`);
 assert(m.field.width>=m.width*.94&&m.field.height>=m.height*.55,`${label}: the battlefield owns most of the window: ${JSON.stringify(m)}`);
 assert(m.bar.height<=100,`${label}: status HUD stays compact`);
 for(const selector of ['#pause','#hud-view','#main-menu-open','#start-wave','#wave-preview-open']){const b=await page.locator(selector).boundingBox();assert(b&&b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=m.width+1&&b.y+b.height<=m.height+1,`${label}: ${selector} has a reachable44px target`);}
}
try{
 await mkdir('artifacts/endurance',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});monitor(page,'desktop');await boot(page);
 await classicHud(page,'Desktop');await capture(page,'desktop-hud');
 checks.push('Desktop battle uses a compact status HUD and command tray with a closed inspector');
 const catalog=(await state(page)).catalog;
 assert.equal(catalog.enemies.length,40,'The enemy catalog contains forty combat types');
 assert.equal(new Set(catalog.enemies.map(enemy=>enemy.kind)).size,40);
 assert(catalog.enemies.some(enemy=>Object.values(enemy.resistances||{}).some(value=>value<0)),'The roster includes actual elemental weaknesses');
 assert(catalog.enemies.some(enemy=>enemy.armor>0)&&catalog.enemies.some(enemy=>enemy.flying)&&catalog.enemies.some(enemy=>enemy.stealth),'Armor, flying and hidden counters remain represented');
 for(const [difficulty,total]of [['easy',25],['normal',50],['hard',75],['hell',100]]){
  for(let index=0;index<12;index++){
   await openGameCampaign(page);
   if((await state(page)).difficulty!==difficulty)await page.locator('#difficulty-select').selectOption(difficulty);
   const card=page.locator(`[data-level="${index}"]`);
   assert.match(await card.innerText(),new RegExp(`${total} waves`),`${difficulty}: stage chooser advertises the actual wave length`);
   await card.click();await page.waitForFunction(index=>window.__MOSSGUARD__.levelIndex===index&&!window.__MOSSGUARD__.paused,index);
   const current=await state(page);assert.equal(current.difficulty,difficulty);assert.equal(current.wavesTotal,total,`${difficulty}: every stage uses the requested full sequence`);
   assert(current.pads.length>=14&&current.pads.length<=16,`${current.levelName}: fourteen to sixteen curated, usable foundations`);
   assert.equal(new Set(current.pads.map(pad=>pad.id)).size,current.pads.length);assert.equal(new Set(current.pads.map(pad=>pad.name)).size,current.pads.length);
   assert(current.pads.every(pad=>pad.name&&!/\d/.test(pad.name)&&pad.x>=0&&pad.x<=current.view.worldWidth&&pad.y>=0&&pad.y<=current.view.worldHeight),'All sites use unique names on the actual map');
   assert.match(await page.locator('#hud-stage-difficulty').innerText(),new RegExp(`${total} WAVES`));
  }
  checks.push(`All twelve ${difficulty} stages advertise and load${total} waves with fourteen to sixteen curated named foundations`);
 }
 await openGameCampaign(page);await page.locator('#difficulty-select').selectOption('normal');await page.locator('[data-level="0"]').click();
 for(const [filter,expected]of [['damage','archer'],['control','frost'],['support','barracks'],['premium','void']]){
  await page.locator(`[data-tower-filter="${filter}"]`).click();assert.equal(await page.locator(`[data-tower-filter="${filter}"]`).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator(`[data-tower="${expected}"]`).isVisible(),true,`${filter}: expected family is present`);
  assert((await page.locator('[data-tower]:visible').count())<17,`${filter}: category filters narrow the tray`);
 }
 await page.locator('[data-tower-filter="all"]').click();assert.equal(await page.locator('[data-tower]:visible').count(),17);
 checks.push('Damage, control, support and premium tabs filter the tray without removing any family');
 await page.locator('#wave-preview-open').click();const preview=await state(page);
 assert.equal(await page.locator('.enemy-matchup[data-enemy-kind]').count(),preview.wavePreview.length);
 for(const group of preview.wavePreview){
  const row=page.locator(`[data-enemy-kind="${group.kind}"]`);assert.match(await row.innerText(),new RegExp(group.name));
  assert((await row.locator('[data-counter-tower]').count())>0,'Each wave group offers a usable counter choice');
  assert(group.counters.tip.length>10&&group.counters.towers.length>0,'Recommendations come from the structured combat counter data');
  for(const type of group.counters.weaknesses)assert((await row.innerText()).includes(type),'Preview names actual damage weaknesses');
 }
 const recommendation=page.locator('[data-counter-tower]').first(),kind=await recommendation.getAttribute('data-counter-tower'),gold=preview.gold;
 await recommendation.click();await page.locator('#wave-preview').waitFor({state:'hidden'});
 assert.equal(await page.locator(`[data-tower="${kind}"]`).getAttribute('aria-pressed'),'true','A counter recommendation arms that family');assert.equal((await state(page)).gold,gold,'Inspecting a counter spends no gold');await page.keyboard.press('Escape');
 checks.push('Wave preview explains combat counters and lets players choose a matching defense');
 await chooseTowerCard(page,'archer');await page.locator('#close-inspection').click();
 assert.equal(await page.locator('.build-panel').isVisible(),false,'Aiming mode puts the placement panel away');
 assert.equal(await page.locator('[data-tower="archer"]').getAttribute('aria-pressed'),'true','Aiming mode keeps the tower ready');
 const openingSite=(await state(page)).pads.find(pad=>pad.id===0);await clickWorld(page,openingSite);await page.waitForFunction(()=>window.__MOSSGUARD__.towers.length===1);
 checks.push('Placement panels can collapse while keeping a tower armed for direct map aiming');
 assert.match(await page.locator('[data-tower-matchups="archer"]').innerText(),/Strong against/);
 const matchups=await page.locator('[data-tower-matchups="archer"]').innerText();assert(catalog.enemies.some(enemy=>matchups.includes(enemy.name)),'Tower inspection identifies real enemy types it counters');
 await closeTowerDetails(page);await openGameProgression(page);await page.locator('[data-meta-tab="bestiary"]').click();
 assert.equal(await page.locator('[data-enemy-guide]').count(),40);
 const guide=await page.locator('[data-enemy-guide]').evaluateAll(rows=>rows.map(row=>({kind:row.dataset.enemyGuide,name:row.querySelector('h3')?.textContent,counter:row.querySelector('.enemy-counter')?.textContent.trim()})));
 assert(guide.every(enemy=>enemy.name&&enemy.counter&&enemy.counter.startsWith('Bring ')&&enemy.counter.length>35),'Every enemy guide entry explains a tower counter and tactic');
 await capture(page,'forty-enemy-counters');await page.locator('#progression-done').click();
 checks.push('All forty enemy guide entries and tower inspections show concrete counter information');await page.close();
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});monitor(phone,'phone');await boot(phone);await classicHud(phone,'Phone');
 await phone.locator('#wave-preview-open').tap();assert((await phone.locator('.enemy-matchup').count())>0);const b=await phone.locator('#wave-preview .modal').boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=845,'Phone counter preview remains readable inside the viewport');
 await capture(phone,'phone-counter-preview');await phone.locator('#wave-preview-done').tap();checks.push('Phone HUD keeps battle controls and the counter preview readable');
 await chooseTowerCard(phone,'archer',true);await phone.locator('[data-foundation="0"]').tap();
 await phone.locator('#pause').tap();assert.equal(await phone.locator('.build-panel').isVisible(),false,'Pause puts tower details away');
 await phone.locator('#resume').tap();assert.equal((await state(phone)).paused,false);assert.equal(await phone.locator('.build-panel').isVisible(),true,'Resume restores the selected tower');
 await closeTowerDetails(phone);await openViewTools(phone);await phone.locator('#pause').tap();
 assert.equal(await phone.locator('#hud-camera-tools').isVisible(),false,'Pause closes tools above its resume controls');
 await capture(phone,'phone-pause');await phone.locator('#resume').tap();assert.equal((await state(phone)).paused,false);
 checks.push('Phone Resume remains reachable after pausing with tower details or Battle tools open');await phone.close();
 assert.deepEqual(errors,[],`No endurance-HUD runtime or asset failures:\n${errors.join('\n')}`);console.log(`PASS:${checks.length} endurance checks\n${checks.map(check=>`  ✓ ${check}`).join('\n')}`);
}catch(error){if(active&&!active.isClosed())await capture(active,'failure').catch(()=>{});throw error;}finally{await browser.close();}
