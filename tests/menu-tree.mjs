import { clickViewControl } from './play-helpers.mjs';
/** Title menu, connected skill graph and paced defense progression through real UI input. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base=process.env.GAME_URL||'http://127.0.0.1:4173/my-first-game/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[];
let activePage=null;
function check(message){checks.push(message);console.log(`PASS ${message}`);}
const snapshot=page=>page.evaluate(()=>window.__MOSSGUARD__);
function monitor(page,label){
 activePage=page;
 page.on('pageerror',error=>errors.push(`${label}: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')errors.push(`${label}: ${message.text()}`);});
 page.on('requestfailed',request=>errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);});
}
async function boot(page){
 await page.goto(base);await page.waitForSelector('#battlefield[data-ready="true"]');
 await page.waitForFunction(()=>window.__MOSSGUARD__?.view&&window.__MOSSGUARD__?.pads?.length>0);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('#menu-play').waitFor({state:'visible'});
}
async function capture(page,name){await page.screenshot({path:`artifacts/menu-tree/${name}.png`,fullPage:true});}
async function enterCampaign(page,index=0){
 await page.locator('#menu-play').click();await page.locator('#campaign').waitFor({state:'visible'});
 await page.locator(`[data-level="${index}"]`).click();
 await page.waitForFunction(index=>window.__MOSSGUARD__.levelIndex===index&&!window.__MOSSGUARD__.paused,index);
}
async function closeDetails(page){if(await page.locator('#close-inspection').isVisible())await page.locator('#close-inspection').click();}
async function namedBuild(page,kind,pad){
 const before=await snapshot(page);
 await page.locator(`[data-tower="${kind}"]`).click();await page.locator(`[data-foundation="${pad}"]`).click();
 await page.waitForFunction(count=>window.__MOSSGUARD__.towers.length===count,before.towers.length+1);
 return (await snapshot(page)).towers.find(tower=>tower.kind===kind&&tower.padId===pad);
}
async function point(page,position){
 const pixel=await page.locator('#battlefield canvas').evaluate((canvas,position)=>{
  const view=window.__MOSSGUARD__.view,box=canvas.getBoundingClientRect();
  return{x:box.x+(position.x-view.scrollX)*view.renderScale*view.zoom/canvas.width*box.width,
   y:box.y+(position.y-view.scrollY)*view.renderScale*view.zoom/canvas.height*box.height};
 },position);
 await page.mouse.click(pixel.x,pixel.y);
}
async function bounds(page,selector,label){
 const m=await page.locator(selector).evaluate(element=>{
  const r=element.getBoundingClientRect();return{rect:r.toJSON(),width:innerWidth,height:innerHeight,
   pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
   fullscreen:!document.fullscreenElement||document.fullscreenElement.contains(element)};
 });
 assert(m.rect.left>=-1&&m.rect.top>=-1&&m.rect.right<=m.width+1&&m.rect.bottom<=m.height+1,`${label}: surface fits viewport`);
 assert(m.pageWidth<=m.width&&m.pageHeight<=m.height+1,`${label}: no page overflow`);assert(m.fullscreen,`${label}: belongs to native fullscreen subtree`);
}
async function checkMenuButtons(page,label){
 const selectors=['#menu-play','#menu-skills','#menu-settings','#menu-guide'];if(await page.locator('#menu-continue').isVisible())selectors.unshift('#menu-continue');
 for(const selector of selectors){
  const r=await page.locator(selector).boundingBox(),viewport=page.viewportSize();assert(r&&r.width>=44&&r.height>=44,`${label}: ${selector} keeps a 44px target`);assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,`${label}: ${selector} stays onscreen`);
 }
}
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('mossguard-progression-v2')||'null'));}

try{
 await mkdir('artifacts/menu-tree',{recursive:true});
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});monitor(desktop,'desktop');await boot(desktop);
 await checkMenuButtons(desktop,'Desktop title screen');await bounds(desktop,'#main-menu','Desktop title screen');
 await desktop.keyboard.press('Escape');assert.equal(await desktop.locator('#main-menu').isVisible(),true,'Escape cannot dismiss an unstarted title screen');
 await desktop.locator('#menu-play').focus();await desktop.keyboard.press('Shift+Tab');assert.equal(await desktop.locator('#menu-guide').evaluate(button=>document.activeElement===button),true,'Title-screen focus wraps within its actions');await desktop.keyboard.press('Tab');
 const initial=await snapshot(desktop);assert.equal(initial.paused,true,'The initial menu pauses the battlefield');
 await desktop.waitForTimeout(180);assert.equal((await snapshot(desktop)).time,initial.time,'The title screen does not simulate a hidden defense');
 await desktop.locator('#main-menu-title').click();
 for(const key of ['1','Space','p','f','u'])await desktop.keyboard.press(key);
 const gated=await snapshot(desktop);assert.equal(gated.paused,true);assert.equal(gated.wave,0);assert.equal(gated.gold,initial.gold);assert.equal(gated.towers.length,0);
 assert(await desktop.locator('[data-tower]').evaluateAll(elements=>elements.every(button=>button.getAttribute('aria-pressed')!=='true')),'Menu hotkeys do not arm hidden tower placement');
 await capture(desktop,'main-menu');
 check('The title screen is actionable, pauses the battlefield, and gates hidden combat hotkeys');

 await desktop.locator('#menu-settings').click();await desktop.locator('#settings').waitFor({state:'visible'});
 assert.equal((await snapshot(desktop)).paused,true);await desktop.locator('#settings-done').click();await desktop.locator('#menu-play').waitFor({state:'visible'});
 await desktop.locator('#menu-guide').click();await desktop.locator('#guide').waitFor({state:'visible'});
 await desktop.locator('#units-open').click();await desktop.locator('#unit-preview').waitFor({state:'visible'});
 await desktop.locator('#units-done').click();await desktop.locator('#guide-done').click();await desktop.locator('#menu-play').waitFor({state:'visible'});
 assert.equal((await snapshot(desktop)).paused,true);
 check('Title-screen settings and field guide, including the unit preview, return to the same paused menu');

 await enterCampaign(desktop);await namedBuild(desktop,'archer',0);
 assert.equal(await desktop.locator('#move-tower').count(),0,'Tower relocation has no command control');
 assert.equal(await desktop.getByRole('button',{name:/Move (tower|defense)/i}).count(),0,'No alternate relocation command remains');
 const fresh=await snapshot(desktop),tower=fresh.towers[0];
 assert.match(await desktop.locator('.tier-unlock').innerText(),/Lantern Sentries.*55 gold/s,'The ordinary Arrow blueprint advertises its gold-only stealth upgrade');
 assert.match(await desktop.locator('#wave-preview-open').getAttribute('aria-label'),/scout/i,'The compact HUD exposes the next-wave scouting action');
 await desktop.locator('#wave-preview-open').click();await desktop.locator('#detection-plan').waitFor({state:'visible'});
 assert.match(await desktop.locator('#detection-plan h3').innerText(),/wave \d+/,'The briefing identifies the next hidden wave');
 const detectionOption=desktop.locator(`[data-detection-option="archer"][data-detection-tower="${tower.id}"]`);
 assert.match(await detectionOption.innerText(),/55 gold/);assert.match(await detectionOption.innerText(),/Gold available/);
 assert.equal(await desktop.locator('[data-detection-option="truesight"]').count(),0,'The preparation options do not require the locked premium specialist');
 await detectionOption.click();await desktop.locator('#wave-preview').waitFor({state:'hidden'});
 assert.equal((await snapshot(desktop)).gold,fresh.gold,'Choosing a detection option inspects the ordinary tower without silently spending gold');
 assert(fresh.gold>=55,'The opening treasury could afford tier II before family research');
 assert.equal(await desktop.locator('#upgrade').isDisabled(),true,'A fresh family still needs permanent research before buying tier II');
 assert.equal(tower.upgradeGate.allowed,false);assert.equal(tower.upgradeGate.requiredClears,0,'No cleared-wave condition remains');assert(tower.upgradeGate.reason.length>0);
 await desktop.keyboard.press('u');assert.equal((await snapshot(desktop)).towers[0].level,1);assert.equal((await snapshot(desktop)).gold,fresh.gold);
 check('Relocation is absent and family research blocks unresearched upgrades even when gold is affordable');

 await closeDetails(desktop);await desktop.locator('#speed').click();await desktop.locator('#speed').click();await desktop.locator('#start-wave').click();
 await desktop.waitForFunction(()=>window.__MOSSGUARD__.enemies.length>0);
 const beforeMenu=await snapshot(desktop);
 const opener=desktop.locator('#main-menu-open,#home-open,#menu-open').first();
 if(await opener.count()&&await opener.isVisible())await opener.click();else await desktop.locator('.brand').click();
 const frozen=await snapshot(desktop);assert.equal(frozen.ui.hasLiveDefense,true,`An existing defense remains resumable: ${JSON.stringify({wave:frozen.wave,towers:frozen.towers.length,ui:frozen.ui})}`);
 await desktop.locator('#menu-continue').waitFor({state:'visible'});assert.equal(frozen.paused,true);assert.equal(frozen.wave,beforeMenu.wave);
 await desktop.waitForTimeout(220);const held=await snapshot(desktop);
 assert.equal(held.time,frozen.time);assert.equal(held.gold,frozen.gold);assert.deepEqual(held.towers,frozen.towers);assert.deepEqual(held.enemies,frozen.enemies);
 await desktop.locator('#menu-continue').click();await desktop.waitForFunction(()=>!window.__MOSSGUARD__.paused);
 assert.equal((await snapshot(desktop)).wave,frozen.wave);assert.equal((await snapshot(desktop)).towers[0].id,tower.id);
 check('Returning to the main menu freezes a live defense and Continue resumes its existing towers and wave');

 await desktop.waitForFunction(()=>window.__MOSSGUARD__.status==='building'&&window.__MOSSGUARD__.wave===1,undefined,{timeout:35000});
 let afterClear=await snapshot(desktop);assert.equal(afterClear.towers.length,1);assert.equal(afterClear.lives,afterClear.maxLives,'One base Arrow tower clears the opening wave without leaks');
 await point(desktop,afterClear.pads.find(pad=>pad.id===0));await desktop.locator('#upgrade').waitFor({state:'visible'});
 assert.equal(await desktop.locator('#upgrade').isDisabled(),false);await desktop.locator('#upgrade').click();
 await desktop.waitForFunction(id=>window.__MOSSGUARD__.towers.find(tower=>tower.id===id)?.level===2,tower.id);
 assert.match(await desktop.locator('#context h2').innerText(),/Lantern Sentries/);
 assert.match(await desktop.locator('.effect-summary').innerText(),/reveals stealth/);
 assert.equal((await snapshot(desktop)).unlockedTowers.includes('truesight'),false);
 check('The upcoming stealth threat advertises an affordable gold-only Arrow upgrade, and tier II gains detection before hidden enemies arrive');
 assert(await desktop.locator('[data-branch]').evaluateAll(buttons=>buttons.every(button=>button.disabled)),'The current family research still locks specialization');
 await namedBuild(desktop,'prism',2);await closeDetails(desktop);
 for(const wave of [2,3]){
  await desktop.locator('#start-wave').click();
  await desktop.waitForFunction(wave=>window.__MOSSGUARD__.status==='building'&&window.__MOSSGUARD__.wave===wave,wave,{timeout:45000});
  // Earned gold supports another Arrow as the longer campaign introduces mixed ranks.
  if(wave===2){await namedBuild(desktop,'archer',1);await closeDetails(desktop);}
 }
 afterClear=await snapshot(desktop);assert(afterClear.wave<afterClear.wavesTotal,'The first level is still in progress when mastery becomes available');
 await point(desktop,afterClear.pads.find(pad=>pad.id===0));
 assert.equal(await desktop.locator('[data-branch="A"]').isDisabled(),false,'Earned family research enables the affordable specialization');
 await desktop.locator('[data-branch="A"]').click();await desktop.waitForFunction(id=>window.__MOSSGUARD__.towers.find(tower=>tower.id===id)?.level===3,tower.id);
 await capture(desktop,'paced-first-level-upgrade');await desktop.close();
 check('Real tower use earns permanent research for tier II and specialization during the longer first stage');

 const learned=await browser.newPage({viewport:{width:1440,height:900}});monitor(learned,'connected-tree');
 await learned.addInitScript(()=>{
  if(sessionStorage.getItem('menu-tree-seeded'))return;sessionStorage.setItem('menu-tree-seeded','yes');
  localStorage.setItem('mossguard-progression-v2',JSON.stringify({version:2,xp:10000,gems:0,skillRanks:{},capstones:[],shopRanks:{},stages:{},claimedRuns:[]}));
 });
 await boot(learned);await learned.locator('#menu-skills').click();await learned.locator('#progression').waitFor({state:'visible'});
 assert.equal((await snapshot(learned)).paused,true);
 assert.equal((await snapshot(learned)).catalog.skills.length,100);
 assert.equal(await learned.locator('[data-skill-branch]').count()>=10,true,'Overview exposes all ten skill branches');
 await capture(learned,'tree-overview');await learned.locator('#skill-branch').selectOption('damage');
 assert.equal(await learned.locator('[data-skill-node]').count(),10);
 assert.equal(await learned.locator('svg.skill-tree-edges').isVisible(),true,'Branch dependencies are drawn as a visible connected graph');
 assert.equal(await learned.locator('path[data-skill-from="damage-2"][data-skill-to="damage-5"]').count(),1);
 assert.equal(await learned.locator('path[data-skill-from="damage-3"][data-skill-to="damage-5"]').count(),1);
 const ids=[];
 for(const branch of ['damage','range','haste','area','control','elemental','critical','economy','fortify','grandmastery']){
  await learned.locator('#skill-branch').selectOption(branch);ids.push(...await learned.locator('[data-skill-node]').evaluateAll(nodes=>nodes.map(node=>node.dataset.skillNode)));
 }
 assert.equal(new Set(ids).size,100,'The connected branches retain all one hundred nodes');
 await learned.locator('#skill-branch').selectOption('damage');
 await learned.locator('[data-skill-node="damage-5"]').click();assert.equal(await learned.locator('[data-skill-buy="damage-5"]').isDisabled(),true);
 const beforeInspect=await saved(learned);await learned.locator('[data-skill-node="damage-1"]').click();assert.equal((await saved(learned)).xp,beforeInspect.xp,'Inspecting a node does not spend XP');
 await learned.locator('[data-skill-buy="damage-1"]').click();assert.equal((await saved(learned)).skillRanks['damage-1'],1);
 await learned.locator('[data-skill-node="damage-2"]').click();await learned.locator('[data-skill-buy="damage-2"]').click();
 await learned.locator('[data-skill-node="damage-5"]').click();assert.equal(await learned.locator('[data-skill-buy="damage-5"]').isDisabled(),true,'A joined node requires both parent paths');
 await learned.locator('[data-skill-node="damage-3"]').click();await learned.locator('[data-skill-buy="damage-3"]').click();
 await learned.locator('[data-skill-node="damage-5"]').click();assert.equal(await learned.locator('[data-skill-buy="damage-5"]').isDisabled(),false);await learned.locator('[data-skill-buy="damage-5"]').click();
 assert.equal((await saved(learned)).skillRanks['damage-5'],1);assert.equal((await snapshot(learned)).paused,true);
 await capture(learned,'tree-joined-path');
 check('All hundred skill nodes have connected dependency paths, and joined unlocks enforce both parents before charging XP');

 await learned.locator('[data-skill-node="damage-1"]').focus();await learned.keyboard.press('End');
 assert.equal(await learned.locator('[data-skill-node="damage-10"]').evaluate(node=>document.activeElement===node),true);
 await learned.keyboard.press('Home');assert.equal(await learned.locator('[data-skill-node="damage-1"]').evaluate(node=>document.activeElement===node),true);
 await learned.keyboard.press('ArrowRight');assert(await learned.evaluate(()=>Boolean(document.activeElement?.hasAttribute('data-skill-node'))));
 await learned.keyboard.press('Enter');assert.equal(await learned.locator('[data-skill-buy]').count(),1);
 await learned.locator('#progression-done').click();await learned.locator('#menu-play').waitFor({state:'visible'});
 assert.equal((await snapshot(learned)).paused,true,'Closing the tree opened from Home restores Home rather than resuming a hidden game');
 await learned.reload();await learned.locator('#menu-play').waitFor({state:'visible'});
 assert.equal((await snapshot(learned)).progression.skillRanks['damage-5'],1,'Learned graph joins survive reload');await learned.close();
 check('The graph supports keyboard navigation, saves learned ranks, and returns to the paused title screen');

 const legacy=await browser.newPage({viewport:{width:1280,height:800}});monitor(legacy,'legacy-linear-save');
 await legacy.addInitScript(()=>{
  if(sessionStorage.getItem('legacy-tree-seeded'))return;sessionStorage.setItem('legacy-tree-seeded','yes');
  const skillRanks={};for(let i=1;i<=10;i++)skillRanks[`damage-${i}`]=1;
  localStorage.setItem('mossguard-progression-v2',JSON.stringify({version:2,xp:400,gems:75,skillRanks,capstones:[],shopRanks:{},stages:{},claimedRuns:[]}));
 });
 await boot(legacy);let carried=await snapshot(legacy);assert.equal(carried.progression.xp,400);assert.equal(carried.progression.gems,75);
 for(let i=1;i<=10;i++)assert.equal(carried.progression.skillRanks[`damage-${i}`],1,'Old linear purchases remain valid under the branching layout');
 await legacy.locator('#menu-skills').click();await legacy.locator('#skill-branch').selectOption('damage');
 assert(await legacy.locator('[data-skill-node]').evaluateAll(nodes=>nodes.every(node=>node.dataset.skillState==='learned')));
 await legacy.locator('#progression-done').click();await legacy.reload();await legacy.locator('#menu-play').waitFor({state:'visible'});
 carried=await snapshot(legacy);assert.equal(carried.progression.skillRanks['damage-10'],1);assert.equal(carried.progression.xp,400);await legacy.close();
 check('Existing linear-tree purchases, XP, and gems remain intact in the connected tree and after reload');

 for(const [width,height]of [[320,568],[390,844],[568,320],[844,390]]){
  const mobile=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});monitor(mobile,`${width}x${height}`);await boot(mobile);
  await checkMenuButtons(mobile,`${width}px menu`);await bounds(mobile,'#main-menu',`${width}px title menu`);await capture(mobile,`${width}x${height}-menu`);
  await mobile.locator('#menu-skills').click();await mobile.locator('#progression').waitFor({state:'visible'});
  await bounds(mobile,'#progression .modal',`${width}px skill tree`);await mobile.locator('#skill-branch').selectOption('damage');
  const targets=await mobile.locator('[data-skill-node]').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
  assert(targets.every(rect=>rect.width>=44&&rect.height>=44),'Tree node targets remain at least 44px');
  await capture(mobile,`${width}x${height}-tree`);await mobile.locator('#progression-done').click();await enterCampaign(mobile);await namedBuild(mobile,'archer',0);await closeDetails(mobile);
  await clickViewControl(mobile, '#fullscreen');await mobile.waitForFunction(()=>Boolean(document.fullscreenElement));
  const home=mobile.locator('#main-menu-open,#home-open,#menu-open').first();
  if(await home.count()&&await home.isVisible())await home.click();else await mobile.locator('.brand').click();
  await mobile.locator('#menu-skills').waitFor({state:'visible'});assert.equal(await mobile.locator('#menu-continue').isVisible(),true,'An existing defense exposes Resume');await checkMenuButtons(mobile,`${width}px resumed menu`);await bounds(mobile,'#main-menu',`${width}px resumed menu`);await mobile.locator('#menu-skills').click();
  await bounds(mobile,'#progression .modal',`${width}px fullscreen tree`);await capture(mobile,`${width}x${height}-fullscreen-tree`);
  await mobile.close();
 }
 check('Portrait and landscape menus and connected trees remain usable on phones, including native fullscreen');
 assert(checks.length>=9,'The menu/tree acceptance bodies must be complete before this suite can pass');
 assert.deepEqual(errors,[]);
 console.log(`PASS: ${checks.length} menu and tree checks\n${checks.map(check=>`  ✓ ${check}`).join('\n')}`);
}catch(error){if(activePage&&!activePage.isClosed()){await capture(activePage,'failure').catch(()=>{});const last=await snapshot(activePage).catch(()=>null);console.log('Last UI state:',JSON.stringify(last&&{ui:last.ui,wave:last.wave,status:last.status,paused:last.paused,towers:last.towers.length,gold:last.gold}));}throw error;}finally{await browser.close();}
