/** Expansion acceptance checks use real controls and read-only diagnostics. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base=process.env.GAME_URL||'http://127.0.0.1:4173/my-first-game/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[];
const state=page=>page.evaluate(()=>window.__MOSSGUARD__);
const towerKinds=['archer','cannon','mortar','frost','earth','arcane','tesla','venom','prism','trap','sonic','barracks','void','solar','chrono','truesight','nexus'];
const stageIds=['eldervale','windward','mirewood','frostbound','storm','crystal','ember','chasm','sanctum','voidrift','moonlit','reckoning'];
function monitor(page,label){
 page.on('pageerror',error=>errors.push(`${label}: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')errors.push(`${label}: ${message.text()}`);});
 page.on('requestfailed',request=>errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);});
}
async function boot(page){
 await page.goto(base);await page.waitForSelector('#battlefield[data-ready="true"]');
 await page.waitForFunction(()=>window.__MOSSGUARD__?.view&&window.__MOSSGUARD__?.pads?.length>0);
 await page.evaluate(()=>document.fonts.ready);
}
async function screenshot(page,name){await page.screenshot({path:`artifacts/expansion/${name}.png`,fullPage:true});}
async function closeDetails(page){if(await page.locator('#close-inspection').isVisible())await page.locator('#close-inspection').click();}
async function namedBuild(page,kind,pad){
 const before=await state(page),card=page.locator(`[data-tower="${kind}"]`);
 await card.click();await page.locator(`[data-foundation="${pad}"]`).click();
 await page.waitForFunction(count=>window.__MOSSGUARD__.towers.length===count,before.towers.length+1);
 const after=await state(page),tower=after.towers.find(tower=>tower.kind===kind&&tower.padId===pad);
 assert(tower,`${kind} is built at the selected named site`);return tower;
}
async function clickWorld(page,point){
 const position=await page.locator('#battlefield canvas').evaluate((canvas,point)=>{
  const view=window.__MOSSGUARD__.view,box=canvas.getBoundingClientRect();
  return {x:box.x+(point.x-view.scrollX)*view.renderScale*view.zoom/canvas.width*box.width,
   y:box.y+(point.y-view.scrollY)*view.renderScale*view.zoom/canvas.height*box.height};
 },point);
 await page.mouse.click(position.x,position.y);
}
async function openCampaign(page){
 await closeDetails(page);
 const button=await page.locator('#levels-open').isVisible()?page.locator('#levels-open'):page.locator('#rail-levels');
 await button.click();await page.locator('#campaign').waitFor({state:'visible'});
}
async function chooseStage(page,index){
 await openCampaign(page);await page.locator(`[data-level="${index}"]`).click();
 await page.waitForFunction(index=>window.__MOSSGUARD__.levelIndex===index&&window.__MOSSGUARD__.wave===0,index);
 return state(page);
}
async function assertViewport(page,label){
 const size=await page.evaluate(()=>({width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
  controls:['#pause','#fullscreen','#start-wave'].map(selector=>document.querySelector(selector).getBoundingClientRect().toJSON())}));
 assert(size.pageWidth<=size.width,`${label}: no horizontal page overflow`);
 assert(size.pageHeight<=size.height+1,`${label}: no vertical page scrolling`);
 assert(size.controls.every(rect=>rect.left>=0&&rect.top>=0&&rect.right<=size.width+1&&rect.bottom<=size.height+1&&rect.height>=44),`${label}: core controls remain visible and usable`);
}
async function openMeta(page){
 await closeDetails(page);
 if(await page.locator('#meta-open').isVisible())await page.locator('#meta-open').click();
 else{await openCampaign(page);await page.locator('#progression-open').click();}
 await page.locator('#progression').waitFor({state:'visible'});
 assert.equal((await state(page)).paused,true,'The progression journal pauses the defense');
}
async function closeMeta(page){await page.locator('#progression-done').click();await page.locator('#progression').waitFor({state:'hidden'});}
async function setDifficulty(page,value){
 await openCampaign(page);await page.locator('#difficulty-select').selectOption(value);
 if(await page.locator('#campaign').isVisible())await page.locator('#campaign-done').click();
 await page.waitForFunction(value=>window.__MOSSGUARD__.difficulty===value&&window.__MOSSGUARD__.wave===0,value);
}
async function assertModal(page,selector,label){
 const box=await page.locator(selector).evaluate(panel=>{
  const rect=panel.getBoundingClientRect();return {rect:rect.toJSON(),width:innerWidth,height:innerHeight,
   fullscreen:!document.fullscreenElement||document.fullscreenElement.contains(panel),
   reachable:!!document.elementFromPoint(rect.x+rect.width/2,rect.y+Math.min(rect.height/2,100))?.closest('.modal')};
 });
 assert(box.rect.x>=0&&box.rect.y>=0&&box.rect.right<=box.width+1&&box.rect.bottom<=box.height+1,`${label}: modal fits viewport`);
 assert(box.fullscreen&&box.reachable,`${label}: modal is visible, reachable and inside native fullscreen when active`);
}
async function stored(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('mossguard-progression-v2')||'null'));}

try{
 await mkdir('artifacts/expansion',{recursive:true});
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});monitor(desktop,'desktop');await boot(desktop);
 assert.equal(await desktop.locator('[data-tower]').count(),17,'The dock exposes all seventeen tower families');
 assert.deepEqual(await desktop.locator('[data-tower]').evaluateAll(elements=>elements.map(element=>element.dataset.tower)),towerKinds);
 assert.equal((await state(desktop)).unlockedTowers.length,12,'Five premium families start locked');
 await openCampaign(desktop);assert.equal(await desktop.locator('[data-level]').count(),12,'All twelve stages are available');
 assert.equal(await desktop.locator('#difficulty-select option').count(),4,'Four difficulty presets are offered');
 await desktop.locator('#campaign-done').click();
 const visited=[];
 for(let i=0;i<stageIds.length;i++){
  const snapshot=await chooseStage(desktop,i);visited.push(snapshot.levelId);
  assert(snapshot.wavesTotal>=6&&snapshot.wavesTotal<=12,'Each stage has a complete scripted defense');
  assert(snapshot.pads.every(pad=>pad.name&&!/\d/.test(pad.name)),'Sites retain descriptive names without numbers');
  assert(snapshot.wavePreview.length>0,'Every unstarted stage previews its first wave');
 }
 assert.deepEqual(visited,stageIds,'Campaign order includes the requested stages and Moonlit Citadel');
 checks.push('Seventeen tower families, twelve ordered stages, four difficulties, and named foundations are present');
 const detached=await desktop.evaluate(()=>{
  const a=window.__MOSSGUARD__,cost=a.catalog.towers[0].branches.A.cost;
  a.catalog.towers[0].branches.A.cost=1;a.catalog.skills.length=0;a.progression.skillRanks['damage-1']=99;
  const b=window.__MOSSGUARD__;return b.catalog.towers[0].branches.A.cost===cost&&b.catalog.skills.length===100&&!b.progression.skillRanks['damage-1'];
 });assert(detached,'Diagnostic data cannot mutate the combat catalog or saved progression');
 checks.push('Diagnostic catalog and progression snapshots are detached from live state');

 for(const [difficulty,lives]of [['easy',25],['normal',20],['hard',18],['hell',15]]){
  await setDifficulty(desktop,difficulty);assert.equal((await state(desktop)).maxLives,lives);
 }
 await setDifficulty(desktop,'normal');await chooseStage(desktop,0);
 checks.push('Easy, Normal, Hard, and Hell start fresh defenses with their expected keep pools');

 const preview=await state(desktop);await desktop.locator('#wave-preview-open').click();
 assert.equal((await state(desktop)).paused,true);assert.equal(await desktop.locator('.wave-enemy-list article').count(),preview.wavePreview.length);
 const countText=await desktop.locator('#wave-preview-content').innerText();
 assert.match(countText,new RegExp(`${preview.wavePreview.reduce((sum,group)=>sum+group.count,0)} enemies`));
 await desktop.locator('#wave-preview-done').click();assert.equal((await state(desktop)).paused,false);
 checks.push('Next-wave preview shows enemy types and counts and restores the prior pause state');

 const arrow=await namedBuild(desktop,'archer',0),gold=(await state(desktop)).gold;
 await desktop.locator('#upgrade').click();await desktop.waitForFunction(id=>window.__MOSSGUARD__.towers.find(t=>t.id===id)?.level===2,arrow.id);
 assert.equal((await state(desktop)).gold,gold-55,'Arrow tier II costs the requested 55 gold');
 assert.equal(await desktop.locator('[data-branch]').count(),4,'Tier II exposes all four specialization descriptions');
 assert(await desktop.locator('[data-branch="D"]').isDisabled(),'Hell specialization is locked in Normal');
 await desktop.locator('[data-branch="A"]').click();
 await desktop.waitForFunction(id=>window.__MOSSGUARD__.towers.find(t=>t.id===id)?.branch==='A',arrow.id);
 assert.equal((await state(desktop)).towers.find(t=>t.id===arrow.id).level,3);
 await screenshot(desktop,'arrow-branch');
 checks.push('Arrow exact tier-II cost and permanent branch choice work; Hell branch remains locked in Normal');

 await openMeta(desktop);
 const skills=[];assert.equal(await desktop.locator('#skill-branch option').count(),10);
 for(const branch of await desktop.locator('#skill-branch option').evaluateAll(elements=>elements.map(option=>option.value))){
  await desktop.locator('#skill-branch').selectOption(branch);
  const ids=await desktop.locator('[data-skill-node]').evaluateAll(elements=>elements.map(element=>element.dataset.skillNode));
  assert.equal(ids.length,10);skills.push(...ids);
 }
 assert.equal(new Set(skills).size,100,'The tree contains one hundred distinct usable node controls');
 await desktop.locator('[data-meta-tab="capstones"]').click();assert.equal(await desktop.locator('[data-capstone]').count(),7);
 assert(await desktop.locator('[data-capstone]').evaluateAll(elements=>elements.every(button=>button.disabled)),'Fresh capstones require ranks and XP');
 await desktop.locator('[data-meta-tab="shop"]').click();assert.equal(await desktop.locator('[data-shop-item^="unlock-"]').count(),5);
 assert(await desktop.locator('[data-shop-item]').evaluateAll(elements=>elements.every(button=>button.disabled)),'Fresh zero-gem wallet cannot buy shop upgrades');
 await desktop.locator('[data-meta-tab="bestiary"]').click();assert.equal(await desktop.locator('[data-enemy-guide]').count(),24);
 assert.match(await desktop.locator('[data-enemy-guide="bonedragon"]').innerText(),/Flying/);
 assert.match(await desktop.locator('[data-enemy-guide="stonegolem"]').innerText(),/Control immune/);
 await screenshot(desktop,'enemy-guide');await closeMeta(desktop);
 checks.push('All hundred ranked skills, seven capstones, five premium unlocks, and twenty-four enemy guide entries are reachable');
 await desktop.close();

 const funded=await browser.newPage({viewport:{width:1440,height:900}});monitor(funded,'saved-progression');
 await funded.addInitScript(()=>{
  if(sessionStorage.getItem('expansion-seeded'))return;sessionStorage.setItem('expansion-seeded','yes');
  const skillRanks={};for(let i=1;i<=5;i++)skillRanks[`damage-${i}`]=3;for(let i=1;i<=3;i++)skillRanks[`range-${i}`]=3;skillRanks['range-4']=1;
  localStorage.setItem('mossguard-progression-v2',JSON.stringify({version:2,xp:10000,gems:1000,skillRanks,capstones:[],shopRanks:{},stages:{},claimedRuns:[]}));
 });
 await boot(funded);await openMeta(funded);await funded.locator('#skill-branch').selectOption('haste');
 const beforeSkill=await stored(funded);await funded.locator('[data-skill-node="haste-1"]').click();
 let save=await stored(funded);assert.equal(save.skillRanks['haste-1'],1);assert.equal(save.xp,beforeSkill.xp-14);
 assert.equal((await state(funded)).paused,true,'Learning a skill keeps the open journal paused');
 assert.equal(await funded.locator('[data-skill-node="haste-1"]').evaluate(button=>document.activeElement===button),true,'Purchasing retains keyboard focus');
 await funded.locator('[data-meta-tab="skills"]').focus();await funded.keyboard.press('ArrowRight');
 assert.equal(await funded.locator('[data-meta-tab="capstones"]').getAttribute('aria-selected'),'true','Arrow keys switch progression tabs');
 await funded.keyboard.press('End');assert.equal(await funded.locator('[data-meta-tab="bestiary"]').getAttribute('aria-selected'),'true');
 await funded.keyboard.press('Home');assert.equal(await funded.locator('[data-meta-tab="skills"]').getAttribute('aria-selected'),'true');
 await funded.locator('[data-meta-tab="capstones"]').click();const beforeCapstone=await stored(funded);
 assert.equal(await funded.locator('[data-capstone="arsenal"]').isDisabled(),false);await funded.locator('[data-capstone="arsenal"]').click();
 save=await stored(funded);assert(save.capstones.includes('arsenal'));assert.equal(save.xp,beforeCapstone.xp-1200);
 assert.equal((await state(funded)).paused,true,'Unlocking a capstone keeps the open journal paused');
 await funded.locator('[data-meta-tab="shop"]').click();const beforeShop=await stored(funded);
 await funded.locator('[data-shop-item="unlock-void"]').click();save=await stored(funded);
 assert.equal(save.shopRanks['unlock-void'],1);assert.equal(save.gems,beforeShop.gems-45);
 assert(await funded.locator('[data-shop-item="unlock-void"]').isDisabled(),'A permanent unlock cannot be charged twice');
 assert.equal((await state(funded)).paused,true);await screenshot(funded,'saved-shop');await closeMeta(funded);
 await funded.reload();await funded.waitForSelector('#battlefield[data-ready="true"]');
 assert((await state(funded)).unlockedTowers.includes('void'),'The purchased tower remains unlocked after reload');
 save=await stored(funded);assert(save.capstones.includes('arsenal'));assert.equal(save.skillRanks['haste-1'],1);
 const built=await namedBuild(funded,'void',0);assert.equal(built.kind,'void');
 checks.push('XP ranks, capstones, and gem purchases charge once, stay paused, save, reload, and unlock a buildable premium tower');
 await setDifficulty(funded,'hell');await chooseStage(funded,11);
 const hellArrow=await namedBuild(funded,'archer',0);await funded.locator('#upgrade').click();
 await funded.waitForFunction(id=>window.__MOSSGUARD__.towers.find(t=>t.id===id)?.level===2,hellArrow.id);
 assert.equal(await funded.locator('[data-branch="D"]').isDisabled(),false,'An affordable Hell specialization is available in Hell');
 await funded.locator('[data-branch="D"]').click();await funded.waitForFunction(id=>window.__MOSSGUARD__.towers.find(t=>t.id===id)?.branch==='D',hellArrow.id);
 checks.push('Hell difficulty permits the actual D specialization when its gold cost is affordable');
 await funded.close();

 const troops=await browser.newPage({viewport:{width:1440,height:900}});monitor(troops,'troops-and-traps');await boot(troops);
 const barracks=await namedBuild(troops,'barracks',0);
 await troops.waitForFunction(()=>window.__MOSSGUARD__.troops.length===2);
 const marching=(await state(troops)).troops[0];
 await troops.waitForFunction(({id,x,y})=>{const troop=window.__MOSSGUARD__.troops.find(t=>t.id===id);return troop&&Math.hypot(troop.x-x,troop.y-y)>2;},marching);
 await troops.waitForFunction(()=>window.__MOSSGUARD__.troops.every(t=>t.state==='guarding'),undefined,{timeout:10000});
 const rallyPoint=(await state(troops)).path[6];await troops.locator('#rally-troops').click();await clickWorld(troops,rallyPoint);
 await troops.waitForFunction(({id,point})=>{const tower=window.__MOSSGUARD__.towers.find(t=>t.id===id);return tower?.rally&&Math.hypot(tower.rally.x-point.x,tower.rally.y-point.y)<2;},{id:barracks.id,point:rallyPoint});
 await troops.locator('[data-tower="trap"]').click();const beforeInvalid=await state(troops);
 await clickWorld(troops,{x:550,y:650});assert.equal((await state(troops)).gold,beforeInvalid.gold,'Invalid off-road trap input does not charge gold');
 assert.equal((await state(troops)).traps.length,0);
 const trapPoint=beforeInvalid.path[3];await clickWorld(troops,trapPoint);
 await troops.waitForFunction(()=>window.__MOSSGUARD__.traps.length===1);
 const trap=(await state(troops)).traps[0];assert.equal((await state(troops)).gold,beforeInvalid.gold-140);
 assert(trap.uses>0&&trap.maxUses===trap.uses,'A path trap starts with a finite visible charge count');
 await closeDetails(troops);await troops.locator('#speed').click();await troops.locator('#speed').click();await troops.locator('#start-wave').click();
 await troops.waitForFunction(({id,uses})=>window.__MOSSGUARD__.traps.find(t=>t.id===id)?.uses<uses,{id:trap.id,uses:trap.uses},{timeout:18000});
 await troops.waitForFunction(()=>window.__MOSSGUARD__.troops.some(t=>t.state==='fighting')&&window.__MOSSGUARD__.enemies.some(e=>e.blockedBy),undefined,{timeout:20000});
 const fighting=await state(troops);assert(fighting.troops.some(t=>t.hp<t.maxHp),'Enemy melee retaliation damages blocking troops');
 await screenshot(troops,'troops-blocking-trap');await troops.close();
 checks.push('Barracks soldiers physically march, accept rally orders, block and trade melee damage; path traps reject invalid placement and spend finite charges');

 const automatic=await browser.newPage({viewport:{width:1440,height:900}});monitor(automatic,'automatic-waves');await boot(automatic);
 await namedBuild(automatic,'archer',0);await namedBuild(automatic,'cannon',2);await namedBuild(automatic,'frost',4);await closeDetails(automatic);
 await automatic.locator('#settings-open').click();await automatic.locator('#auto-wave').check();await automatic.locator('#settings-done').click();
 assert.equal((await state(automatic)).autoWave,true);await automatic.locator('#speed').click();await automatic.locator('#speed').click();await automatic.locator('#start-wave').click();
 await automatic.waitForFunction(()=>window.__MOSSGUARD__.wave>=2,undefined,{timeout:45000});
 assert.equal((await state(automatic)).autoWave,true);await screenshot(automatic,'automatic-second-wave');await automatic.close();
 checks.push('Optional automatic waves start the next scripted wave after a real clear');

 for(const mode of ['malformed','unavailable']){
  const safe=await browser.newPage({viewport:{width:1280,height:800}});monitor(safe,mode);
  await safe.addInitScript(mode=>{if(mode==='malformed')localStorage.setItem('mossguard-progression-v2','{broken json');else Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage unavailable','SecurityError');}});},mode);
  await boot(safe);const snapshot=await state(safe);assert.equal(snapshot.progression.xp,0);assert.equal(snapshot.progression.gems,0);
  await namedBuild(safe,'archer',0);assert.equal((await state(safe)).towers.length,1);await safe.close();
 }
 checks.push('Malformed or denied localStorage leaves a playable session with finite default progression');

 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});monitor(mobile,'mobile');await boot(mobile);
 await assertViewport(mobile,'390px phone');await mobile.locator('#fullscreen').click();await mobile.waitForFunction(()=>!!document.fullscreenElement);
 await openMeta(mobile);await assertModal(mobile,'#progression .modal','Phone fullscreen progression');
 for(const tab of ['skills','capstones','shop','bestiary']){
  await mobile.locator(`[data-meta-tab="${tab}"]`).click();await assertModal(mobile,'#progression .modal',`Phone ${tab}`);
 }
 await screenshot(mobile,'phone-fullscreen-journal');await closeMeta(mobile);await assertViewport(mobile,'Phone after journal');
 await mobile.evaluate(()=>document.exitFullscreen());await mobile.close();
 checks.push('Phone and native-fullscreen progression pages remain reachable without page overflow or obscured combat controls');

 assert.deepEqual(errors,[],`No expansion runtime or asset errors: ${errors.join('\n')}`);
 console.log(`PASS: ${checks.length} expansion checks\n${checks.map(check=>`  ✓ ${check}`).join('\n')}`);
}finally{await browser.close();}
