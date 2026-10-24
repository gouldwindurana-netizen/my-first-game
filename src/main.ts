import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import Phaser from 'phaser';
import './style.css';
import './platform.css';
import './readability.css';
import { installPlatformLifecycle, focusBattlefield } from './platform';
import { GameModel, PADS, PATH, TOWER_DEFS, WAVES, type TowerKind } from './game/model';
import { GroveScene, type SceneBridge } from './render/scene';
import { icon } from './pack-icons';
import { towerArt } from './asset-art';
import { GameAudio } from './audio';

const model = new GameModel();
const $ = <T extends HTMLElement = HTMLElement>(id:string):T => document.getElementById(id) as T;
const KINDS:TowerKind[]=['archer','cannon','frost','arcane'];
const roles:Record<TowerKind,string> = {archer:'PRECISION',cannon:'AREA DAMAGE',frost:'SLOW & CONTROL',arcane:'CHAIN LIGHTNING'};
const app = $('app');
app.innerHTML = `
<header id="top" class="site-header">
 <a class="brand" href="#top" aria-label="Mossguard home"><span class="brand-mark">${icon('shield')}</span><span>MOSSGUARD<small>CHRONICLES OF THE RIFT</small></span></a>
 <nav aria-label="Game navigation"><span class="nav-active">${icon('flag')} Campaign</span><button id="guide-nav">${icon('book')} Field guide <span class="key">?</span></button></nav>
 <div class="header-right"><span class="edition"><i></i> SINGLE PLAYER CAMPAIGN</span><button class="icon-button" id="sound" aria-label="Enable sound" title="Toggle sound">${icon('mute')}</button><button class="icon-button" id="settings-open" aria-label="Open settings">${icon('settings')}</button></div>
</header>
<main>
 <section class="mission-heading"><div class="mission-title"><span class="chapter-seal">I</span><div><div class="eyebrow">THE FALLEN KINGDOM <span>/</span> CHAPTER 01</div><h1>Ruins of Eldervale</h1></div></div><div class="mission-meta"><span class="difficulty"><i></i> NORMAL</span><button id="how-to" class="text-button">${icon('book')} How to play ${icon('chevron')}</button></div></section>
 <section id="game-shell" class="game-shell" aria-label="Tower defense game">
  <div class="battle-column">
   <div class="battle-bar"><div class="resources"><div class="resource health">${icon('heart')}<span><small>STRONGHOLD</small><b id="lives">20 / 20</b></span></div><div class="resource coins">${icon('gold')}<span><small>TREASURY</small><b id="gold">240</b></span></div><div class="resource mana">${icon('crystal')}<span><small>TOWERS BUILT</small><b id="built">0 / 8</b></span></div></div><div class="wave-badge">${icon('skull')}<span>WAVE <b id="wave">00 / 12</b></span></div><div class="map-controls"><button id="pause" class="map-button" aria-label="Pause game" title="Pause (P)">${icon('pause')}</button><button id="speed" class="map-button speed" title="Toggle game speed">1×</button></div></div>
   <div class="battlefield-wrap">
    <div id="battlefield" tabindex="0" role="application" aria-label="Ruins of Eldervale battlefield. Choose a tower then click a glowing stone foundation to build. Keyboard: 1 ranger, 2 cannon, 3 frost, 4 arcane, Space next wave, P pause, F Starfall."></div>
    <div class="view-controls" role="group" aria-label="Battlefield view"><button id="zoom-out" aria-label="Zoom out" title="Zoom out (−)">−</button><span id="zoom-level" class="zoom-label" aria-live="polite">100%</span><button id="zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button><button id="fullscreen" aria-label="Enter fullscreen" aria-pressed="false" title="Fullscreen">${icon('expand')}</button></div>
    <div class="map-label"><span class="map-pin"></span> ELDER VALE <span class="map-divider"></span><span>THE WESTERN RIFT</span></div>
    <div class="field-rail"><button id="rail-towers" title="Select a tower">${icon('shield')}<span>TOWERS</span></button><button id="rail-skills" title="Cast Starfall (F)">${icon('bolt')}<span>SKILLS</span></button><button id="rail-map" aria-pressed="false" title="Toggle tactical ranges (M)">${icon('map')}<span>MAP</span></button><button id="rail-settings" title="Settings">${icon('settings')}<span>OPTIONS</span></button></div>
    <div id="toast" role="status" class="toast">Choose a tower, then a stone foundation.</div>
    <button id="meteor" class="ability" title="Starfall: 145 area damage. 25 second cooldown. (F)"><span class="ability-icon">${icon('meteor')}</span><span><b>Starfall</b><small id="meteor-status">READY TO CAST</small></span><span class="key">F</span></button>
    <div class="map-scale"><span>✦</span> N</div>
    <div id="pause-overlay" class="pause-overlay" hidden><span class="eyebrow">THE BATTLE IS PAUSED</span><h2>Even wardens need a moment.</h2><button id="resume" class="primary">${icon('play')} Resume defense</button></div>
   </div>
   <div class="battle-footer"><span><i class="status-dot"></i><b id="battle-state">Prepare your defenses</b></span><span id="remaining">Hold the road. Defend the stronghold.</span></div>
  </div>
  <aside class="build-panel"><div class="panel-heading"><span class="eyebrow">WARDEN’S COMMAND</span><span class="panel-ornament">✦</span></div><div class="context-panel" id="context"></div><div class="next-wave"><div class="next-label"><span>INCOMING WAVE</span><span id="bonus"></span></div><h3 id="next-name">Footsteps in the fern</h3><p id="wave-description">Scouts approach the western rift.</p><button id="start-wave" class="primary wave-button"><span>${icon('play')} Send first wave</span><span class="key">SPACE</span></button></div><div class="panel-foot">${icon('shield')} The kingdom still stands with you.</div></aside>
  <section class="tower-dock" aria-label="Build towers"><div class="dock-heading"><span class="dock-emblem">${icon('shield')}</span><span><b>TOWERS</b><small>SELECT YOUR DEFENSE</small></span></div><div class="tower-list">${KINDS.map((kind,i)=>`<button class="tower-card ${kind}" data-tower="${kind}" aria-label="Select ${TOWER_DEFS[kind].name}, ${TOWER_DEFS[kind].cost} gold"><span class="tower-key">${i+1}</span><span class="tower-art">${towerArt(kind)}</span><span class="tower-info"><b>${TOWER_DEFS[kind].name}</b><span>${roles[kind]}</span></span><span class="tower-cost">${icon('gold')}${TOWER_DEFS[kind].cost}</span></button>`).join('')}</div><div class="dock-tip">${icon('mouse')}<span>Choose a tower.<br>Claim a foundation.</span></div></section>
  <section id="foundation-picker" class="foundation-picker" hidden aria-label="Choose tower foundation"></section>
  <button class="minimap-panel" id="minimap-toggle" title="Toggle tactical map ranges"><div class="minimap-label"><span>ELDERVALE</span><b>STAGE 01</b></div><div class="minimap"><svg viewBox="0 0 1100 680" aria-hidden="true"><polyline points="${PATH.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#e9cd8d" stroke-width="8" opacity=".6"/><g id="mini-units"></g></svg><span class="minimap-corners"></span></div></button>
 </section>
 <footer class="site-footer"><span>${icon('spark')} Four disciplines. One last stronghold.</span><div class="shortcuts"><span><kbd>1—4</kbd> Towers</span><span><kbd>P</kbd> Pause</span><span><kbd>M</kbd> Tactical map</span><span><kbd>ESC</kbd> Cancel</span></div><span id="record">12 waves. Stand your ground.</span></footer>
</main>
<div class="modal-backdrop" id="guide" hidden><section class="modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><button class="modal-close icon-button" id="close-guide" aria-label="Close field guide">${icon('close')}</button><span class="eyebrow">THE WARDEN’S HANDBOOK</span><h2 id="guide-title">A kingdom worth defending.</h2><p class="modal-intro">The rift has opened beneath the old citadel. Stop the Hollow from reaching your stronghold. Survive all twelve waves to win.</p><div class="guide-steps"><div><span>01</span><h3>Reclaim the ruins</h3><p>Choose a tower from the bottom bar, then click a glowing stone foundation. Every site covers a different stretch of road.</p></div><div><span>02</span><h3>Master four disciplines</h3><p>Rangers catch runners. Cannons break armor. Frost slows the advance. Arcane bolts chain through nearby foes.</p></div><div><span>03</span><h3>Forge your defense</h3><p>Defeat enemies to earn gold. Select a built tower to upgrade twice or sell for 70% of your investment.</p></div><div><span>04</span><h3>Call down Starfall</h3><p>Press F, then target the road for 145 area damage. The spell recharges in 25 seconds. Press M to see tactical ranges.</p></div></div><div class="guide-note">${icon('gold')} Send the next wave within 12 seconds of a clear for up to 24 bonus gold.</div><button id="guide-done" class="primary">For Eldervale ${icon('arrow')}</button></section></div>
<div class="modal-backdrop" id="settings" hidden><section class="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button class="modal-close icon-button" id="close-settings" aria-label="Close settings">${icon('close')}</button><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2 id="settings-title">Warden’s settings</h2><label class="setting-row"><span><b>Sound effects</b><small>Spells, rewards, and tower construction</small></span><input type="checkbox" id="sound-setting"/></label><label class="setting-row"><span><b>Reduced motion</b><small>Keep ambient effects and tower motion still</small></span><input type="checkbox" id="motion-setting"/></label><button id="settings-done" class="primary">Return to battle ${icon('arrow')}</button></section></div>
<div class="modal-backdrop" id="result" hidden><section class="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="result-emblem">${icon('shield')}</div><span id="result-eyebrow" class="eyebrow"></span><h2 id="result-title"></h2><p id="result-copy"></p><div class="result-stats"><div><b id="result-waves"></b><small>WAVES FACED</small></div><div><b id="result-kills"></b><small>FOES DEFEATED</small></div><div><b id="result-health"></b><small>STRONGHOLD HEALTH</small></div></div><button id="restart" class="primary">${icon('restart')} Defend again</button><button id="inspect" class="text-button">View the battlefield</button></section></div>
`;

