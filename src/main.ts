import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import Phaser from 'phaser';
import './style.css';
import './platform.css';
import './readability.css';
import './game-layout.css';
import './campaign.css';
import './unit-preview.css';
import './strategy.css';
import './viewport-fit.css';
import './expansion.css';
import { installPlatformLifecycle, focusBattlefield } from './platform';
import { GameModel, LEVELS, TOWER_DEFS, TARGET_MODES, type TowerTargetMode, type TowerKind } from './game/model';
import { GroveScene, type SceneBridge } from './render/scene';
import { icon } from './pack-icons';
import { towerArt } from './asset-art';
import { GameAudio } from './audio';
import { LEVEL_ART } from './level-art';
import { UnitPreview } from './unit-preview';
import { TOWER_KINDS, BRANCH_KEYS, ENEMY_DEFS, ENEMY_KINDS, type TowerBranchKey } from './game/catalog';
import { Progression, SKILL_NODES, CAPSTONES, SHOP_ITEMS } from './game/progression';
import { ProgressionUI } from './progression-ui';
import { MainMenu } from './main-menu';

let saveStorage:Storage|null=null;
try{saveStorage=window.localStorage;}catch{/* Progression remains available for this session. */}
const progression = new Progression(saveStorage,LEVELS.map(level=>level.id));
const model = new GameModel();
function applyProgression(){model.setProgression(progression.bonuses,progression.unlockedTowers,progression.unlockedCapstones);}
applyProgression();
try{const difficulty=saveStorage?.getItem('mossguard-difficulty');if(['easy','normal','hard','hell'].includes(difficulty||''))model.setDifficulty(difficulty as 'easy'|'normal'|'hard'|'hell');}catch{/* Optional save. */}
model.reset();
const $ = <T extends HTMLElement = HTMLElement>(id:string):T => document.getElementById(id) as T;
const KINDS:readonly TowerKind[]=TOWER_KINDS;
const targetingHints:Record<TowerTargetMode,string>={first:'Furthest along the road.',last:'Closest to the entrance.',strongest:'Most remaining health.',fastest:'Fastest current movement, including slows.'};
const roles=Object.fromEntries(KINDS.map(kind=>[kind,TOWER_DEFS[kind].role])) as Record<TowerKind,string>;
const catalogSnapshot=JSON.stringify({towers:TOWER_KINDS.map(kind=>({kind,...TOWER_DEFS[kind]})),enemies:ENEMY_KINDS.map(kind=>({kind,...ENEMY_DEFS[kind]})),skills:SKILL_NODES,capstones:CAPSTONES,shop:SHOP_ITEMS});
const app = $('app');
app.innerHTML = `
<header id="top" class="site-header">
 <a class="brand" href="#top" aria-label="Mossguard home"><span class="brand-mark">${icon('shield')}</span><span>MOSSGUARD<small>CHRONICLES OF THE RIFT</small></span></a>
 <nav aria-label="Game navigation"><button id="levels-open" class="nav-active" title="Choose battlefield">${icon('map')} Battlefields</button><button id="guide-nav">${icon('book')} Field guide <span class="key">?</span></button></nav>
 <div class="header-right"><span class="edition" id="header-wallet">0 XP · 0 gems</span><button class="icon-button" id="sound" aria-label="Enable sound" title="Toggle sound">${icon('mute')}</button><button class="icon-button" id="settings-open" aria-label="Open settings">${icon('settings')}</button></div>
</header>
<main>
 <section class="mission-heading"><div class="mission-title"><span class="chapter-seal" id="chapter-seal">I</span><div><div class="eyebrow"><span id="chapter-label">THE FALLEN KINGDOM / CHAPTER 01</span></div><h1>Ruins of Eldervale</h1></div></div><div class="mission-meta"><span class="difficulty"><i></i> NORMAL</span><button id="how-to" class="text-button">${icon('book')} How to play ${icon('chevron')}</button></div></section>
 <section id="game-shell" class="game-shell" aria-label="Tower defense game">
  <div class="battle-column">
   <div class="battle-bar"><div class="resources"><div class="resource health">${icon('heart')}<span><small>STRONGHOLD</small><b id="lives">20 / 20</b></span></div><div class="resource coins">${icon('gold')}<span><small>TREASURY</small><b id="gold">240</b></span></div><div class="resource mana">${icon('crystal')}<span><small>TOWERS BUILT</small><b id="built">0 / 8</b></span></div></div><div class="wave-badge">${icon('skull')}<span>WAVE <b id="wave">00 / 6</b></span></div><button id="main-menu-open" class="map-button" aria-label="Open main menu" title="Main menu">⌂</button><button id="wave-preview-open" class="map-button" aria-label="Preview next wave" title="Enemy types and counts">?</button><div class="map-controls"><button id="pause" class="map-button" aria-label="Pause game" title="Pause (P)">${icon('pause')}</button><button id="speed" class="map-button speed" title="Cycle game speed: 1×, 2×, 3×">1×</button></div></div>
   <div class="battlefield-wrap">
    <div id="battlefield" tabindex="0" role="application" aria-label="Ruins of Eldervale battlefield. Choose a tower then click a glowing stone foundation to build. Keyboard: 1–9 select tower, Space next wave, P pause, F Starfall."></div>
    <div class="view-controls" role="group" aria-label="Battlefield view"><button id="zoom-out" aria-label="Zoom out" title="Zoom out (−)">−</button><span id="zoom-level" class="zoom-label" aria-live="polite">100%</span><button id="zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button><button id="fullscreen" aria-label="Enter fullscreen" aria-pressed="false" title="Fullscreen">${icon('expand')}</button></div>
    <div class="map-label"><span class="map-pin"></span> ELDER VALE <span class="map-divider"></span><span>THE WESTERN RIFT</span></div>
    <div class="field-rail"><button id="rail-towers" title="Select a tower">${icon('shield')}<span>TOWERS</span></button><button id="rail-skills" title="Cast Starfall (F)">${icon('bolt')}<span>SKILLS</span></button><button id="rail-map" aria-pressed="false" title="Toggle tactical ranges (M)">${icon('map')}<span>MAP</span></button><button id="rail-levels" title="Choose battlefield">${icon('map')}<span>LEVELS</span></button><button id="rail-settings" title="Settings">${icon('settings')}<span>OPTIONS</span></button></div>
    <div id="toast" role="status" class="toast">Choose a tower, then a stone foundation.</div>
    <button id="meteor" class="ability" title="Starfall: 145 area damage. 25 second cooldown. (F)"><span class="ability-icon">${icon('meteor')}</span><span><b>Starfall</b><small id="meteor-status">READY TO CAST</small></span><span class="key">F</span></button>
    <div class="map-scale"><span>✦</span> N</div>
    <div id="pause-overlay" class="pause-overlay" hidden><span class="eyebrow">THE BATTLE IS PAUSED</span><h2>Even wardens need a moment.</h2><button id="resume" class="primary">${icon('play')} Resume defense</button><button id="pause-menu" class="primary">Main menu</button></div>
   </div>
   <div class="battle-footer"><span><i class="status-dot"></i><b id="battle-state">Prepare your defenses</b></span><span id="remaining">Hold the road. Defend the stronghold.</span></div>
  </div>
  <aside class="build-panel"><div class="panel-heading"><span class="eyebrow">WARDEN’S COMMAND</span><span class="panel-ornament">✦</span></div><div class="context-panel" id="context"></div><div class="next-wave"><div class="next-label"><span>INCOMING WAVE</span><span id="bonus"></span></div><h3 id="next-name">Footsteps in the fern</h3><p id="wave-description">Scouts approach the western rift.</p><button id="start-wave" class="primary wave-button"><span>${icon('play')} Send first wave</span><span class="key">SPACE</span></button></div><div class="panel-foot">${icon('shield')} The kingdom still stands with you.</div></aside>
  <section class="tower-dock" aria-label="Build towers"><div class="dock-heading"><span class="dock-emblem">${icon('shield')}</span><span><b>TOWERS</b><small>SELECT YOUR DEFENSE</small></span></div><button id="tower-prev" class="dock-scroll" aria-label="Previous towers">‹</button><div class="tower-list">${KINDS.map((kind,i)=>`<button class="tower-card ${kind}" data-tower="${kind}" aria-label="Select ${TOWER_DEFS[kind].name}, ${TOWER_DEFS[kind].cost} gold"><span class="tower-key">${i<9?i+1:"✦"}</span><span class="tower-art">${towerArt(kind)}</span><span class="tower-info"><b>${TOWER_DEFS[kind].name}</b><span>${roles[kind]}</span></span><span class="tower-cost">${icon('gold')}${TOWER_DEFS[kind].cost}</span></button>`).join('')}</div><button id="tower-next" class="dock-scroll" aria-label="More towers">›</button><div class="dock-tip">${icon('mouse')}<span>Choose a tower.<br>Claim a foundation.</span></div></section>
  <section id="foundation-picker" class="foundation-picker" hidden aria-label="Choose tower foundation"></section>
  <button class="minimap-panel" id="minimap-toggle" title="Toggle tactical map ranges"><div class="minimap-label"><span>ELDERVALE</span><b>STAGE 01</b></div><div class="minimap"><svg viewBox="0 0 1100 680" aria-hidden="true"><polyline points="${model.path.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#e9cd8d" stroke-width="8" opacity=".6"/><g id="mini-units"></g></svg><span class="minimap-corners"></span></div></button>
 </section>
 <footer class="site-footer"><span>${icon('spark')} Seventeen disciplines. Twelve stages.</span><div class="shortcuts"><span><kbd>1—9</kbd> Towers</span><span><kbd>P</kbd> Pause</span><span><kbd>M</kbd> Tactical map</span><span><kbd>ESC</kbd> Cancel</span></div><span id="record">Twelve stages. Stand your ground.</span></footer>
</main>
<div class="modal-backdrop" id="guide" hidden><section class="modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><button class="modal-close icon-button" id="close-guide" aria-label="Close field guide">${icon('close')}</button><span class="eyebrow">THE WARDEN’S HANDBOOK</span><h2 id="guide-title">A kingdom worth defending.</h2><p class="modal-intro">The rift has opened beneath the old citadel. Stop the Hollow from reaching your stronghold. Choose from twelve stages and four difficulties. Clear every wave, earn stars, and invest XP and gems between defenses.</p><div class="guide-steps"><div><span>01</span><h3>Reclaim the ruins</h3><p>Choose a tower from the bottom bar, then click a glowing stone foundation. Every site covers a different stretch of road.</p></div><div><span>02</span><h3>Master seventeen disciplines</h3><p>Physical shots meet armor; elemental attacks meet resistance. Trees block direct shots. Mortars arc over them. Barracks soldiers block ground enemies; finite-use traps belong on the road. Arrow II lanterns and Ice II lenses reveal hidden foes for allies. Magic spires detect immediately; no gems are required. Check the ? scout report before hidden waves.</p></div><div><span>03</span><h3>Forge your defense</h3><p>Defeat enemies to earn gold. Earn battlefield experience to reach tier II, then choose A, B, or C. Hell difficulty adds D. Choose permanent tower positions, set soldier rally points, or rearm a trap. Tier II unlocks after the first clear; specializations unlock later in the level. Selling returns 70% of investment.</p></div><div><span>04</span><h3>Call down Starfall</h3><p>Press F, then target the road for 145 area damage. The spell recharges in 25 seconds. Press M to see tactical ranges.</p></div></div><div class="guide-note">${icon('gold')} Send the next wave within 12 seconds of a clear for up to 24 bonus gold.</div><button id="units-open">${icon('eye')} Preview walking units</button><button id="guide-done" class="primary">For Eldervale ${icon('arrow')}</button></section></div>
<div class="modal-backdrop" id="unit-preview" hidden><section class="modal unit-preview-modal" role="dialog" aria-modal="true" aria-labelledby="unit-preview-title"><button class="modal-close icon-button" id="unit-preview-close" aria-label="Close walking preview">${icon('close')}</button><span class="eyebrow">THE HOLLOW ON THE MARCH</span><h2 id="unit-preview-title">Every step has weight.</h2><p class="modal-intro">Inspect the walking cycles used in battle. Legs alternate their footing while arms, weapons, and armor follow the stride.</p><div class="unit-preview-grid" id="unit-preview-list"></div><div class="unit-preview-controls"><button id="preview-play" aria-pressed="false">Pause walking cycles</button><button id="preview-slow" aria-pressed="false">Slow motion</button></div><p id="preview-status"></p><button id="units-done" class="primary">Return to field guide ${icon('arrow')}</button></section></div>
<div class="modal-backdrop" id="campaign" hidden><section class="modal campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-title"><button class="modal-close icon-button" id="close-campaign" aria-label="Close battlefields">${icon('close')}</button><span class="eyebrow">THE ROAD BEYOND ELDERVALE</span><h2 id="campaign-title">Choose your battlefield</h2><p id="campaign-note" class="modal-intro">Each battlefield has its own route and enemy waves. Changing maps starts a fresh defense.</p><div class="campaign-grid" id="level-list"></div><button id="campaign-done" class="primary">Return to defense ${icon('arrow')}</button></section></div>
<div class="modal-backdrop" id="settings" hidden><section class="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button class="modal-close icon-button" id="close-settings" aria-label="Close settings">${icon('close')}</button><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2 id="settings-title">Warden’s settings</h2><label class="setting-row"><span><b>Sound effects</b><small>Spells, rewards, and tower construction</small></span><input type="checkbox" id="sound-setting"/></label><label class="setting-row"><span><b>Reduced motion</b><small>Keep walking, recoil, and ambient motion still</small></span><input type="checkbox" id="motion-setting"/></label><button id="settings-done" class="primary">Return to battle ${icon('arrow')}</button></section></div>
<div class="modal-backdrop" id="result" hidden><section class="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="result-emblem">${icon('shield')}</div><span id="result-eyebrow" class="eyebrow"></span><h2 id="result-title"></h2><p id="result-copy"></p><div class="result-stats"><div><b id="result-waves"></b><small>WAVES FACED</small></div><div><b id="result-kills"></b><small>FOES DEFEATED</small></div><div><b id="result-health"></b><small>STRONGHOLD HEALTH</small></div></div><button id="next-level" class="primary" hidden>${icon('arrow')} Next battlefield</button><button id="restart" class="primary">${icon('restart')} Defend again</button><button id="inspect" class="text-button">View the battlefield</button></section></div>
`;

