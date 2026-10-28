/** Family mastery is earned through real play; no live game state is mutated. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { enterBattle, clearNextWave, selectTower, closeTowerDetails } from './play-helpers.mjs';

const base=process.env.GAME_URL||'http://127.0.0.1:4173/my-first-game/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[],state=page=>page.evaluate(()=>window.__MOSSGUARD__);
let activePage;
function monitor(page,label){
 activePage=page;
 page.on('pageerror',error=>errors.push(`${label}: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')errors.push(`${label}: ${message.text()}`);});
 page.on('requestfailed',request=>errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);});
}
async function boot(page){await page.goto(base);await page.waitForSelector('#battlefield[data-ready="true"]');await page.locator('#menu-play').waitFor({state:'visible'});}
async function build(page,kind,pad){
 await closeTowerDetails(page);await page.locator(`[data-tower="${kind}"]`).click();await page.locator(`[data-foundation="${pad}"]`).click();
 await page.waitForFunction(({kind,pad})=>window.__MOSSGUARD__.towers.some(t=>t.kind===kind&&t.padId===pad),{kind,pad});
 return (await state(page)).towers.find(t=>t.kind===kind&&t.padId===pad);
}
async function research(page){
 if(await page.locator('#tower-research-open').isVisible()){
  await page.locator('#tower-research-open').click();await page.locator('#progression').waitFor({state:'visible'});return;
 }
 await closeTowerDetails(page);
 if(await page.locator('#meta-open').isVisible())await page.locator('#meta-open').click();
 else{await page.locator('#rail-levels').click();await page.locator('#progression-open').click();}
 await page.locator('#progression').waitFor({state:'visible'});await page.locator('[data-meta-tab="research"]').click();
}
async function capture(page,name){await page.screenshot({path:`artifacts/mastery/${name}.png`,fullPage:true});}
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('mossguard-progression-v2')||'null'));}
async function surface(page,label){
 const m=await page.locator('#progression .modal').evaluate(panel=>{const r=panel.getBoundingClientRect();return{r:r.toJSON(),w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,fullscreen:!document.fullscreenElement||document.fullscreenElement.contains(panel)};});
 assert(m.r.left>=-1&&m.r.top>=-1&&m.r.right<=m.w+1&&m.r.bottom<=m.h+1,`${label}: journal fits viewport`);
 assert(m.sw<=m.w&&m.sh<=m.h+1,`${label}: no page overflow`);assert(m.fullscreen,`${label}: journal stays in native fullscreen`);
 assert.equal(await page.locator('#research-family option').count(),17);
 assert.equal(await page.locator('[data-research-family]').count(),17);
 assert.equal(await page.locator('[data-research-key]').count(),5);
}

try{
 await mkdir('artifacts/mastery',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});monitor(page,'earned-mastery');await boot(page);await enterBattle(page);
 const arrow=await build(page,'archer',0),fresh=await state(page);
 assert.deepEqual(fresh.towerMastery,{});assert.equal(fresh.progression.xp,0);
 await page.waitForTimeout(300);assert.deepEqual((await state(page)).towerMastery,{},'Preparation time does not train an idle tower');
 assert.equal(await page.locator('#upgrade').isDisabled(),true);
 const detached=await page.evaluate(()=>{const a=window.__MOSSGUARD__;a.towerMastery.archer=9999;a.towerXPReport.totals.archer=9999;return !window.__MOSSGUARD__.towerMastery.archer&&!window.__MOSSGUARD__.towerXPReport.totals.archer;});
 assert(detached,'Mastery and cumulative report diagnostics cannot mutate live XP');
 checks.push('Fresh families start unresearched, preparation gives no XP, and diagnostics are read-only');

 await clearNextWave(page,{starfall:false});await selectTower(page,arrow.id);
 const first=await state(page);assert.equal(first.wave,1);assert.equal(first.lives,first.maxLives,'One base Arrow clears the opening wave without leaks');
 assert(first.towerMastery.archer>=12,'Real Arrow participation researches Tier II after its first useful outing');
 assert.equal(first.towerMastery.cannon,undefined,'Undeployed families gain no XP');assert.equal(first.progression.xp,0,'Family practice does not grant spendable account XP');
 assert.equal(first.progression.towerMastery.archer,first.towerMastery.archer,'Earned family XP is reconciled into the save');
 assert.equal(await page.locator('#upgrade').isDisabled(),false);
 await page.locator('#upgrade').click();let upgraded=await state(page);
 assert.equal(upgraded.towers.find(t=>t.id===arrow.id).level,2);assert.equal(upgraded.gold,first.gold-55);
 assert.equal(upgraded.towerMastery.archer,first.towerMastery.archer,'Buying a researched upgrade does not spend family XP');
 assert.equal(await page.locator('[data-branch="A"]').isDisabled(),true);
 checks.push('Earned Arrow XP unlocks affordable 55-gold detection while family XP and account XP stay separate');

 await build(page,'prism',2);
 for(let wave=2;wave<=3;wave++)await clearNextWave(page,{starfall:false});
 await selectTower(page,arrow.id);const trained=await state(page);
 assert(trained.wave<trained.wavesTotal);assert(trained.towerMastery.archer>=75,'Continued Arrow use researches its first specialization during level one');
 assert(trained.towerMastery.prism>0,'The second deployed family earns its own XP');
 assert.equal(await page.locator('[data-branch="A"]').isDisabled(),false);assert.equal(await page.locator('[data-branch="D"]').isDisabled(),true);
 const branchCost=trained.catalog.towers.find(t=>t.kind==='archer').branches.A.cost;
 await page.locator('[data-branch="A"]').click();const specialized=await state(page);
 assert.equal(specialized.towers.find(t=>t.id===arrow.id).level,3);assert.equal(specialized.gold,trained.gold-branchCost);
 assert.equal(specialized.towerMastery.archer,trained.towerMastery.archer);
 checks.push('Real play reaches full Arrow specialization in the first level; branch purchase still charges battle gold');

 assert.equal(await page.locator('#tower-family-xp').innerText(),`${specialized.towerMastery.archer.toLocaleString()} family XP`);
 await research(page);await surface(page,'Desktop research');
 assert.equal(await page.locator('[data-research-detail="archer"]').count(),1,'The tower shortcut opens its own family archive');
 assert.equal((await state(page)).paused,true);assert.equal(await page.locator('[data-research-key="II"]').getAttribute('data-research-unlocked'),'true');
 assert.equal(await page.locator('[data-research-key="A"]').getAttribute('data-research-unlocked'),'true');
 assert.match(await page.locator('[data-research-key="II"]').innerText(),/55 gold/);
 assert.match(await page.locator('.research-explainer').innerText(),/never spent/i);
 await page.locator('#research-family').selectOption('cannon');assert.equal(await page.locator('[data-research-key="II"]').getAttribute('data-research-unlocked'),'false');
 await page.locator('#research-family').selectOption('truesight');assert.match(await page.locator('.research-access').innerText(),/40 gems/);
 await page.locator('#research-family').selectOption('archer');
 const stable=await state(page),beforeSave=await saved(page);await page.waitForTimeout(350);await page.locator('#research-family').selectOption('prism');await page.locator('#research-family').selectOption('archer');
 assert.deepEqual((await state(page)).towerMastery,stable.towerMastery,'Paused inspections do not earn or re-award XP');assert.deepEqual((await saved(page)).towerMastery,beforeSave.towerMastery);
 await capture(page,'desktop-earned-research');await page.locator('#progression-done').click();
 checks.push('All seventeen research families show earned thresholds, gold costs, premium access, and pause-safe progress');

 const permanent=(await state(page)).towerMastery;
 await page.reload();await page.waitForSelector('#battlefield[data-ready="true"]');await page.locator('#menu-play').waitFor({state:'visible'});
 assert.deepEqual((await state(page)).towerMastery,permanent,'Family XP survives reload exactly once');
 await enterBattle(page);const replayArrow=await build(page,'archer',0);
 assert.equal(await page.locator('#upgrade').isDisabled(),true,'Permanent research still requires each placed tower to defend a wave');
 await clearNextWave(page,{starfall:false});await selectTower(page,replayArrow.id);
 assert((await state(page)).towerMastery.archer>permanent.archer,'A new defense adds earned XP to the permanent family total');assert.equal(await page.locator('#upgrade').isDisabled(),false);
 checks.push('Family research survives reload without duplication and carries across defenses while preserving field experience gates');
 await page.close();

 const support=await browser.newPage({viewport:{width:1440,height:900}});monitor(support,'troop-credit');await boot(support);await enterBattle(support);
 const barracks=await build(support,'barracks',0);await closeTowerDetails(support);
 await support.locator('#speed').click();await support.locator('#speed').click();await support.locator('#start-wave').click();
 await support.waitForFunction(()=>window.__MOSSGUARD__.status==='wave'&&(window.__MOSSGUARD__.towerMastery.barracks||0)>0&&window.__MOSSGUARD__.troops.some(t=>t.targetId!==null),undefined,{timeout:30000});
 const fighting=await state(support);assert.equal(fighting.towers.length,1);assert.equal(fighting.towers[0].kind,'barracks');assert(fighting.troops.some(t=>t.targetId!==null),'Soldier participation trains its parent family during combat');
 await support.locator('#pause').click();const held=(await state(support)).towerMastery;await support.waitForTimeout(300);assert.deepEqual((await state(support)).towerMastery,held,'Paused troop combat grants no practice');await support.locator('#resume').click();
 await selectTower(support,barracks.id);await support.locator('#sell').click();await closeTowerDetails(support);
 for(let attempt=0;attempt<5&&(await state(support)).status!=='lost';attempt++){
  if((await state(support)).status==='building')await support.locator('#start-wave').click();
  await support.waitForFunction(()=>['building','lost'].includes(window.__MOSSGUARD__.status),undefined,{timeout:45000});
 }
 const defeated=await state(support);assert.equal(defeated.status,'lost','The undefended replay reaches a real defeat');assert(defeated.towerMastery.barracks>=held.barracks,'Earned troop XP survives sale and defeat, including any final defended-wave credit');
 await support.reload();await support.waitForSelector('#battlefield[data-ready="true"]');assert.deepEqual((await state(support)).towerMastery,defeated.towerMastery,'Practice from an unfinished, lost defense survives reload exactly once');
 checks.push('Soldiers credit their Barracks family during combat, and earned XP survives pause, sale, defeat, and reload');await support.close();

 for(const [width,height]of [[390,844],[844,390]]){
  const phone=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});monitor(phone,`${width}px-research`);await boot(phone);await enterBattle(phone);
  await phone.locator('#fullscreen').click();await phone.waitForFunction(()=>Boolean(document.fullscreenElement));await research(phone);await surface(phone,`${width}px fullscreen research`);
  await phone.locator('#research-family').selectOption('nexus');assert.equal(await phone.locator('[data-research-detail="nexus"]').count(),1);assert.equal(await phone.locator('[data-research-key="D"]').count(),1);
  await phone.locator('#research-family').selectOption('archer');await capture(phone,`${width}x${height}-fullscreen`);await phone.close();
 }
 checks.push('Portrait and landscape phone research remains usable inside native fullscreen');
 assert.deepEqual(errors,[]);console.log(`PASS: ${checks.length} mastery checks\n${checks.map(check=>`  ✓ ${check}`).join('\n')}`);
}catch(error){if(activePage&&!activePage.isClosed()){await capture(activePage,'failure').catch(()=>{});const last=await state(activePage).catch(()=>null);console.log('Last mastery state:',JSON.stringify(last&&{wave:last.wave,status:last.status,gold:last.gold,mastery:last.towerMastery,report:last.towerXPReport}));}throw error;}finally{await browser.close();}