// Fixed dialogs must share the fullscreen subtree to remain visible during battle.
for(const id of ['guide','settings','result'])$('game-shell').appendChild($(id));

let selectedPad:number|null=null, selectedKind:TowerKind|null=null, meteorArmed=false;
let resultShown=false, guidePaused=false, settingsPaused=false, lastSignature='', lastStatus=model.status;
let toastTimer: ReturnType<typeof setTimeout>;
const effects=new GameAudio();
let sound=false, loadingAudio=false, lastKills=0, lastShotId=0;

const bridge:SceneBridge={model,selectedPad,selectedKind,meteorArmed,tactical:false,reduceMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,onPad,onGround,onTick:tick};
const game = new Phaser.Game({type:Phaser.CANVAS,parent:'battlefield',backgroundColor:'#314936',width:1100*getRenderScale(),height:680*getRenderScale(),transparent:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},scene:[new GroveScene(bridge)],banner:false});
function syncSelection(){bridge.selectedPad=selectedPad;bridge.selectedKind=selectedKind;bridge.meteorArmed=meteorArmed;$('battlefield').classList.toggle('casting',meteorArmed);$('meteor').classList.toggle('armed',meteorArmed);document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b=>{const active=b.dataset.tower===selectedKind;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});lastSignature='';renderFoundationPicker();tick();}
function toast(message:string){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function getRenderScale(){return Math.min(2,Math.max(1,Math.ceil(Math.max(window.devicePixelRatio||1,$('battlefield').clientWidth/1100))));}
function sceneView():GroveScene|null{const scene=game.scene.getScene('grove') as GroveScene|undefined;return scene?.sys?.isActive()?scene:null;}
function resizeGame(){const scale=getRenderScale();if(game.scale.gameSize.width!==1100*scale)game.scale.setGameSize(1100*scale,680*scale);game.scale.refresh();}
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

function chooseTower(kind:TowerKind){if(model.status==='won'||model.status==='lost')return;selectedKind=selectedKind===kind?null:kind;selectedPad=null;meteorArmed=false;syncSelection();if(selectedKind)toast(`Choose a stone foundation for your ${TOWER_DEFS[kind].name.toLowerCase()}.`);effects.play('ui_click');}
function onPad(id:number){focusBattlefield();if(model.paused||!$('guide').hidden)return;selectedPad=id;const existing=model.towers.find(t=>t.padId===id);if(selectedKind&&!existing){if(model.build(id,selectedKind)){toast(`${TOWER_DEFS[selectedKind].name} ready. For Eldervale!`);selectedKind=null;effects.play('build');}else toast('More gold is needed for that tower.');}else if(existing)selectedKind=null;syncSelection();}
function onGround(x:number,y:number){focusBattlefield();if(meteorArmed){if(model.meteor(x,y)){toast('Starfall! The rift recoils.');effects.play('cannon');}else toast('Starfall is available during an active wave.');meteorArmed=false;syncSelection();}else if(selectedPad!==null){selectedPad=null;syncSelection();}}
function armMeteor(){if(model.paused||model.status!=='wave'||model.meteorCooldown>0)return;meteorArmed=!meteorArmed;selectedKind=null;selectedPad=null;syncSelection();toast(meteorArmed?'Choose a target on the path. Escape to cancel.':'Starfall cancelled.');}
function pause(){if(!($('guide').hidden)||!$('settings').hidden||model.status==='won'||model.status==='lost')return;model.paused=!model.paused;meteorArmed=false;syncSelection();effects.play('ui_click');}
function startWave(){if(model.status==='won'||model.status==='lost'){restart();return;}if(model.startWave()){selectedKind=null;meteorArmed=false;syncSelection();toast(`Wave ${model.wave} — ${WAVES[model.wave-1].name}`);effects.play('wave_start');}}
function openGuide(){if(!$('guide').hidden||!$('settings').hidden)return;guidePaused=model.paused;model.paused=true;$('guide').hidden=false;$('close-guide').focus();tick();}
function closeGuide(){if($('guide').hidden)return;$('guide').hidden=true;model.paused=guidePaused;if(document.fullscreenElement)focusBattlefield();else $('guide-nav').focus();tick();}
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
function openSettings(){if(!$('settings').hidden||!$('guide').hidden)return;settingsPaused=model.paused;model.paused=true;$('settings').hidden=false;$<HTMLInputElement>('motion-setting').checked=bridge.reduceMotion;$('close-settings').focus();tick();}
function closeSettings(){if($('settings').hidden)return;$('settings').hidden=true;model.paused=settingsPaused;if(document.fullscreenElement)$('rail-settings').focus();else $('settings-open').focus();tick();}
function setText(id:string,text:string){const e=$(id);if(e.textContent!==text)e.textContent=text;}
function renderFoundationPicker(){
 const picker=$('foundation-picker');
 picker.hidden=!selectedKind;
 if(!selectedKind){picker.replaceChildren();return;}
 const def=TOWER_DEFS[selectedKind];
 const paused=model.paused||['won','lost'].includes(model.status);
 picker.innerHTML=`<div class="foundation-heading"><b>Place ${def.name}</b><span>Choose a numbered site, or a stone foundation on the map.</span></div><div class="foundation-sites">${PADS.map((pad,index)=>{const occupied=model.towers.some(t=>t.padId===pad.id);return `<button data-foundation="${pad.id}" ${occupied||model.gold<def.cost||paused?'disabled':''} aria-label="Build ${def.name} on foundation ${index+1}${occupied?', occupied':''}">${index+1}</button>`;}).join('')}</div><button id="cancel-foundation" aria-label="Cancel tower placement">${icon('close')} Cancel</button>`;
 picker.querySelectorAll<HTMLButtonElement>('[data-foundation]').forEach(button=>button.addEventListener('click',()=>{const id=Number(button.dataset.foundation);sceneView()?.focusSite(id);onPad(id);}));
 $('cancel-foundation').addEventListener('click',()=>{selectedKind=null;syncSelection();});
}
function renderContext(){
 const tower=model.towers.find(t=>t.padId===selectedPad);
 const kind=tower?.kind||selectedKind;
 const signature=[selectedPad,selectedKind,model.gold,tower?.level,tower?.id,model.status,model.paused].join(':');
 if(lastSignature===signature)return;
 lastSignature=signature;
 renderFoundationPicker();
 if(!kind){
  $('context').innerHTML=`<div class="empty-command"><div class="command-emblem">${icon('shield')}</div><span class="eyebrow">HOLD THE ANCIENT ROAD</span><h2 class="empty-title">A kingdom<br>worth defending.</h2><p>The rift is open. Reclaim the old foundations and build your last line of defense.</p><div class="brief-row"><span><b>${WAVES.length}</b>ENEMY WAVES</span><span><b>${PADS.length}</b>TOWER SITES</span></div><div class="command-towers">${KINDS.map(k=>`<span>${towerArt(k)}</span>`).join('')}</div><small>Choose a tower below to begin.</small></div>`;
  return;
 }
 const def=TOWER_DEFS[kind];
 const level=tower?.level||1;
 const stats=tower?model.getTowerStats(tower):{damage:def.damage,range:def.range,interval:def.interval};
 const upgradeStats={damage:Math.round(def.damage*(1+level*.8)),range:def.range+level*18};
 const tiers:Record<TowerKind,string[]>={archer:['Watchtower','Marksman','Sentinel'],cannon:['Mortar','Bombard','Siegebreaker'],frost:['Ice shard','Deep freeze','Winterheart'],arcane:['Arc bolt','Conduit','Stormheart']};
 const special=kind==='arcane'?`${level+1} targets · 35% jump falloff`:kind==='frost'?'45% slow · 2.2 seconds':kind==='cannon'?'65 radius · ignores armor':'Rapid fire · runner specialist';
 const terminal=['won','lost'].includes(model.status);
 $('context').innerHTML=`<div class="tower-detail ${kind}"><div class="detail-header"><h2>${def.name}</h2><span>${tower?`LV. ${level}`:'BLUEPRINT'}</span></div><div class="tower-portrait">${towerArt(kind,level)}<span class="portrait-rune">✧</span></div><div class="detail-role">${roles[kind]}</div><p class="detail-description">${def.description}</p><div class="stat-list"><div><span>${icon('bolt')} Damage</span><b>${stats.damage}${tower&&level<3?` <em>→ ${upgradeStats.damage}</em>`:''}</b></div><div><span>${icon('range')} Range</span><b>${stats.range}${tower&&level<3?` <em>→ ${upgradeStats.range}</em>`:''}</b></div><div><span>${icon('crosshair')} Fire interval</span><b>${stats.interval.toFixed(2)}s</b></div></div><div class="tower-special">${icon(kind==='arcane'?'bolt':kind==='frost'?'crystal':kind==='cannon'?'meteor':'crosshair')} ${special}</div><div class="upgrade-heading"><span></span>UPGRADES<span></span></div><div class="upgrade-track">${tiers[kind].map((name,i)=>`<div class="upgrade-node ${i<level?'active':''}" title="${kind==='arcane'?`${i+2} chain targets`:`Level ${i+1}: ${Math.round(def.damage*(1+i*.8))} damage, ${def.range+i*18} range`}"><span>${icon(i===0?'crystal':i===1?'bolt':'spark')}</span><strong>${name}</strong><small>LEVEL ${['I','II','III'][i]}</small></div>`).join('')}</div>${tower?`<div class="tower-actions"><button id="upgrade" ${level===3||model.gold<model.upgradeCost(tower)||terminal?'disabled':''}>${icon('upgrade')} ${level===3?'Fully upgraded':`Upgrade <span>${icon('gold')}${model.upgradeCost(tower)}</span>`}</button><button id="sell" ${terminal?'disabled':''} title="Sell for 70% of invested gold">${icon('sell')} ${Math.floor(tower.spent*.7)}</button></div>`:`<div class="placement-note">${icon('mouse')}<span>Build for <b>${def.cost} gold.</b><br>Click a glowing foundation on the map.</span></div>`}</div>`;
 if(tower){
  $('upgrade').addEventListener('click',()=>{if(model.upgrade(tower.id)){effects.play('upgrade');toast('Tower upgraded. Eldervale stands stronger.');tick();}});
  $('sell').addEventListener('click',()=>{model.sell(tower.id);selectedPad=null;syncSelection();effects.play('ui_click');});
 }
}
function tick(){
 setText('gold',String(model.gold));setText('built',`${model.towers.length} / ${PADS.length}`);setText('lives',`${model.lives} / 20`);setText('wave',`${String(model.wave).padStart(2,'0')} / ${WAVES.length}`);
 const active=model.status==='wave',terminal=model.status==='won'||model.status==='lost';
 setText('battle-state',terminal?(model.status==='won'?'The stronghold stands':'The stronghold has fallen'):active?`Wave ${model.wave} · ${WAVES[model.wave-1].name}`:'Prepare your defenses');
 setText('remaining',active?`${model.waveRemaining} foes remaining`:terminal?`${model.kills} foes defeated`:'Build, upgrade, and get ready');
 $('pause-overlay').hidden=!model.paused||!$('guide').hidden||!$('settings').hidden||terminal;
 if($('pause').dataset.paused!==String(model.paused)){$('pause').innerHTML=icon(model.paused?'play':'pause');$('pause').dataset.paused=String(model.paused);}$('pause').setAttribute('aria-label',model.paused?'Resume game':'Pause game');
 setText('speed',`${model.speed}×`);
 const next=model.nextWave();setText('next-name',terminal?'The kingdom calls again.':active?'Hold the line.':next?.name||'The final stand');setText('wave-description',terminal?'Every defeat is a new strategy waiting.':active?'Towers fire automatically. Upgrade your defenses, or call on Starfall.':next?.description||'The old kingdom remembers your courage.');
 setText('bonus',model.earlyBonus>0?`+${model.earlyBonus} EARLY GOLD`:'');
 const waveBtn=$<HTMLButtonElement>('start-wave');waveBtn.disabled=active||model.paused;const waveText=active?'Wave in progress':model.wave===0?'Send first wave':terminal?'Defend again':`Send wave ${model.wave+1}`;
 if(waveBtn.dataset.text!==waveText){waveBtn.innerHTML=`<span>${icon(active?'shield':'play')} ${waveText}</span><span class="key">SPACE</span>`;waveBtn.dataset.text=waveText;}
 const meteor=$<HTMLButtonElement>('meteor');meteor.disabled=!active||model.meteorCooldown>0||model.paused;setText('meteor-status',meteorArmed?'CHOOSE YOUR TARGET':model.meteorCooldown>0?`RECHARGING · ${Math.ceil(model.meteorCooldown)}s`:'READY TO CAST');
 document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b=>{const kind=b.dataset.tower as TowerKind;b.classList.toggle('unaffordable',model.gold<TOWER_DEFS[kind].cost);b.disabled=terminal;});
 renderContext();
 $('mini-units').innerHTML=model.towers.map(t=>{const p=PADS.find(p=>p.id===t.padId)!;return `<circle cx="${p.x}" cy="${p.y}" r="14" fill="${'#'+TOWER_DEFS[t.kind].color.toString(16).padStart(6,'0')}" stroke="#fff" stroke-width="3"/>`;}).join('')+model.enemies.map(e=>`<circle cx="${e.x}" cy="${e.y}" r="${e.kind==='boss'?18:9}" fill="#f19175"/>`).join('');
 if(lastStatus==='wave'&&model.status==='building'){toast(`Wave cleared! +${35+model.wave*7} gold. Call the next wave early for a bonus.`);effects.play('wave_start');}
 lastStatus=model.status;
 if(model.kills>lastKills)effects.play('enemy_death');lastKills=model.kills;
 for(const shot of model.shots){if(shot.id>lastShotId)effects.play(shot.kind==='archer'?'arrow':shot.kind);lastShotId=Math.max(lastShotId,shot.id);}
 const view=sceneView()?.getView();if(view){setText('zoom-level',`${Math.round(view.zoom*100)}%`);$<HTMLButtonElement>('zoom-out').disabled=view.zoom<=1;$<HTMLButtonElement>('zoom-in').disabled=view.zoom>=2.5;}
 if(terminal&&!resultShown){resultShown=true;showResult();}

}
function showResult(){const won=model.status==='won';effects.play(won?'victory':'defeat');$('result').hidden=false;setText('result-eyebrow',won?'THE RIFT IS SEALED':'THE WAR IS NOT OVER');setText('result-title',won?'Eldervale endures.':'The citadel has fallen.');setText('result-copy',won?'Twelve waves repelled. The Hollow King defeated. The old kingdom has a future, thanks to you.':'The Hollow broke through. Try combining frost and cannons, and upgrade your best-positioned towers.');setText('result-waves',`${model.wave} / ${WAVES.length}`);setText('result-kills',String(model.kills));setText('result-health',`${model.lives} / 20`);$('restart').focus();try{const best=Math.max(Number(localStorage.getItem('mossguard-best')||0),won?WAVES.length:Math.max(0,model.wave-1));localStorage.setItem('mossguard-best',String(best));setText('record',`Personal best: ${best} / ${WAVES.length} waves defended`);}catch{/* Storage is optional. */}}
function restart(){model.reset();selectedPad=null;selectedKind=null;meteorArmed=false;resultShown=false;lastStatus=model.status;lastKills=0;lastShotId=0;sceneView()?.resetView();$('result').hidden=true;syncSelection();toast('A fresh beginning. Choose your first defense.');}