app.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="wave-preview" hidden><section class="modal wave-preview-modal" role="dialog" aria-modal="true" aria-labelledby="wave-preview-title"><button id="wave-preview-close" class="modal-close" aria-label="Close wave preview">×</button><span class="eyebrow">SCOUT REPORT</span><h2 id="wave-preview-title">Incoming wave</h2><div id="wave-preview-content"></div><button id="wave-preview-done" class="primary">Return to defense</button></section></div>`);
$('start-wave').insertAdjacentHTML('beforebegin','<p id="stealth-advisory" class="stealth-advisory" hidden></p>');
$('level-list').insertAdjacentHTML('beforebegin',`<div class="campaign-tools"><label>Difficulty · starts a fresh defense<select id="difficulty-select"><option value="easy">Easy</option><option value="normal">Normal (Medium)</option><option value="hard">Hard</option><option value="hell">Hell</option></select></label><button id="progression-open">Skill tree & shop</button></div><p id="difficulty-hint" class="difficulty-hint"></p><p class="campaign-rewards">Stars: 3 at 90% lives, 2 at 50%, otherwise 1. Each stage ends in a boss.</p>`);
$('settings-done').insertAdjacentHTML('beforebegin',`<label class="setting-row"><span><b>Automatic waves</b><small>Send the next wave 3 seconds after a clear</small></span><input type="checkbox" id="auto-wave"/></label><button id="settings-progression" class="primary">Skill tree, capstones & gem shop</button>`);
$('settings-done').insertAdjacentHTML('afterend','<button id="settings-menu" class="primary">Main menu</button>');
document.querySelector('.site-header nav')!.insertAdjacentHTML('beforeend','<button id="meta-open">Legacy & shop</button>');

// Fixed dialogs must share the fullscreen subtree to remain visible during battle.
for(const id of ['guide','settings','result','campaign','unit-preview','wave-preview'])$('game-shell').appendChild($(id));
$('context').after($('minimap-toggle'));
$('context').before($('foundation-picker'));
const closeInspection=document.createElement('button');
closeInspection.id='close-inspection';
closeInspection.className='close-inspection';
closeInspection.setAttribute('aria-label','Close tower details');
closeInspection.innerHTML=`${icon('close')}<span>Back to battlefield</span>`;
$('context').before(closeInspection);
closeInspection.addEventListener('click',()=>{selectedKind=null;selectedPad=null;rallyTowerId=null;syncSelection();focusBattlefield();});

let selectedPad:number|null=null, selectedKind:TowerKind|null=null, meteorArmed=false,  rallyTowerId:number|null=null;
let metaPaused=false,previewPaused=false;
type MenuPage='campaign'|'skills'|'settings'|'guide';
let menuPage:MenuPage|null=null;
let runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
let resultShown=false, guidePaused=false, settingsPaused=false, campaignPaused=false, lastSignature='', lastStatus=model.status;
let lastFoundationSignature='';
let toastTimer: ReturnType<typeof setTimeout>;
const effects=new GameAudio();
let sound=false, loadingAudio=false, lastKills=0, lastShotId=0;

const bridge:SceneBridge={model,selectedPad,selectedKind,meteorArmed,tactical:false,reduceMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,onPad,onGround,onTick:tick};
const unitPreview=new UnitPreview(()=>bridge.reduceMotion);
const game = new Phaser.Game({type:Phaser.CANVAS,parent:'battlefield',backgroundColor:'#091724',...getRenderSize(),transparent:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},scene:[new GroveScene(bridge)],banner:false});
const progressionPanel=new ProgressionUI(progression,{
 onOpen:()=>{metaPaused=model.paused;model.paused=true;},
 onClose:()=>{if(returnToMainMenu('skills'))return;model.paused=metaPaused;tick();focusBattlefield();},
 onChange:()=>{if(model.wave===0&&model.towers.length===0){const paused=model.paused;applyProgression();model.reset();model.paused=paused;}lastSignature='';tick();},
});
$('game-shell').appendChild(progressionPanel.element);
const mainMenu=new MainMenu($('game-shell'),{
 onCampaign:()=>openMenuPage('campaign'),
 onContinue:continueFromMenu,
 onSkills:()=>openMenuPage('skills'),
 onSettings:()=>openMenuPage('settings'),
 onGuide:()=>openMenuPage('guide'),
});
function hasLiveDefense(){return !['won','lost'].includes(model.status)&&(model.wave>0||model.towers.length>0);}
function showMainMenu(){
 if(mainMenu.isOpen)return;
 model.paused=true;selectedKind=null;selectedPad=null;meteorArmed=false;rallyTowerId=null;
 bridge.selectedKind=null;bridge.selectedPad=null;bridge.meteorArmed=false;bridge.trapArmed=false;bridge.rallyTowerId=null;
 mainMenu.show({canResume:hasLiveDefense(),hasProgress:Object.keys(progression.state.stages).length>0||progression.totalRanks>0,completed:LEVELS.filter(level=>progression.stageProgress(level.id,model.difficulty)?.cleared).length,total:LEVELS.length,xp:progression.xp,gems:progression.gems,difficulty:model.difficulty,canChooseStage:model.status!=='wave'});
 tick();
}
function openMenuPage(page:MenuPage){
 mainMenu.hide();menuPage=page;
 if(page==='campaign')openCampaign();else if(page==='skills')openProgression();else if(page==='settings')openSettings();else openGuide();
}
function returnToMainMenu(page:MenuPage){
 if(menuPage!==page)return false;
 menuPage=null;showMainMenu();return true;
}
function continueFromMenu(){
 mainMenu.hide();menuPage=null;
 if(hasLiveDefense()){model.paused=false;syncSelection();focusBattlefield();return;}
 const next=LEVELS.findIndex(level=>!progression.stageProgress(level.id,model.difficulty)?.cleared);
 if(model.selectLevel(next<0?0:next)){applyProgression();model.reset();resetSelection();updateLevelLabels();focusBattlefield();}
}
function syncBattleInteractivity(){
 const blocked=mainMenu.isOpen||['guide','settings','campaign','unit-preview','wave-preview','progression','result'].some(id=>!$(id).hidden);
 for(const element of document.querySelectorAll<HTMLElement>('.battle-column,.build-panel,.tower-dock,.site-header,.mission-heading'))element.inert=blocked;
}

function openProgression(tab:'skills'|'capstones'|'shop'|'bestiary'='skills'){
 if(menuPage!==null)menuPage='skills';
 if(!$('campaign').hidden)closeCampaign();if(!$('settings').hidden)closeSettings();
 if(!$('guide').hidden||!$('unit-preview').hidden||!$('wave-preview').hidden||!$('result').hidden)return;
 progressionPanel.open(tab);tick();
}
function openWavePreview(){
 if(progressionPanel.isOpen||!$('campaign').hidden||!$('settings').hidden||!$('guide').hidden||!$('unit-preview').hidden||!$('wave-preview').hidden)return;
 previewPaused=model.paused;model.paused=true;
 const next=model.nextWave(),counts=new Map<string,{count:number;mini:number}>();
 for(const entry of next?.enemies||[]){const value=counts.get(entry.kind)||{count:0,mini:0};value.count++;if(entry.miniBoss)value.mini++;counts.set(entry.kind,value);}
 setText('wave-preview-title',next?`Wave ${model.wave+1}: ${next.name}`:'All waves repelled');
 $('wave-preview-content').innerHTML=`<p>${next?.description||'The stage is secured.'}</p><p>${model.difficulty.toUpperCase()} · ${next?.enemies.length||0} enemies · ${model.autoWave?'Automatic waves enabled':'Manual waves'}</p><div class="wave-enemy-list">${[...counts].map(([kind,value])=>`<article><strong>${ENEMY_DEFS[kind as keyof typeof ENEMY_DEFS].name}</strong><span>× ${value.count}${value.mini?` · ${value.mini} mini-boss`:''}${ENEMY_DEFS[kind as keyof typeof ENEMY_DEFS].stealth?' · Hidden':''}</span></article>`).join('')}</div>${detectionPlan()}`;
 $('wave-preview-content').querySelectorAll<HTMLButtonElement>('[data-detection-option]').forEach(button=>button.addEventListener('click',()=>{
  const tower=model.towers.find(item=>item.id===Number(button.dataset.detectionTower));
  closeWavePreview();
  if(tower){selectedKind=null;selectedPad=tower.padId;syncSelection();sceneView()?.focusSite(tower.padId);$('upgrade')?.focus();}
  else chooseTower(button.dataset.detectionOption as TowerKind);
 }));
 $('wave-preview').hidden=false;$('wave-preview-close').focus();tick();
}
function closeWavePreview(){if($('wave-preview').hidden)return;$('wave-preview').hidden=true;model.paused=previewPaused;tick();$('wave-preview-open').focus();}
function detectionPlan(){
 const briefing=model.stealthBriefing();if(!briefing)return '';
 return `<section id="detection-plan" class="detection-plan" aria-label="Prepare for hidden enemies"><h3>Hidden enemies · wave ${briefing.wave}</h3><p>${briefing.groups.map(group=>`${group.count} ${group.name}`).join(' · ')}. Detection reveals enemies to all towers in the detector’s range. ${briefing.hasDetector?'Keep their route inside your detection coverage.':'Prepare a detector before sending this wave.'} Truesight is an optional premium specialist.</p><div class="detection-options">${briefing.options.map(option=>`<button data-detection-option="${option.kind}" ${option.towerId!==undefined?`data-detection-tower="${option.towerId}"`:''}><strong>${option.name} · ${option.cost} gold</strong><span>${option.action==='upgrade'?'Inspect existing tower':option.action==='build-upgrade'?'Build base, then train one wave':'Select blueprint'} · ${option.affordable?'Gold available':`Need ${Math.max(0,option.cost-model.gold)} more gold`}</span><small>${option.reason}</small></button>`).join('')}</div></section>`;
}
function syncSelection(){bridge.selectedPad=selectedPad;bridge.selectedKind=selectedKind;bridge.meteorArmed=meteorArmed;bridge.trapArmed=selectedKind==='trap';bridge.rallyTowerId=rallyTowerId;$('battlefield').classList.toggle('casting',meteorArmed);$('meteor').classList.toggle('armed',meteorArmed);document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b=>{const active=b.dataset.tower===selectedKind;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});lastSignature='';renderFoundationPicker();tick();}
function toast(message:string){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function getRenderScale(){return Math.min(2,Math.max(1,Math.ceil(Math.max(window.devicePixelRatio||1,$('battlefield').clientWidth/1100))));}
function sceneView():GroveScene|null{const scene=game.scene.getScene('grove') as GroveScene|undefined;return scene?.sys?.isActive()?scene:null;}
function getRenderSize(){const field=$('battlefield'),width=1100*getRenderScale();return{width,height:Math.round(width*(field.clientHeight||680)/(field.clientWidth||1100))};}
function resizeGame(){const size=getRenderSize();if(game.scale.gameSize.width!==size.width||game.scale.gameSize.height!==size.height)game.scale.setGameSize(size.width,size.height);game.scale.refresh();}
function changeZoom(delta:number){const scene=sceneView();if(!scene)return;const zoom=scene.changeViewZoom(delta);effects.play('ui_click');if(zoom>1)toast('Drag the battlefield to pan. Press 0 to reset the view.');tick();}
async function toggleFullscreen(){
 const shell=$('game-shell');
 try{
  if(document.fullscreenElement===shell)await document.exitFullscreen();
  else if(shell.requestFullscreen)await shell.requestFullscreen();
  else{toast('Fullscreen is unavailable in this browser. Use the zoom controls for a closer view.');return;}
  requestAnimationFrame(resizeGame);
 }catch{toast('Fullscreen is unavailable here. Use the zoom controls for a closer view.');}
}

function chooseTower(kind:TowerKind){
 if(mainMenu.isOpen||menuPage!==null)return;
 if(model.status==='won'||model.status==='lost')return;
 if(!model.isUnlocked(kind)){openProgression('shop');return;}
 rallyTowerId=null;selectedKind=selectedKind===kind?null:kind;
 if(selectedKind)revealTower(selectedKind);selectedPad=null;meteorArmed=false;syncSelection();
 if(selectedKind)toast(kind==='trap'?'Place a trap on the road, or choose a nearby named site.':`Choose a foundation for ${TOWER_DEFS[kind].name}.`);
 effects.play('ui_click');
}
function onPad(id:number){
 focusBattlefield();if(model.paused||progressionPanel.isOpen||!$('guide').hidden||!$('campaign').hidden||!$('unit-preview').hidden||!$('wave-preview').hidden)return;

 selectedPad=id;const existing=model.towers.find(t=>t.padId===id);
 if(selectedKind&&(!existing||selectedKind==='trap')){
  if(model.build(id,selectedKind)){selectedPad=model.towers.at(-1)!.padId;toast(`${TOWER_DEFS[selectedKind].name} ready.`);selectedKind=null;effects.play('build');}
  else toast('Check gold, site availability, and tower unlocks.');
 }else if(existing)selectedKind=null;
 rallyTowerId=null;syncSelection();
}
function onGround(x:number,y:number){
 focusBattlefield();if(model.paused||progressionPanel.isOpen||!$('wave-preview').hidden)return;
 if(rallyTowerId!==null){if(model.setRally(rallyTowerId,x,y)){toast('Rally point set. Soldiers will move there.');rallyTowerId=null;}else toast('Choose a point on the road within the barracks rally range.');syncSelection();return;}

 if(selectedKind==='trap'){
  if(model.buildTrap(x,y)){selectedPad=model.towers.at(-1)!.padId;selectedKind=null;effects.play('build');toast('Trap armed. It has limited charges and can be rearmed.');}
  else toast('Place the trap on or near the road, away from another trap.');syncSelection();return;
 }
 if(meteorArmed){if(model.meteor(x,y)){toast('Starfall!');effects.play('cannon');}else toast('Starfall is available during an active wave.');meteorArmed=false;syncSelection();}
 else if(selectedPad!==null){selectedPad=null;syncSelection();}
}
function armMeteor(){if(model.paused||model.status!=='wave'||model.meteorCooldown>0)return;meteorArmed=!meteorArmed;rallyTowerId=null;selectedKind=null;selectedPad=null;syncSelection();toast(meteorArmed?'Choose a target on the path. Escape to cancel.':'Starfall cancelled.');}
function pause(){if(mainMenu.isOpen||menuPage!==null)return;if(!($('guide').hidden)||!$('settings').hidden||!$('campaign').hidden||!$('unit-preview').hidden||progressionPanel.isOpen||!$('wave-preview').hidden||model.status==='won'||model.status==='lost')return;model.paused=!model.paused;meteorArmed=false;syncSelection();effects.play('ui_click');}
function startWave(){if(mainMenu.isOpen||menuPage!==null)return;if(model.status==='won'||model.status==='lost'){restart();return;}if(model.startWave()){rallyTowerId=null;selectedPad=null;selectedKind=null;meteorArmed=false;syncSelection();toast(`Wave ${model.wave} — ${model.waves[model.wave-1].name}`);effects.play('wave_start');}}
function openGuide(){if(!$('guide').hidden||!$('settings').hidden||!$('campaign').hidden||!$('unit-preview').hidden||progressionPanel.isOpen||!$('wave-preview').hidden)return;guidePaused=model.paused;model.paused=true;$('guide').hidden=false;$('close-guide').focus();tick();}
function openUnitPreview(){if($('guide').hidden)return;$('guide').hidden=true;$('unit-preview').hidden=false;unitPreview.open();$('unit-preview-close').focus();tick();}
function closeUnitPreview(){if($('unit-preview').hidden)return;unitPreview.close();$('unit-preview').hidden=true;$('guide').hidden=false;$('units-open').focus();tick();}
function closeGuide(){if($('guide').hidden)return;$('guide').hidden=true;if(returnToMainMenu('guide'))return;model.paused=guidePaused;syncBattleInteractivity();if(document.fullscreenElement)focusBattlefield();else ($('guide-nav').getClientRects().length?$('guide-nav'):$('how-to')).focus();tick();}
function toggleTactical(){bridge.tactical=!bridge.tactical;$('rail-map').setAttribute('aria-pressed',String(bridge.tactical));$('minimap-toggle').classList.toggle('active',bridge.tactical);toast(bridge.tactical?'Tactical view: enemy route and tower ranges.':'Tactical view closed.');}
async function toggleSound(){
 if(loadingAudio)return;
 if(effects.enabled){effects.disable();sound=false;}
 else{
  loadingAudio=true;$('sound').setAttribute('aria-busy','true');$<HTMLButtonElement>('sound').disabled=true;$<HTMLInputElement>('sound-setting').disabled=true;
  sound=await effects.enable();
  loadingAudio=false;$('sound').removeAttribute('aria-busy');$<HTMLButtonElement>('sound').disabled=false;$<HTMLInputElement>('sound-setting').disabled=false;
  if(sound)effects.play('ui_click');
  else toast('Sound is unavailable here. The game is still playable.');
 }
 $('sound').innerHTML=icon(sound?'sound':'mute');$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$<HTMLInputElement>('sound-setting').checked=sound;
}
function openSettings(){if(!$('settings').hidden||!$('guide').hidden||!$('campaign').hidden||!$('unit-preview').hidden||progressionPanel.isOpen||!$('wave-preview').hidden)return;settingsPaused=model.paused;model.paused=true;$('settings').hidden=false;$<HTMLInputElement>('motion-setting').checked=bridge.reduceMotion;$('close-settings').focus();tick();}
function closeSettings(){if($('settings').hidden)return;$('settings').hidden=true;if(returnToMainMenu('settings'))return;model.paused=settingsPaused;syncBattleInteractivity();if(document.fullscreenElement)$('rail-settings').focus();else $('settings-open').focus();tick();}
function setText(id:string,text:string){const e=$(id);if(e.textContent!==text)e.textContent=text;}
function renderFoundationPicker(){
 const picker=$('foundation-picker');picker.hidden=!selectedKind;
 if(!selectedKind){if(picker.childElementCount)picker.replaceChildren();lastFoundationSignature='';return;}
 const kind=selectedKind,def=TOWER_DEFS[kind],cost=def.cost;
 const paused=model.paused||['won','lost'].includes(model.status);
 const signature=[model.level.id,kind,cost,model.gold>=cost,paused,model.towers.map(t=>t.padId).join(',')].join(':');
 if(lastFoundationSignature===signature)return;lastFoundationSignature=signature;
 picker.innerHTML=`<div class="foundation-heading"><b>Place ${def.name}</b><span>Choose a permanent foundation. Sell and rebuild to change your layout.</span></div><div class="foundation-sites">${model.pads.map(pad=>{const occupied=kind!=='trap'&&model.towers.some(t=>t.padId===pad.id);return `<button data-foundation="${pad.id}" ${occupied||model.gold<cost||paused?'disabled':''} aria-label="Build ${def.name} on ${pad.name}${occupied?', occupied':''}">${icon('shield')}<span>${pad.name}</span></button>`;}).join('')}</div><button id="cancel-foundation" aria-label="Cancel tower placement">${icon('close')} Cancel</button>`;
 picker.querySelectorAll<HTMLButtonElement>('[data-foundation]').forEach(button=>button.addEventListener('click',()=>{const id=Number(button.dataset.foundation);sceneView()?.focusSite(id);onPad(id);}));
 $('cancel-foundation').addEventListener('click',()=>{selectedKind=null;syncSelection();});
}
function renderContext(){
 const tower=model.towers.find(t=>t.padId===selectedPad),kind=tower?.kind||selectedKind;
 $('game-shell').classList.toggle('has-inspection',!!kind);renderFoundationPicker();
 const signature=[selectedPad,selectedKind,rallyTowerId,model.wave,tower?.level,tower?.branch,tower?.id,tower?.uses,tower?.shieldCharges,model.status,model.paused,model.difficulty].join(':');
 const terminal=['won','lost'].includes(model.status),unavailable=terminal||model.paused;
 if(lastSignature===signature){
  if(tower){
   const upgrade=$<HTMLButtonElement>('upgrade');if(upgrade)upgrade.disabled=tower.level>=3||unavailable||!model.getUpgradeGate(tower).allowed||(tower.level===1&&model.gold<model.upgradeCost(tower));
   document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(button=>{const key=button.dataset.branch as TowerBranchKey;button.disabled=unavailable||!model.getUpgradeGate(tower).allowed||model.gold<TOWER_DEFS[tower.kind].branches[key].cost||(key==='D'&&model.difficulty!=='hell');});
   const rearm=$<HTMLButtonElement>('rearm-trap');if(rearm)rearm.disabled=unavailable||model.gold<model.rearmCost(tower)||tower.uses===tower.maxUses;
  }return;
 }
 lastSignature=signature;
 if(!kind){
  $('context').innerHTML=`<div class="empty-command"><span class="eyebrow">${model.difficulty.toUpperCase()} DEFENSE</span><h2 class="empty-title">Hold the road.</h2><p>Physical attacks meet armor; elemental attacks meet resistance. Trees block direct shots. Mortars arc over cover.</p><div class="brief-row"><span><b>${model.waves.length}</b>WAVES</span><span><b>${model.pads.length}</b>FOUNDATIONS</span></div><p>Place towers at bends and crossings. Their sites are permanent. Skill branches strengthen your options for Hard and Hell.</p><button id="context-progression" class="context-journal">Skill tree & shop · ${progression.xp} XP · ${progression.gems} gems</button></div>`;
  $('context-progression').addEventListener('click',()=>openProgression());return;
 }
 const def=TOWER_DEFS[kind],level=tower?.level||1;
 const stats=tower?model.getTowerStats(tower):{damage:def.damage,range:def.range,interval:def.interval,damageType:def.damageType,effects:def.effects};
 const e=stats.effects;
 const tags=[stats.damageType, e.splash?`${Math.round(e.splash)} area`:null,e.chain?`${e.chain} chain`:null,e.pierce?`${e.pierce} pierce`:null,e.targets?`${e.targets} targets`:null,e.slow?`${Math.round(e.slow*100)}% slow`:null,e.stun?`${e.stun}s stun`:null,e.root?`${e.root}s root`:null,e.burnDps?'burn':null,e.poisonDps?'poison':null,e.knockback?'knockback':null,e.curse?'curse':null,e.armorShred?'armor shred':null,e.reveal?'reveals stealth':null,e.shield?`${tower?.shieldCharges??e.shield} shield charge`:null,e.auraDamage||e.auraHaste?'support aura':null].filter(Boolean).join(' · ');
 const specialization=tower?.branch?def.branches[tower.branch]:null;
 const tierName=level>=2?def.tier2Name:undefined,tierDescription=level>=2?def.tier2Description:undefined;
 const upgradeGate=tower?model.getUpgradeGate(tower):null;
 $('context').innerHTML=`<div class="tower-detail ${kind}"><div class="detail-header"><h2>${specialization?.name||tierName||def.name}</h2><span>${tower?`TIER ${level}${tower.branch?` · ${tower.branch}`:''}`:'BLUEPRINT'}</span></div><div class="tower-portrait">${towerArt(kind,level)}</div><div class="detail-role">${roles[kind]}</div><p class="detail-description">${specialization?.description||tierDescription||def.description}</p><div class="stat-list"><div><span>Damage</span><b>${Math.round(stats.damage)}</b></div><div><span>Range</span><b>${Math.round(stats.range)}</b></div><div><span>Fire interval</span><b>${stats.interval.toFixed(2)}s</b></div></div><p class="effect-summary">${tags}</p>${level===1&&def.tier2Name?`<p class="tier-unlock"><b>Tier II · ${def.tier2Name} · ${def.tier2Cost} gold</b><span>${def.tier2Description}</span></p>`:''}
 ${kind==='trap'?`<p class="trap-charges">${tower?`${tower.uses} / ${tower.maxUses} charges remaining`:'Four charges · place on or near the road'}</p>`:''}
 ${tower?`<div class="strategy-controls"><label for="targeting-select">Target priority</label><select id="targeting-select" ${unavailable?'disabled':''}>${TARGET_MODES.map(mode=>`<option value="${mode}" ${tower.targeting===mode?'selected':''}>${mode[0].toUpperCase()+mode.slice(1)}</option>`).join('')}</select><small id="targeting-hint">${targetingHints[tower.targeting]}</small>
 ${kind==='barracks'?`<button id="rally-troops" aria-pressed="${rallyTowerId===tower.id}" ${unavailable?'disabled':''}>${rallyTowerId===tower.id?'Choose rally point on road':'Set soldier rally point'}</button>`:''}
 ${kind==='trap'?`<button id="rearm-trap" ${unavailable||model.gold<model.rearmCost(tower)||tower.uses===tower.maxUses?'disabled':''}>Rearm · ${model.rearmCost(tower)} gold</button>`:''}</div>
 ${level===2?`<div class="branch-options"><h3>Choose a specialization</h3>${BRANCH_KEYS.map(key=>{const branch=def.branches[key];return `<button data-branch="${key}" ${unavailable||!upgradeGate?.allowed||model.gold<branch.cost||(key==='D'&&model.difficulty!=='hell')?'disabled':''}><strong>${key} · ${branch.name}</strong><span>${branch.description}</span><small>${key==='D'&&model.difficulty!=='hell'?'Hell difficulty required':`${branch.cost} gold`}</small></button>`;}).join('')}</div>`:''}
 <p id="upgrade-gate" class="upgrade-gate">${upgradeGate?.reason||""}</p><div class="tower-actions"><button id="upgrade" ${level===3||unavailable||!upgradeGate?.allowed||(level===1&&model.gold<model.upgradeCost(tower))?'disabled':''}>${level===3?'Specialized':level===2?'Choose a branch':`Tier II · ${model.upgradeCost(tower)} gold`}</button><button id="sell" ${unavailable?'disabled':''} title="Sell for 70% of invested gold">Sell · ${Math.floor(tower.spent*.7)}</button></div>`:`<div class="placement-note">Build for ${def.cost} gold. ${kind==='trap'?'Choose the road or a named site nearby.':'Choose a glowing foundation or named site.'}</div>`}</div>`;
 if(!tower)return;
 $('targeting-select').addEventListener('change',()=>{const mode=$<HTMLSelectElement>('targeting-select').value as TowerTargetMode;if(model.setTargeting(tower.id,mode))$('targeting-hint').textContent=targetingHints[mode];});
 $('upgrade').addEventListener('click',()=>{if(tower.level===2){document.querySelector<HTMLButtonElement>('[data-branch]:not(:disabled)')?.focus();return;}if(model.upgrade(tower.id)){effects.play('upgrade');lastSignature='';tick();}});
 $('sell').addEventListener('click',()=>{model.sell(tower.id);rallyTowerId=null;selectedPad=null;syncSelection();effects.play('ui_click');});
 document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(button=>button.addEventListener('click',()=>{const branch=button.dataset.branch as TowerBranchKey;if(model.upgrade(tower.id,branch)){effects.play('upgrade');toast(def.branches[branch].name+' ready.');lastSignature='';tick();}}));
 $('rally-troops')?.addEventListener('click',()=>{rallyTowerId=rallyTowerId===tower.id?null:tower.id;selectedKind=null;meteorArmed=false;syncSelection();toast('Choose a rally point on the road near the barracks.');});
 $('rearm-trap')?.addEventListener('click',()=>{if(model.rearmTrap(tower.id)){effects.play('build');lastSignature='';tick();}});
}
function tick(){
 syncBattleInteractivity();
 setText('gold',String(model.gold));setText('built',`${model.towers.filter(t=>t.kind!=='trap').length} / ${model.pads.length}`);setText('lives',`${model.lives} / ${model.maxLives}`);setText('header-wallet',`${progression.xp} XP · ${progression.gems} gems`);setText('wave',`${String(model.wave).padStart(2,'0')} / ${model.waves.length}`);
 const active=model.status==='wave',terminal=model.status==='won'||model.status==='lost';
 setText('battle-state',terminal?(model.status==='won'?'The stronghold stands':'The stronghold has fallen'):active?`Wave ${model.wave} · ${model.waves[model.wave-1].name}`:'Prepare your defenses');
 setText('remaining',active?`${model.waveRemaining} foes remaining`:terminal?`${model.kills} foes defeated`:'Build, upgrade, and get ready');
 $('pause-overlay').hidden=!model.paused||!$('guide').hidden||!$('settings').hidden||!$('campaign').hidden||!$('unit-preview').hidden||progressionPanel.isOpen||!$('wave-preview').hidden||mainMenu.isOpen||menuPage!==null||terminal;
 if($('pause').dataset.paused!==String(model.paused)){$('pause').innerHTML=icon(model.paused?'play':'pause');$('pause').dataset.paused=String(model.paused);}$('pause').setAttribute('aria-label',model.paused?'Resume game':'Pause game');
 setText('speed',`${model.speed}×`);
 const next=model.nextWave();setText('next-name',terminal?'The kingdom calls again.':active?'Hold the line.':next?.name||'The final stand');setText('wave-description',terminal?'Every defeat is a new strategy waiting.':active?'Towers fire automatically. Upgrade your defenses, or call on Starfall.':next?.description||'The old kingdom remembers your courage.');
 const hiddenThreat=terminal?null:model.stealthBriefing();$('stealth-advisory').hidden=active||!hiddenThreat;
 if(hiddenThreat){const ownUpgrade=hiddenThreat.options.find(option=>option.action==='upgrade');setText('stealth-advisory',`Hidden enemies in wave ${hiddenThreat.wave}. ${hiddenThreat.hasDetector?'Check detection coverage along the road.':ownUpgrade?`${ownUpgrade.name}: ${ownUpgrade.cost}g upgrade${ownUpgrade.available?'':' after a clear'}.`:'Plan ahead: Arrow II 135g total, or Magic spire 160g immediately.'} Open ? for counter options.`);$('stealth-advisory').classList.toggle('imminent',hiddenThreat.imminent&&!hiddenThreat.hasDetector);}
 setText('bonus',model.earlyBonus>0?`+${model.earlyBonus} EARLY GOLD`:'');
 const waveBtn=$<HTMLButtonElement>('start-wave');waveBtn.disabled=active||model.paused;const waveText=active?'Wave in progress':model.wave===0?'Send first wave':terminal?'Defend again':`Send wave ${model.wave+1}`;
 if(waveBtn.dataset.text!==waveText){waveBtn.innerHTML=`<span>${icon(active?'shield':'play')} ${waveText}</span><span class="key">SPACE</span>`;waveBtn.dataset.text=waveText;}
 const meteor=$<HTMLButtonElement>('meteor');meteor.disabled=!active||model.meteorCooldown>0||model.paused;setText('meteor-status',meteorArmed?'CHOOSE YOUR TARGET':model.meteorCooldown>0?`RECHARGING · ${Math.ceil(model.meteorCooldown)}s`:'READY TO CAST');
 document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b=>{const kind=b.dataset.tower as TowerKind;b.classList.toggle('unaffordable',model.gold<TOWER_DEFS[kind].cost);const locked=!model.isUnlocked(kind);b.classList.toggle('locked',locked);b.disabled=terminal||locked;b.title=locked?`Unlock ${TOWER_DEFS[kind].name} in the gem shop for ${TOWER_DEFS[kind].premiumCost} gems`:TOWER_DEFS[kind].description;});
 renderContext();
 $('mini-units').innerHTML=model.towers.map(t=>{const p=model.getTowerPosition(t);return `<circle cx="${p.x}" cy="${p.y}" r="14" fill="${'#'+TOWER_DEFS[t.kind].color.toString(16).padStart(6,'0')}" stroke="#fff" stroke-width="3"/>`;}).join('')+model.enemies.map(e=>`<circle cx="${e.x}" cy="${e.y}" r="${e.kind==='boss'?18:9}" fill="#f19175"/>`).join('');
 if(lastStatus==='wave'&&model.status==='building'){toast('Wave cleared. Gold awarded! Call the next wave early for a bonus.');effects.play('wave_start');}
 lastStatus=model.status;
 if(model.kills>lastKills)effects.play('enemy_death');lastKills=model.kills;
 for(const shot of model.shots){if(shot.id>lastShotId)effects.play(TOWER_DEFS[shot.kind].damageType==='physical'?(shot.kind==='cannon'||shot.kind==='mortar'?'cannon':'arrow'):TOWER_DEFS[shot.kind].damageType==='ice'?'frost':TOWER_DEFS[shot.kind].damageType==='fire'?'cannon':'arcane');lastShotId=Math.max(lastShotId,shot.id);}
 const view=sceneView()?.getView();if(view){setText('zoom-level',`${Math.round(view.zoom*100)}%`);$<HTMLButtonElement>('zoom-out').disabled=view.zoom<=1;$<HTMLButtonElement>('zoom-in').disabled=view.zoom>=2.5;}
 if(terminal&&!resultShown){resultShown=true;showResult();}

}
function updateRecord(){const saved=progression.stageProgress(model.level.id,model.difficulty);setText('record',saved?`${model.level.name} · ${'★'.repeat(saved.stars)}${'☆'.repeat(3-saved.stars)} · best ${Math.min(saved.bestWave,model.waves.length)}/${model.waves.length}`:`${model.waves.length} waves · ${model.difficulty.toUpperCase()}`);}
function showResult(){
 const won=model.status==='won';effects.play(won?'victory':'defeat');
 const reward=progression.recordResult({stageId:model.level.id,difficulty:model.difficulty,lives:model.lives,maxLives:model.maxLives,wave:won?model.wave:Math.max(0,model.wave-1),won,runId});
 $('result').hidden=false;
 setText('result-eyebrow',won?`${'★'.repeat(reward.stars)}${'☆'.repeat(3-reward.stars)} · ${model.difficulty.toUpperCase()}`:'THE WAR IS NOT OVER');
 setText('result-title',won?`${model.level.name} endures.`:'The keep has fallen.');
 setText('result-copy',won?`Stage secured! +${reward.xp} XP · +${reward.gems} gems. ${reward.firstClear?'First-clear rewards earned.':'Replay XP earned; improving stars can earn more gems.'}`:'Try another damage type, move your rally point, and cover tree-blocked approaches with mortars. Your best cleared wave is saved.');
 setText('result-waves',`${model.wave} / ${model.waves.length}`);setText('result-kills',String(model.kills));setText('result-health',`${model.lives} / ${model.maxLives}`);
 $('next-level').hidden=!won||model.currentLevelIndex>=LEVELS.length-1;
 ($('next-level').hidden?$('restart'):$('next-level')).focus();updateRecord();
}
function resetSelection(){runId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;rallyTowerId=null;selectedPad=null;selectedKind=null;meteorArmed=false;resultShown=false;lastStatus=model.status;lastKills=0;lastShotId=0;lastSignature='';$('result').hidden=true;sceneView()?.resetLevel();syncSelection();updateRecord();}
function restart(){model.reset();applyProgression();model.reset();resetSelection();toast('A fresh beginning. Choose your first defense.');}
function renderLevels(){
 $<HTMLSelectElement>('difficulty-select').value=model.difficulty;setText('difficulty-hint',model.difficulty==='easy'||model.difficulty==='normal'?'One arrow tower can defend the opening wave at a good early site. Build out your defense as the waves grow.':model.difficulty==='hard'?'Bring trained skill branches and plan coverage around bends, armor, and tree cover.':'Hell favors a developed skill tree, specialized damage, control, and carefully chosen sites.');$<HTMLSelectElement>('difficulty-select').disabled=model.status==='wave';
 $('level-list').innerHTML=LEVELS.map((level,index)=>{
  const saved=progression.stageProgress(level.id,model.difficulty);
  return `<button data-level="${index}" data-stage="${level.id}" class="${index===model.currentLevelIndex?'selected ':''}${saved?.cleared?'completed':''}" aria-pressed="${index===model.currentLevelIndex}" ${model.status==='wave'?'disabled':''}><span class="level-thumb" style="aspect-ratio:${level.world.width}/${level.world.height}"><img src="${LEVEL_ART[level.mapKey]}" alt=""/></span><span class="level-copy"><small>${level.subtitle}</small><strong>${level.name}</strong><span>${level.waves.length} waves · ${level.pads.length} foundations</span></span><span class="level-state">${'★'.repeat(saved?.stars||0)}${'☆'.repeat(3-(saved?.stars||0))} · ${saved?.cleared?'Secured':index===model.currentLevelIndex?'Current stage':'Play stage'}</span></button>`;
 }).join('');
 setText('campaign-note',model.status==='wave'?'Finish the current wave before changing stages or difficulty. Defense is paused while this menu is open.':'Each stage has its own scripted waves. Stage or difficulty changes begin a fresh defense.');
 $('level-list').querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button=>button.addEventListener('click',()=>changeLevel(Number(button.dataset.level))));
}
function openCampaign(){if(!$('guide').hidden||!$('settings').hidden||!$('campaign').hidden||!$('unit-preview').hidden||progressionPanel.isOpen||!$('wave-preview').hidden)return;campaignPaused=model.paused;model.paused=true;renderLevels();$('campaign').hidden=false;$('close-campaign').focus();tick();}
function closeCampaign(){if($('campaign').hidden)return;$('campaign').hidden=true;if(returnToMainMenu('campaign'))return;model.paused=campaignPaused;syncBattleInteractivity();if(document.fullscreenElement)$('rail-levels').focus();else $('levels-open').focus();tick();}
function changeLevel(index:number){
 if(!model.selectLevel(index))return;
 $('campaign').hidden=true;menuPage=null;mainMenu.hide();campaignPaused=false;applyProgression();model.reset();resetSelection();updateLevelLabels();effects.play('ui_click');focusBattlefield();toast(`${model.level.name} — choose your defenses.`);
}
function updateLevelLabels(){
 const level=model.level;document.title=`Mossguard · ${level.name}`;document.querySelector('.mission-heading h1')!.textContent=level.name;
 setText('chapter-seal',['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][model.currentLevelIndex]);setText('chapter-label',`${level.subtitle.toUpperCase()} / CHAPTER ${String(model.currentLevelIndex+1).padStart(2,'0')}`);
 const mapLabel=document.querySelector('.map-label')!;mapLabel.innerHTML=`<span class="map-pin"></span> ${level.name.toUpperCase()}`;
 document.querySelector('.minimap-label')!.innerHTML=`<span>${level.name.toUpperCase()}</span><b>STAGE ${String(model.currentLevelIndex+1).padStart(2,'0')}</b>`;
 const minimap=document.querySelector<HTMLElement>('.minimap')!;minimap.style.backgroundImage=`linear-gradient(#06202d44,#06202d44),url("${LEVEL_ART[level.mapKey]}")`;
 minimap.querySelector('svg')!.setAttribute('viewBox',`0 0 ${level.world.width} ${level.world.height}`);
 document.querySelector('.minimap polyline')!.setAttribute('points',model.path.map(p=>`${p.x},${p.y}`).join(' '));
 $('battlefield').setAttribute('aria-label',`${level.name} battlefield. Choose a tower and a glowing foundation. Use the named-site buttons for keyboard or touch placement.`);
 document.querySelector('.difficulty')!.textContent=model.difficulty.toUpperCase();updateRecord();
}
function updateDockControls(){const list=document.querySelector<HTMLElement>('.tower-list')!;$<HTMLButtonElement>('tower-prev').disabled=list.scrollLeft<=1;$<HTMLButtonElement>('tower-next').disabled=list.scrollLeft+list.clientWidth>=list.scrollWidth-2;}
function revealTower(kind:TowerKind){const list=document.querySelector<HTMLElement>('.tower-list')!,card=list.querySelector<HTMLElement>(`[data-tower="${kind}"]`)!;const c=card.getBoundingClientRect(),l=list.getBoundingClientRect();if(c.left<l.left)list.scrollLeft-=l.left-c.left;else if(c.right>l.right)list.scrollLeft+=c.right-l.right;updateDockControls();}

