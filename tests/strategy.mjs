/** Targeting, fixed foundations, paced upgrades, and sell/rebuild through real input. */
import { enterBattle, clearNextWave, selectTower } from './play-helpers.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.GAME_URL||'http://127.0.0.1:4173/my-first-game/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[],state=page=>page.evaluate(()=>window.__MOSSGUARD__);
function watch(page,label){page.on('pageerror',error=>errors.push(`${label}: ${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`${label}: ${message.text()}`);});page.on('requestfailed',request=>errors.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));page.on('response',response=>{if(response.status()>=400)errors.push(`${label}: HTTP ${response.status()} ${response.url()}`);});}
async function boot(page){await page.goto(base);await page.waitForSelector('#battlefield[data-ready="true"]');await enterBattle(page);await page.evaluate(()=>document.fonts.ready);}
async function build(page,kind,pad,touch=false){const card=page.locator(`[data-tower="${kind}"]`),site=page.locator(`[data-foundation="${pad}"]`);if(touch)await card.tap();else await card.click();if(touch)await site.tap();else await site.click();await page.waitForFunction(({kind,pad})=>window.__MOSSGUARD__.towers.some(t=>t.kind===kind&&t.padId===pad),{kind,pad});}
async function shot(page,name){await page.screenshot({path:`artifacts/strategy/${name}.png`,fullPage:true});}
try{
 await mkdir('artifacts/strategy',{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:900}});watch(page,'desktop');await boot(page);
 await build(page,'archer',0);await build(page,'archer',1);const first=(await state(page)).towers.find(t=>t.padId===0);await selectTower(page,first.id);
 for(const mode of ['last','strongest','fastest','first','strongest']){await page.locator('#targeting-select').selectOption(mode);await page.waitForFunction(({id,mode})=>window.__MOSSGUARD__.towers.find(t=>t.id===id)?.targeting===mode,{id:first.id,mode});assert.equal(await page.locator('#targeting-select').inputValue(),mode);}
 checks.push('All four targeting priorities update the selected tower and visible control');
 assert.equal(await page.locator('#move-tower').count(),0,'Tower relocation has no UI control');
 const before=await state(page);const empty=before.pads.find(p=>p.id===2),box=await page.locator('#battlefield canvas').boundingBox();
 const pixel=await page.locator('#battlefield canvas').evaluate((canvas,p)=>{const v=window.__MOSSGUARD__.view,b=canvas.getBoundingClientRect();return{x:b.x+(p.x-v.scrollX)*v.renderScale*v.zoom/canvas.width*b.width,y:b.y+(p.y-v.scrollY)*v.renderScale*v.zoom/canvas.height*b.height};},empty);assert(box);await page.mouse.click(pixel.x,pixel.y);
 assert.deepEqual((await state(page)).towers,before.towers,'Inspecting another foundation cannot relocate a tower');assert.equal((await state(page)).gold,before.gold);
 checks.push('Placed defenses remain fixed and no relocation controls are exposed');
 await selectTower(page,first.id);assert.equal(await page.locator('#upgrade').isDisabled(),true);await page.locator('#battlefield').focus();await page.keyboard.press('u');assert.equal((await state(page)).towers.find(t=>t.id===first.id).level,1,'Upgrade hotkey respects the wave-clear gate');
 await clearNextWave(page);await selectTower(page,first.id);const ready=await state(page);await page.locator('#battlefield').focus();await page.keyboard.press('u');await page.waitForFunction(id=>window.__MOSSGUARD__.towers.find(t=>t.id===id)?.level===2,first.id);const upgraded=await state(page),tower=upgraded.towers.find(t=>t.id===first.id);assert.equal(upgraded.gold,ready.gold-55);assert.equal(tower.padId,0);
 checks.push('Upgrade hotkeys require a genuine clear, charge the tier price, and preserve the foundation');
 await page.keyboard.press('x');await page.waitForFunction(id=>!window.__MOSSGUARD__.towers.some(t=>t.id===id),first.id);const sold=await state(page);assert.equal(sold.gold,upgraded.gold+Math.floor(tower.spent*.7));await build(page,'archer',2);const rebuilt=await state(page);assert.equal(rebuilt.gold,sold.gold-80);assert(rebuilt.towers.some(t=>t.padId===2&&t.id!==first.id));assert(!rebuilt.towers.some(t=>t.id===first.id));
 checks.push('Changing placement requires selling and paying for a newly built defense');
 for(const speed of [2,3,1]){await page.locator('#speed').click();assert.equal((await state(page)).speed,speed);}
 await page.locator('#battlefield').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>window.__MOSSGUARD__.status==='wave');await page.keyboard.press('p');await page.waitForFunction(()=>window.__MOSSGUARD__.paused);const frozen=await state(page);await page.waitForTimeout(200);assert.equal((await state(page)).time,frozen.time);await page.keyboard.press('p');await page.waitForFunction(()=>!window.__MOSSGUARD__.paused);checks.push('Speed and wave/pause hotkeys remain usable after strategic actions');await shot(page,'desktop-strategy');await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});watch(mobile,'mobile');await boot(mobile);await build(mobile,'archer',0,true);await mobile.locator('#targeting-select').selectOption('fastest');assert.equal((await state(mobile)).towers[0].targeting,'fastest');assert.equal(await mobile.locator('#move-tower').count(),0);const bounds=await mobile.locator('#targeting-select').evaluate(el=>({width:innerWidth,page:document.documentElement.scrollWidth,box:el.getBoundingClientRect().toJSON()}));assert(bounds.page<=bounds.width);assert(bounds.box.width>=44&&bounds.box.height>=44);await shot(mobile,'phone-strategy');await mobile.close();checks.push('Phone targeting retains usable touch controls and fixed tower placement');
 assert.deepEqual(errors,[]);console.log(`PASS: ${checks.length} strategy checks\n${checks.map(c=>`  ✓ ${c}`).join('\n')}`);
}catch(error){const page=browser.contexts().flatMap(c=>c.pages()).at(-1);if(page)await shot(page,'failure').catch(()=>{});throw error;}finally{await browser.close();}