document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b=>b.addEventListener('click',()=>chooseTower(b.dataset.tower as TowerKind)));
$('start-wave').addEventListener('click',startWave);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',pause);$('speed').addEventListener('click',()=>{model.speed=model.speed===1?2:1;tick();});$('meteor').addEventListener('click',armMeteor);
['guide-nav','how-to'].forEach(id=>$(id).addEventListener('click',openGuide));['close-guide','guide-done'].forEach(id=>$(id).addEventListener('click',closeGuide));$('guide').addEventListener('click',e=>{if(e.target===$('guide'))closeGuide();});
$('restart').addEventListener('click',restart);$('inspect').addEventListener('click',()=>{$('result').hidden=true;toast('Press R to defend Eldervale again.');});
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
 if((e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)&&!['Escape','Tab'].includes(e.key))return;
 if(!e.repeat&&e.key==='Escape'){if(!$('guide').hidden){closeGuide();return;}if(!$('settings').hidden){closeSettings();return;}meteorArmed=false;selectedKind=null;selectedPad=null;syncSelection();return;}
 if(!e.repeat&&e.key.toLowerCase()==='r'&&!$('result').hidden){restart();return;}
 const modal=[ $('guide'), $('settings'), $('result') ].find(e=>!e.hidden);
 if(modal){if(e.key==='Tab'){const buttons=Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled),input'));const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}return;}
 if(e.key===' '){if(e.target instanceof HTMLButtonElement)return;e.preventDefault();if(!e.repeat)startWave();}
 else if(!e.repeat&&['1','2','3','4'].includes(e.key))chooseTower(KINDS[Number(e.key)-1]);
 else if(!e.repeat&&['+','='].includes(e.key)){e.preventDefault();changeZoom(.25);}
 else if(!e.repeat&&e.key==='-'){e.preventDefault();changeZoom(-.25);}
 else if(!e.repeat&&e.key==='0'){sceneView()?.resetView();tick();}
 else if(!e.repeat&&e.key.toLowerCase()==='p')pause();
 else if(!e.repeat&&e.key.toLowerCase()==='f')armMeteor();
 else if(!e.repeat&&e.key==='?')openGuide();
 else if(!e.repeat&&e.key.toLowerCase()==='m')toggleTactical();
 else if(!e.repeat&&e.key.toLowerCase()==='r'&&['won','lost'].includes(model.status))restart();
});
try{const best=localStorage.getItem('mossguard-best');if(best)setText('record',`Personal best: ${best} / ${WAVES.length} waves defended`);}catch{/* Storage is optional. */}
// Read-only state for browser checks and bug reports; no production mutation hooks.
Object.defineProperty(window,'__MOSSGUARD__',{get:()=>({...model.snapshot(),view:sceneView()?.getView()||null})});
function pauseForBackground(){if(model.status==='wave'&&!model.paused){model.paused=true;meteorArmed=false;syncSelection();}}
window.addEventListener('blur',pauseForBackground);
installPlatformLifecycle({onHide:pauseForBackground,onMotionChange:reduced=>{bridge.reduceMotion=reduced;$<HTMLInputElement>('motion-setting').checked=reduced;}});
tick();
