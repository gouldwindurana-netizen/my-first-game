import { Progression, SKILL_BRANCHES, SKILL_NODES, CAPSTONES, SHOP_ITEMS } from './game/progression';
import { ENEMY_KINDS, ENEMY_DEFS } from './game/catalog';
import './progression-ui.css';

type Tab = 'skills' | 'capstones' | 'shop' | 'bestiary';
interface Callbacks { onOpen:()=>void; onClose:()=>void; onChange:()=>void; }

/** A bounded DOM journal; upgrades are saved here and applied at the next fresh defense. */
export class ProgressionUI {
  readonly element: HTMLDivElement;
  private tab: Tab = 'skills';
  private branch = SKILL_BRANCHES[0].id;
  private returnFocus: HTMLElement | null = null;
  constructor(private progression: Progression, private callbacks: Callbacks) {
    this.element = document.createElement('div');
    this.element.id = 'progression'; this.element.className = 'modal-backdrop'; this.element.hidden = true;
    this.element.innerHTML = `<section class="modal progression-modal" role="dialog" aria-modal="true" aria-labelledby="progression-title">
      <button id="progression-close" class="modal-close" aria-label="Close progression">×</button>
      <span class="eyebrow">THE WARDEN'S LEGACY</span><h2 id="progression-title">Grow beyond the battlefield</h2>
      <div id="meta-wallet" class="meta-wallet" aria-live="polite"></div>
      <p class="meta-note">Earn XP and gems by defending stages. Purchases apply to your next fresh defense.</p>
      <div class="meta-tabs" role="tablist" aria-label="Progression and enemy guide">${(['skills','capstones','shop','bestiary'] as Tab[]).map(tab=>`<button data-meta-tab="${tab}" role="tab" aria-controls="meta-content">${tab==='skills'?'Skill tree':tab==='bestiary'?'Enemy guide':tab[0].toUpperCase()+tab.slice(1)}</button>`).join('')}</div>
      <div id="meta-content" role="tabpanel"></div><p id="meta-feedback" role="status"></p>
      <button id="progression-done" class="primary">Return to defense</button>
    </section>`;
    this.element.querySelector('#progression-close')!.addEventListener('click',()=>this.close());
    this.element.querySelector('#progression-done')!.addEventListener('click',()=>this.close());
    this.element.addEventListener('click',event=>{if(event.target===this.element)this.close();});
    this.element.querySelectorAll<HTMLButtonElement>('[data-meta-tab]').forEach(button=>button.addEventListener('click',()=>{this.tab=button.dataset.metaTab as Tab;this.render();}));
    this.element.querySelector('.meta-tabs')!.addEventListener('keydown',event=>{
      const key=(event as KeyboardEvent).key;
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
      const tabs=[...this.element.querySelectorAll<HTMLButtonElement>('[data-meta-tab]')],current=tabs.indexOf(document.activeElement as HTMLButtonElement);
      if(current<0)return;
      event.preventDefault();
      const next=key==='Home'?0:key==='End'?tabs.length-1:(current+(key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      this.tab=tabs[next].dataset.metaTab as Tab;this.render();tabs[next].focus();
    });
    this.element.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.stopImmediatePropagation();this.close();}
      if(event.key==='Tab'){
        const controls=[...this.element.querySelectorAll<HTMLElement>('button:not(:disabled),select')].filter(el=>el.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    });
  }
  get isOpen(){return !this.element.hidden;}
  open(tab:Tab='skills'){
    if(this.isOpen)return;
    this.returnFocus=document.activeElement as HTMLElement|null;this.tab=tab;
    this.callbacks.onOpen();this.element.hidden=false;this.render();
    this.element.querySelector<HTMLButtonElement>('#progression-close')!.focus();
  }
  close(){if(!this.isOpen)return;this.element.hidden=true;this.callbacks.onClose();if(this.returnFocus?.getClientRects().length)this.returnFocus.focus();}
  refresh(){if(this.isOpen)this.render();}
  private result(ok:boolean,message:string){
    const active=document.activeElement as HTMLElement|null;
    const focusKey=active&&['skillNode','capstone','shopItem'].find(key=>active.dataset[key]);
    const focusValue=focusKey?active?.dataset[focusKey]:null;
    this.callbacks.onChange();this.render();
    this.element.querySelector('#meta-feedback')!.textContent=ok?message:'Requirements are not met, or you need more currency.';
    const selector=focusKey&&focusValue?`[data-${focusKey.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}="${focusValue}"]`:null;
    const restored=selector?this.element.querySelector<HTMLButtonElement>(selector):null;
    if(restored&&!restored.disabled)restored.focus();else this.element.querySelector<HTMLButtonElement>(`[data-meta-tab="${this.tab}"]`)?.focus();
  }
  private render(){
    const state=this.progression.state;
    this.element.querySelector('#meta-wallet')!.textContent=`${state.xp.toLocaleString()} XP · ${state.gems.toLocaleString()} gems · ${this.progression.totalRanks} skill ranks`;
    this.element.querySelectorAll<HTMLButtonElement>('[data-meta-tab]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.metaTab===this.tab));button.tabIndex=button.dataset.metaTab===this.tab?0:-1;});
    const content=this.element.querySelector<HTMLElement>('#meta-content')!;
    if(this.tab==='skills'){
      content.innerHTML=`<div class="skill-toolbar"><label>Skill branch<select id="skill-branch">${SKILL_BRANCHES.map(branch=>`<option value="${branch.id}" ${branch.id===this.branch?'selected':''}>${branch.name} · ${this.progression.branchRanks(branch.id)} ranks</option>`).join('')}</select></label><span>100 nodes · 10 branches · 3–5 ranks per node</span></div><p class="meta-note">${SKILL_BRANCHES.find(branch=>branch.id===this.branch)?.description||''} Each node needs the previous node's first rank.</p>
        <div class="meta-grid">${SKILL_NODES.filter(node=>node.branch===this.branch).map(node=>{
          const rank=state.skillRanks[node.id]||0,cost=this.progression.getSkillCost(node.id);
          return `<article class="meta-card ${rank?'owned':''}"><small>NODE ${node.tier} · RANK ${rank}/${node.maxRank}</small><h3>${node.name}</h3><p>${node.description}</p><button data-skill-node="${node.id}" ${this.progression.canBuySkill(node.id)?'':'disabled'}>${rank>=node.maxRank?'Mastered':`Learn · ${cost} XP`}</button></article>`;
        }).join('')}</div><button id="reset-skills" class="meta-secondary" ${this.progression.totalRanks||state.capstones.length?'':'disabled'}>Reset skills and capstones · recover 80% of spent XP</button>`;
      content.querySelector<HTMLSelectElement>('#skill-branch')!.addEventListener('change',event=>{this.branch=(event.target as HTMLSelectElement).value as typeof this.branch;this.render();});
      content.querySelectorAll<HTMLButtonElement>('[data-skill-node]').forEach(button=>button.addEventListener('click',()=>this.result(this.progression.buySkill(button.dataset.skillNode!),'Skill rank learned. Saved for your next defense.')));
      content.querySelector('#reset-skills')!.addEventListener('click',()=>{const refund=this.progression.resetSkills();this.result(true,`Skills reset. ${refund} XP returned.`);});
    }else if(this.tab==='capstones'){
      content.innerHTML=`<p class="meta-note">Seven permanent battle upgrades. Spend XP after developing the required branches.</p><div class="meta-grid">${CAPSTONES.map(item=>{
        const owned=state.capstones.includes(item.id),requirements=Object.entries(item.requires).map(([branch,ranks])=>`${SKILL_BRANCHES.find(b=>b.id===branch)?.name||branch}: ${ranks} ranks`).join(' · ');
        return `<article class="meta-card ${owned?'owned':''}"><small>CAPSTONE</small><h3>${item.name}</h3><p>${item.description}</p><p class="meta-requires">${requirements}${item.totalRanks?` · ${item.totalRanks} total ranks`:''}</p><button data-capstone="${item.id}" ${this.progression.canBuyCapstone(item.id)?'':'disabled'}>${owned?'Unlocked':`Unlock · ${item.cost} XP`}</button></article>`;
      }).join('')}</div>`;
      content.querySelectorAll<HTMLButtonElement>('[data-capstone]').forEach(button=>button.addEventListener('click',()=>this.result(this.progression.buyCapstone(button.dataset.capstone!),'Capstone unlocked for your next defense.')));
    }else if(this.tab==='shop'){
      content.innerHTML=`<p class="meta-note">First clears and better star ratings award gems. Tower unlocks are permanent; building them still costs gold.</p><div class="meta-grid">${SHOP_ITEMS.map(item=>{
        const rank=state.shopRanks[item.id]||0,cost=this.progression.getShopCost(item.id);
        return `<article class="meta-card ${rank?'owned':''}"><small>${item.tower?'TOWER UNLOCK':`RANK ${rank}/${item.maxRank}`}</small><h3>${item.name}</h3><p>${item.description}</p><button data-shop-item="${item.id}" ${this.progression.canShopPurchase(item.id)?'':'disabled'}>${rank>=item.maxRank?'Owned':`${item.tower?'Unlock':'Improve'} · ${cost} gems`}</button></article>`;
      }).join('')}</div>`;
      content.querySelectorAll<HTMLButtonElement>('[data-shop-item]').forEach(button=>button.addEventListener('click',()=>this.result(this.progression.shopPurchase(button.dataset.shopItem!),'Purchase saved. Available in your next fresh defense.')));
    }else{
      content.innerHTML=`<p class="meta-note">24 enemy types. Physical damage meets armor; elemental damage meets matching resistance. Negative resistance means a weakness. Truesight reveals stealth and ghosts; elemental towers can strike ghosts.</p><div class="meta-grid bestiary-grid">${ENEMY_KINDS.map(kind=>{
        const enemy=ENEMY_DEFS[kind],flags=[enemy.flying?'Flying':'Ground',enemy.stealth?'Stealth':'',enemy.ghost?'Ghost':'',enemy.ccImmune?'Control immune':'',enemy.dodge?'Dodge':'',enemy.splitInto?'Splits on defeat':'',enemy.teleportInterval?'Teleports':'',enemy.heal?'Heals allies':'',enemy.summon?'Summons troops':''].filter(Boolean);
        return `<article class="meta-card" data-enemy-guide="${kind}"><small>${flags.join(' · ')}</small><h3>${enemy.name}</h3><p>${enemy.ability?`${enemy.ability}<br>`:''}${enemy.hp} health · ${enemy.speed} speed · ${Math.round(enemy.armor*100)}% armor · leaks ${enemy.leak} lives</p><p>${Object.entries(enemy.resistances).map(([type,resist])=>`${type} ${Math.round(resist!*100)}%`).join(' · ')||'No elemental resistance'}</p></article>`;
      }).join('')}</div>`;
    }
  }
}