document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b=>b.addEventListener('click',()=>chooseTower(b.dataset.tower as TowerKind)));
for(const id of ['progression-open','settings-progression','meta-open'])$(id).addEventListener('click',()=>openProgression());
$('wave-preview-open').addEventListener('click',openWavePreview);
for(const id of ['wave-preview-close','wave-preview-done'])$(id).addEventListener('click',closeWavePreview);
$('wave-preview').addEventListener('click',event=>{if(event.target===$('wave-preview'))closeWavePreview();});
$('auto-wave').addEventListener('change',()=>{model.autoWave=$<HTMLInputElement>('auto-wave').checked;tick();});
$('difficulty-select').addEventListener('change',()=>{
 const difficulty=$<HTMLSelectElement>('difficulty-select').value as 'easy'|'normal'|'hard'|'hell';
 if(model.status==='wave')return;
 if(model.setDifficulty(difficulty)){applyProgression();model.reset();resetSelection();model.paused=true;campaignPaused=false;try{saveStorage?.setItem('mossguard-difficulty',difficulty);}catch{/* Optional save. */}renderLevels();updateLevelLabels();tick();}
});
$('pause-menu').addEventListener('click',()=>showMainMenu());
$('main-menu-open').addEventListener('click',()=>showMainMenu());
$('settings-menu').addEventListener('click',()=>{closeSettings();showMainMenu();});
document.querySelector('.brand')!.addEventListener('click',event=>{event.preventDefault();showMainMenu();});
$('start-wave').addEventListener('click',startWave);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',pause);$('speed').addEventListener('click',()=>{model.speed=model.speed===1?2:model.speed===2?3:1;tick();});$('meteor').addEventListener('click',armMeteor);
['guide-nav','how-to'].forEach(id=>$(id).addEventListener('click',openGuide));['close-guide','guide-done'].forEach(id=>$(id).addEventListener('click',closeGuide));$('guide').addEventListener('click',e=>{if(e.target===$('guide'))closeGuide();});
$('restart').addEventListener('click',restart);$('next-level').addEventListener('click',()=>changeLevel(model.currentLevelIndex+1));
['levels-open','rail-levels'].forEach(id=>$(id).addEventListener('click',openCampaign));
['close-campaign','campaign-done'].forEach(id=>$(id).addEventListener('click',closeCampaign));
$('campaign').addEventListener('click',e=>{if(e.target===$('campaign'))closeCampaign();});
for(const [id,direction] of [['tower-prev',-1],['tower-next',1]] as const)$(id).addEventListener('click',()=>document.querySelector('.tower-list')!.scrollBy({left:direction*document.querySelector('.tower-list')!.clientWidth*.75,behavior:bridge.reduceMotion?'instant':'smooth'}));
document.querySelector('.tower-list')!.addEventListener('scroll',updateDockControls);window.addEventListener('resize',updateDockControls);requestAnimationFrame(updateDockControls);$('inspect').addEventListener('click',()=>{$('result').hidden=true;toast('Press R to defend Eldervale again.');});
$('units-open').addEventListener('click',openUnitPreview);
['unit-preview-close','units-done'].forEach(id=>$(id).addEventListener('click',closeUnitPreview));
$('unit-preview').addEventListener('click',e=>{if(e.target===$('unit-preview'))closeUnitPreview();});
$('sound').addEventListener('click',toggleSound);
$('sound-setting').addEventListener('change',toggleSound);
$('motion-setting').addEventListener('change',()=>{bridge.reduceMotion=$<HTMLInputElement>('motion-setting').checked;});
['settings-open','rail-settings'].forEach(id=>$(id).addEventListener('click',openSettings));
['close-settings','settings-done'].forEach(id=>$(id).addEventListener('click',closeSettings));
$('settings').addEventListener('click',e=>{if(e.target===$('settings'))closeSettings();});
$('rail-towers').addEventListener('click',()=>{document.querySelector<HTMLButtonElement>('[data-tower]')?.focus();toast('Select a tower from the command bar below.');});
$('rail-skills').addEventListener('click',()=>{if(model.status==='wave'&&model.meteorCooldown===0)armMeteor();else toast('Starfall is ready during a wave, with a 25-second recharge.');});
['rail-map','minimap-toggle'].forEach(id=>$(id).addEventListener('click',toggleTactical));

