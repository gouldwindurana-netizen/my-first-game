import { enterBattle } from './play-helpers.mjs';
/** Verify that battle controls remain reachable without page scrolling, including native fullscreen. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base=process.env.FIT_BASE||process.env.GAME_URL||'http://127.0.0.1:4173/my-first-game/';
const executablePath=process.env.CHROMIUM_PATH||(existsSync(chromium.executablePath())?undefined:'/usr/bin/chromium');
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']});
const output=path.resolve('artifacts/viewport-fit');
const checks=[],errors=[];
await mkdir(output,{recursive:true});
async function metrics(page,label){
 await page.waitForFunction(()=>{const field=document.querySelector('#battlefield'),canvas=field?.querySelector('canvas');return canvas&&Math.abs(canvas.getBoundingClientRect().height-field.clientHeight)<2;});
 const m=await page.evaluate(()=>{
  const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
  return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,field:rect('#battlefield'),dock:rect('.tower-dock'),wave:rect('#start-wave'),pause:rect('#pause'),fullscreen:rect('#fullscreen'),cards:[...document.querySelectorAll('[data-tower]')].map(el=>({box:el.getBoundingClientRect().toJSON(),text:el.querySelector('.tower-info').getBoundingClientRect().toJSON()}))};
 });
 assert(m.pageWidth<=m.width,`${label}: no horizontal page overflow`);
 assert(m.pageHeight<=m.height+1,`${label}: no vertical page scrolling`);
 for(const name of ['field','dock','wave','pause','fullscreen']){
  const b=m[name];assert(b.x>=-1&&b.y>=-1&&b.right<=m.width+1&&b.bottom<=m.height+1,`${label}: ${name} stays in viewport: ${JSON.stringify(b)}`);
 }
 assert(m.field.width>=250&&m.field.height>=150,`${label}: field keeps usable dimensions`);
 for(const c of m.cards){assert(c.box.height>=44,`${label}: tower card target is at least 44px`);assert(c.text.top>=c.box.top-1&&c.text.bottom<=c.box.bottom+1&&c.text.left>=c.box.left-1&&c.text.right<=c.box.right+1,`${label}: tower name fits its card`);}
 assert(m.wave.height>=44&&m.pause.height>=44&&m.fullscreen.height>=44,`${label}: combat controls keep 44px targets`);
 checks.push(`${label}: field, tower dock, wave action and controls fit without page scrolling`);
}
try{
 for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[1024,600],[834,1112],[844,390],[740,360],[568,320],[390,844],[320,568]]){
  const label=`${width}×${height}`,page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',e=>errors.push(`${label}: ${e.message}`));
  try{
   await page.goto(base);await page.waitForSelector('#battlefield[data-ready="true"]');await enterBattle(page);await page.evaluate(()=>document.fonts.ready);await metrics(page,label);
   await page.locator('[data-tower="archer"]').click();
   const site=page.locator('[data-foundation="0"]');await site.scrollIntoViewIfNeeded();
   const box=await site.boundingBox();assert(box&&box.height>=44&&box.width>=44,`${label}: named foundation has 44px target`);await site.click();
   await page.waitForFunction(()=>window.__MOSSGUARD__.towers.length===1);
   if(await page.locator('#close-inspection').isVisible())await page.locator('#close-inspection').click();
   else await page.keyboard.press('Escape');
   await metrics(page,`${label} after building`);
   if([1366,1280,844,390,320].includes(width)){
    await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await metrics(page,`${label} fullscreen`);
    assert.equal(await page.evaluate(()=>window.__MOSSGUARD__.towers.length),1,`${label}: fullscreen preserves defense`);
    await page.screenshot({path:path.join(output,`${width}x${height}-fullscreen.png`)});
    await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.fullscreenElement);
    await metrics(page,`${label} after fullscreen`);
   }
   await page.screenshot({path:path.join(output,`${width}x${height}.png`)});
  }catch(error){await page.screenshot({path:path.join(output,`${width}x${height}-failure.png`)}).catch(()=>{});throw error;}
  finally{await page.close();}
 }
 assert.deepEqual(errors,[],'No browser exceptions');console.log(checks.map(s=>`PASS ${s}`).join('\n'));console.log(`Passed ${checks.length} viewport-fit checks.`);
}finally{await browser.close();}