$('zoom-in').addEventListener('click',()=>changeZoom(.25));
$('zoom-out').addEventListener('click',()=>changeZoom(-.25));
$('fullscreen').addEventListener('click',()=>{void toggleFullscreen();});
document.addEventListener('fullscreenchange',()=>{const active=document.fullscreenElement===$('game-shell');$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');requestAnimationFrame(resizeGame);});
let resizeFrame=0;
function scheduleResize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resizeGame);}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(scheduleResize).observe($('battlefield'));
window.addEventListener('resize',scheduleResize);
document.addEventListener('keydown',e=>{
 if(mainMenu.isOpen)return;
 if((e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)&&!['Escape','Tab'].includes(e.key))return;
 if(!e.repeat&&e.key==='Escape'){if(progressionPanel.isOpen){progressionPanel.close();return;}if(!$('wave-preview').hidden){closeWavePreview();return;}if(!$('guide').hidden){closeGuide();return;}if(!$('settings').hidden){closeSettings();return;}if(!$('campaign').hidden){closeCampaign();return;}if(!$('unit-preview').hidden){closeUnitPreview();return;}meteorArmed=false;rallyTowerId=null;selectedKind=null;selectedPad=null;syncSelection();return;}
 if(!e.repeat&&e.key.toLowerCase()==='r'&&!$('result').hidden){restart();return;}
 const modal=[ $('guide'), $('settings'), $('result'), $('campaign'), $('unit-preview'), $('wave-preview'), $('progression') ].find(e=>!e.hidden);
 if(modal){if(e.key==='Tab'){const buttons=Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled),input'));const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}return;}
 if(e.key===' '){if(e.target instanceof HTMLButtonElement)return;e.preventDefault();if(!e.repeat)startWave();}
 else if(!e.repeat&&['1','2','3','4','5','6','7','8','9'].includes(e.key))chooseTower(KINDS[Number(e.key)-1]);
 else if(!e.repeat&&['+','='].includes(e.key)){e.preventDefault();changeZoom(.25);}
 else if(!e.repeat&&e.key==='-'){e.preventDefault();changeZoom(-.25);}
 else if(!e.repeat&&e.key==='0'){sceneView()?.resetView();tick();}
 else if(!e.repeat&&e.key.toLowerCase()==='u'){$<HTMLButtonElement>('upgrade')?.click();}
 else if(!e.repeat&&['x','delete'].includes(e.key.toLowerCase())){$<HTMLButtonElement>('sell')?.click();}
 else if(!e.repeat&&e.key.toLowerCase()==='p')pause();
 else if(!e.repeat&&e.key.toLowerCase()==='f')armMeteor();
 else if(!e.repeat&&e.key==='?')openGuide();
 else if(!e.repeat&&e.key.toLowerCase()==='m')toggleTactical();
 else if(!e.repeat&&e.key.toLowerCase()==='r'&&['won','lost'].includes(model.status))restart();
});
// Read-only state for browser checks and bug reports; no production mutation hooks.
Object.defineProperty(window,'__MOSSGUARD__',{get:()=>({...model.snapshot(),progression:progression.state,catalog:JSON.parse(catalogSnapshot),ui:{screen:mainMenu.isOpen?'main-menu':progressionPanel.isOpen?'skills':menuPage||'battle',hasLiveDefense:hasLiveDefense()},view:sceneView()?.getView()||null,animations:sceneView()?.getAnimationSnapshot()||null})});
function pauseForBackground(){if(model.status==='wave'&&!model.paused){model.paused=true;meteorArmed=false;syncSelection();}}
window.addEventListener('blur',pauseForBackground);
installPlatformLifecycle({onHide:pauseForBackground,onMotionChange:reduced=>{bridge.reduceMotion=reduced;$<HTMLInputElement>('motion-setting').checked=reduced;}});
updateLevelLabels();
showMainMenu();
