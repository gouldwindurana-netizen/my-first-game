import { Progression, SKILL_BRANCHES, SKILL_NODES, CAPSTONES, SHOP_ITEMS, type SkillBranchId } from './game/progression';
import { ENEMY_KINDS, ENEMY_DEFS, TOWER_KINDS, TOWER_DEFS, type TowerKind } from './game/catalog';
import { towerArt } from './asset-art';
import './progression-ui.css';

export type ProgressionTab = 'skills' | 'research' | 'capstones' | 'shop' | 'bestiary';
type Tab = ProgressionTab;
interface Callbacks { onOpen:()=>void; onClose:()=>void; onChange:()=>void; }

/** A bounded DOM journal; upgrades are saved here and applied at the next fresh defense. */
export class ProgressionUI {
  readonly element: HTMLDivElement;
  private tab: Tab = 'skills';
  private branch: SkillBranchId | 'overview' = 'overview';
  private selectedNode: string | null = null;
  private researchFamily: TowerKind = 'archer';
  private returnFocus: HTMLElement | null = null;
  constructor(private progression: Progression, private callbacks: Callbacks) {
    this.element = document.createElement('div');
    this.element.id = 'progression'; this.element.className = 'modal-backdrop'; this.element.hidden = true;
    this.element.innerHTML = `<section class="modal progression-modal" role="dialog" aria-modal="true" aria-labelledby="progression-title">
      <button id="progression-close" class="modal-close" aria-label="Close progression">×</button>
      <span class="eyebrow">THE WARDEN'S LEGACY</span><h2 id="progression-title">Grow beyond the battlefield</h2>
      <div id="meta-wallet" class="meta-wallet" aria-live="polite"></div>
      <p class="meta-note">Earn account XP and gems by defending stages. Account purchases apply to your next fresh defense; family XP unlocks tower research as you fight.</p>
      <div class="meta-tabs" role="tablist" aria-label="Progression and enemy guide">${(['skills','research','capstones','shop','bestiary'] as Tab[]).map(tab=>`<button id="meta-tab-${tab}" data-meta-tab="${tab}" role="tab" aria-controls="meta-content">${tab==='skills'?'Skill tree':tab==='research'?'Tower mastery':tab==='bestiary'?'Enemy guide':tab[0].toUpperCase()+tab.slice(1)}</button>`).join('')}</div>
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
  open(tab:Tab='skills',kind?:TowerKind){
    if(kind&&TOWER_KINDS.includes(kind))this.researchFamily=kind;
    if(this.isOpen){this.tab=tab;this.render();this.element.querySelector<HTMLButtonElement>(`[data-meta-tab="${tab}"]`)?.focus();return;}
    this.returnFocus=document.activeElement as HTMLElement|null;this.tab=tab;
    this.callbacks.onOpen();this.element.hidden=false;this.render();
    this.element.querySelector<HTMLButtonElement>('#progression-close')!.focus();
  }
  openResearch(kind?:TowerKind){this.open('research',kind);}
  close(){if(!this.isOpen)return;this.element.hidden=true;this.callbacks.onClose();if(this.returnFocus?.getClientRects().length)this.returnFocus.focus();}
  refresh(){if(this.isOpen)this.render();}
  private result(ok:boolean,message:string){
    const active=document.activeElement as HTMLElement|null;
    const focusKey=active&&['skillNode','skillBuy','capstone','shopItem'].find(key=>active.dataset[key]);
    const focusValue=focusKey?active?.dataset[focusKey]:null;
    this.callbacks.onChange();this.render();
    this.element.querySelector('#meta-feedback')!.textContent=ok?message:'Requirements are not met, or you need more currency.';
    const selector=focusKey&&focusValue?`[data-${focusKey.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}="${focusValue}"]`:null;
    const restored=selector?this.element.querySelector<HTMLButtonElement>(selector):null;
    if(restored&&!restored.disabled)restored.focus();else if(this.tab==='skills'&&this.selectedNode)this.element.querySelector<HTMLButtonElement>(`[data-skill-node="${this.selectedNode}"]`)?.focus();else this.element.querySelector<HTMLButtonElement>(`[data-meta-tab="${this.tab}"]`)?.focus();
  }
  private renderResearch(content:HTMLElement){
    const kind=this.researchFamily,def=TOWER_DEFS[kind],research=this.progression.towerResearch(kind);
    const xp=research[0].xp,next=research.find(item=>!item.unlocked),unlocked=research.filter(item=>item.unlocked).length;
    const families=this.progression.unlockedTowers,familyUnlocked=families.includes(kind);
    const totalXP=Object.values(this.progression.towerMastery).reduce((sum,value)=>sum+(value||0),0);
    const number=(value:number)=>value.toLocaleString();
    content.innerHTML=`<div class="research-intro"><div><span class="research-kicker">THE TOWER ARCHIVE</span><h3>Practice becomes power</h3></div><span class="research-total">${TOWER_KINDS.length} families · ${number(totalXP)} family XP saved</span></div>
      <p class="meta-note research-explainer">Towers earn family XP by fighting, controlling enemies, deploying troops, and supporting allies. Research unlocks automatically; XP is never spent and survives defeats and replays.</p>
      <div class="research-toolbar"><label for="research-family">Inspect tower family<select id="research-family">${TOWER_KINDS.map(item=>`<option value="${item}" ${item===kind?'selected':''}>${TOWER_DEFS[item].name}${families.includes(item)?'':' · gem locked'}</option>`).join('')}</select></label><p>Skill tree purchases use your separate account XP.</p></div>
      <div class="research-layout"><nav class="research-families" aria-label="Tower families">${TOWER_KINDS.map(item=>{
        const entries=this.progression.towerResearch(item),familyXP=entries[0].xp,learned=entries.filter(entry=>entry.unlocked).length,locked=!families.includes(item);
        return `<button class="research-family ${item===kind?'selected':''} ${locked?'gem-locked':''}" data-research-family="${item}" aria-pressed="${item===kind}" aria-controls="research-detail" aria-label="Inspect ${TOWER_DEFS[item].name}, ${number(familyXP)} family XP, ${learned} of ${entries.length} researched${locked?', family gem locked':''}"><span class="research-family-art">${towerArt(item)}</span><span class="research-family-label"><strong>${TOWER_DEFS[item].name}</strong><small>${number(familyXP)} XP · ${learned}/${entries.length}${locked?' · ◇ gems':''}</small></span></button>`;
      }).join('')}</nav>
      <article id="research-detail" class="research-detail" data-research-detail="${kind}" aria-labelledby="research-family-title"><div class="research-family-heading"><div class="research-portrait">${towerArt(kind)}</div><div><span class="research-kicker">${def.role}</span><h3 id="research-family-title">${def.name}</h3><p>${def.description}</p><div class="research-family-score"><strong>${number(xp)} <small>family XP</small></strong><span>${unlocked} / ${research.length} researched</span></div></div></div>
        ${familyUnlocked?`<div class="research-access"><span aria-hidden="true">◆</span><span>Family available · build for <b>${def.cost} gold</b></span></div>`:`<div class="research-access gem-locked"><span aria-hidden="true">◇</span><div><b>Family locked · ${def.premiumCost} gems</b><span>Unlock this family in the shop, then build it for ${def.cost} gold and earn its XP in battle.</span></div><button id="research-gem-shop">View gem unlock</button></div>`}
        <div class="research-next" data-research-next="${next?.key||'complete'}"><div><span>${next?`Next research · ${next.name}`:'All family research complete'}</span><b>${next?`${number(xp)} / ${number(next.requiredXP)} XP`:`${research.length} / ${research.length} unlocked`}</b></div>${next?`<progress value="${Math.min(xp,next.requiredXP)}" max="${next.requiredXP}" aria-label="${def.name} XP toward ${next.name}"></progress><small>${number(next.remaining)} more family XP unlocks this upgrade automatically.</small>`:'<small>Every upgrade is researched. Gold and field experience still apply to each placed tower.</small>'}</div>
        <div class="research-paths" aria-label="${def.name} upgrade research">${research.map(item=>{
          const tier2=item.key==='II',branch=tier2?null:def.branches[item.key as 'A'|'B'|'C'|'D'];
          const description=tier2?(def.tier2Description||(kind==='barracks'?'Stronger, tougher soldiers and greater rally reach.':'Improves tower power, range, and firing speed.')):branch!.description;
          const cost=tier2?def.tier2Cost:branch!.cost;
          return `<section class="research-path ${tier2?'tier-two':''} ${item.unlocked?'researched':'locked'}" data-research-key="${item.key}" data-research-unlocked="${item.unlocked}" aria-labelledby="research-title-${item.key}"><div class="research-path-top"><span class="research-path-key" aria-hidden="true">${item.key}</span><div><small>${tier2?'TIER II':`BRANCH ${item.key}${item.key==='D'?' · HELL ONLY':''}`}</small><h4 id="research-title-${item.key}">${item.name}</h4></div><span class="research-path-seal" aria-hidden="true">${item.unlocked?'✓':'◇'}</span></div><p>${description}</p><div class="research-requirement"><span>${item.unlocked?'Research complete':`${number(item.remaining)} XP to unlock`}</span><b>${number(item.requiredXP)} family XP</b></div><progress value="${Math.min(xp,item.requiredXP)}" max="${item.requiredXP}" aria-label="${item.name} research"></progress><div class="research-field-cost"><b>${cost} gold</b><span>${tier2?'After a defended wave':'Tier II · wave 3 or later'}${item.key==='D'?' · Hell difficulty':''}</span></div></section>`;
        }).join('')}</div><p class="research-field-note">Research gives permanent access. Buy upgrades with gold in each defense. A tower must defend a wave before Tier II, then another wave before choosing one branch, from wave 3 onward. Branch D requires Hell difficulty.</p></article></div>`;
    const select=(selected:TowerKind,fromSelect=false)=>{
      const roster=content.querySelector<HTMLElement>('.research-families'),scrollTop=roster?.scrollTop||0,scrollLeft=roster?.scrollLeft||0;
      this.researchFamily=selected;this.render();
      const updated=content.querySelector<HTMLElement>('.research-families');if(updated){updated.scrollTop=scrollTop;updated.scrollLeft=scrollLeft;}
      const target=this.element.querySelector<HTMLElement>(fromSelect?'#research-family':`[data-research-family="${selected}"]`);
      target?.focus({preventScroll:true});
      if(!fromSelect)target?.scrollIntoView({block:'nearest',inline:'nearest'});
    };
    content.querySelector<HTMLSelectElement>('#research-family')!.addEventListener('change',event=>select((event.target as HTMLSelectElement).value as TowerKind,true));
    content.querySelectorAll<HTMLButtonElement>('[data-research-family]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.researchFamily as TowerKind)));
    content.querySelector('.research-families')!.addEventListener('keydown',event=>{
      const key=(event as KeyboardEvent).key,current=TOWER_KINDS.indexOf((document.activeElement as HTMLElement)?.dataset.researchFamily as TowerKind);
      if(current<0||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(key))return;
      event.preventDefault();
      const nextIndex=key==='Home'?0:key==='End'?TOWER_KINDS.length-1:(current+(['ArrowDown','ArrowRight'].includes(key)?1:-1)+TOWER_KINDS.length)%TOWER_KINDS.length;
      select(TOWER_KINDS[nextIndex]);
    });
    content.querySelector('#research-gem-shop')?.addEventListener('click',()=>{
      this.tab='shop';this.render();
      const item=SHOP_ITEMS.find(item=>item.tower===kind),button=item?content.querySelector<HTMLButtonElement>(`[data-shop-item="${item.id}"]`):null;
      button?.scrollIntoView({block:'center'});button?.focus({preventScroll:true});
    });
  }
  private renderSkills(content:HTMLElement){
    const state=this.progression.state,branch=SKILL_BRANCHES.find(item=>item.id===this.branch);
    const nodes=branch?SKILL_NODES.filter(node=>node.branch===branch.id):[];
    if(branch&&!nodes.some(node=>node.id===this.selectedNode))this.selectedNode=nodes[0].id;
    const selected=nodes.find(node=>node.id===this.selectedNode);
    const positions=[{x:50,y:48},{x:25,y:164},{x:75,y:164},{x:100/6,y:280},{x:50,y:280},{x:500/6,y:280},{x:100/6,y:396},{x:50,y:396},{x:500/6,y:396},{x:50,y:512}];
    const status=(id:string)=>{
      const node=SKILL_NODES.find(item=>item.id===id)!,rank=state.skillRanks[id]||0;
      return rank>=node.maxRank?'maxed':rank>0?'learned':node.prerequisites.some(parent=>!state.skillRanks[parent])?'locked':this.progression.canBuySkill(id)?'available':'ready';
    };
    const branchControls=SKILL_BRANCHES.map(item=>`<button data-skill-branch="${item.id}" aria-pressed="${this.branch===item.id}"><span>${item.name}</span><small>${this.progression.branchRanks(item.id)} / 32 ranks</small></button>`).join('');
    content.innerHTML=`<div class="skill-toolbar"><label>View skill paths<select id="skill-branch"><option value="overview" ${this.branch==='overview'?'selected':''}>Whole tree</option>${SKILL_BRANCHES.map(item=>`<option value="${item.id}" ${item.id===this.branch?'selected':''}>${item.name} · ${this.progression.branchRanks(item.id)} ranks</option>`).join('')}</select></label><span>100 connected nodes · 10 branches</span>${branch?'<button id="skill-tree-overview" class="skill-overview-back">Whole tree</button>':''}</div>
      <nav class="skill-branch-nav" aria-label="Skill branches">${branchControls}</nav>
      ${branch?`<div class="skill-path-heading"><h3>${branch.name}</h3><p>${branch.description} Learn one rank in each connected parent to open the next paths.</p></div><div class="skill-tree-layout"><div class="skill-tree-stage" role="group" aria-label="${branch.name} skill paths"><svg class="skill-tree-edges" viewBox="0 0 100 560" preserveAspectRatio="none" aria-hidden="true">${nodes.flatMap((node,index)=>node.prerequisites.map(parent=>{
        const from=positions[nodes.findIndex(item=>item.id===parent)],to=positions[index],learned=!!state.skillRanks[parent];
        return `<path data-skill-from="${parent}" data-skill-to="${node.id}" class="${learned?'learned':''}" d="M ${from.x} ${from.y} C ${from.x} ${(from.y+to.y)/2}, ${to.x} ${(from.y+to.y)/2}, ${to.x} ${to.y}"/>`;
      })).join('')}</svg>${nodes.map((node,index)=>{
        const rank=state.skillRanks[node.id]||0,point=positions[index],nodeStatus=status(node.id),cost=this.progression.getSkillCost(node.id);
        return `<button class="skill-tree-node ${nodeStatus} ${selected?.id===node.id?'selected':''}" data-skill-node="${node.id}" data-skill-state="${nodeStatus}" style="left:${point.x}%;top:${point.y}px" aria-pressed="${selected?.id===node.id}" aria-controls="skill-node-detail" aria-label="${node.name}, rank ${rank} of ${node.maxRank}, ${nodeStatus}${rank<node.maxRank?`, next rank ${cost} XP`:''}"><span class="skill-node-rune" aria-hidden="true">${rank>=node.maxRank?'✦':rank>0?'◆':'◇'}</span><strong>${node.name}</strong><small>${rank} / ${node.maxRank}</small></button>`;
      }).join('')}</div><aside id="skill-node-detail" class="skill-tree-detail" aria-label="Selected skill" aria-live="polite">${selected?`<small>${status(selected.id)==='locked'?'LOCKED PATH':status(selected.id)==='maxed'?'MASTERED PATH':'SELECTED SKILL'}</small><h3>${selected.name}</h3><p>${selected.description}</p><p class="skill-detail-rank">Rank ${state.skillRanks[selected.id]||0} / ${selected.maxRank}</p><div class="skill-prerequisites"><b>Connected parents</b>${selected.prerequisites.length?selected.prerequisites.map(parent=>`<span class="${state.skillRanks[parent]?'learned':''}">${state.skillRanks[parent]?'✓':'○'} ${SKILL_NODES.find(node=>node.id===parent)!.name} · 1 rank</span>`).join(''):'<span>Root skill · no parent required</span>'}</div><button data-skill-buy="${selected.id}" ${this.progression.canBuySkill(selected.id)?'':'disabled'}>${(state.skillRanks[selected.id]||0)>=selected.maxRank?'Fully mastered':`Learn rank ${(state.skillRanks[selected.id]||0)+1} · ${this.progression.getSkillCost(selected.id)} XP`}</button>${!this.progression.canBuySkill(selected.id)&&(state.skillRanks[selected.id]||0)<selected.maxRank?`<p class="skill-unlock-hint">${selected.prerequisites.some(parent=>!state.skillRanks[parent])?'Learn the marked parent skills to connect this path.':'Earn more XP from stage defenses to learn this rank.'}</p>`:''}`:''}</aside></div><div class="skill-tree-legend"><span>◇ Locked</span><span>◇ Available</span><span>◆ Learned</span><span>✦ Mastered</span></div>`:`<div class="skill-tree-overview"><div class="skill-tree-core"><span aria-hidden="true">✦</span><h3>Warden’s Legacy</h3><p>Choose a branch. Follow its connected paths from root skills to mastery.</p></div><div class="skill-tree-roots">${SKILL_BRANCHES.map(item=>`<button data-tree-root="${item.id}" data-skill-branch="${item.id}" class="${this.progression.branchRanks(item.id)?'learned':''}"><span class="tree-root-rune" aria-hidden="true">${this.progression.branchRanks(item.id)?'◆':'◇'}</span><strong>${item.name}</strong><small>${this.progression.branchRanks(item.id)} / 32 ranks</small><span>Explore paths</span></button>`).join('')}</div></div><p class="meta-note">Paths fork into choices and reconnect at mastery. Each node keeps its three ranks, with five ranks at the final mastery node.</p>`}
      <button id="reset-skills" class="meta-secondary" ${this.progression.totalRanks||state.capstones.length?'':'disabled'}>Reset skills and capstones · recover 80% of spent XP</button>`;
    if(!branch)content.querySelector('.skill-branch-nav')?.remove();
    const setBranch=(id:string,focusSelector:string)=>{this.branch=id as SkillBranchId|'overview';this.selectedNode=null;this.render();this.element.querySelector<HTMLElement>(focusSelector)?.focus();};
    content.querySelector<HTMLSelectElement>('#skill-branch')!.addEventListener('change',event=>setBranch((event.target as HTMLSelectElement).value,'#skill-branch'));
    content.querySelector('#skill-tree-overview')?.addEventListener('click',()=>setBranch('overview','#skill-branch'));
    content.querySelectorAll<HTMLButtonElement>('[data-skill-branch]').forEach(button=>button.addEventListener('click',()=>setBranch(button.dataset.skillBranch!,button.dataset.treeRoot?`[data-skill-node="${button.dataset.skillBranch}-1"]`:`[data-skill-branch="${button.dataset.skillBranch}"]`)));
    const select=(id:string)=>{this.selectedNode=id;this.render();this.element.querySelector<HTMLButtonElement>(`[data-skill-node="${id}"]`)?.focus();};
    content.querySelectorAll<HTMLButtonElement>('[data-skill-node]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.skillNode!)));
    content.querySelector<HTMLButtonElement>('[data-skill-buy]')?.addEventListener('click',event=>this.result(this.progression.buySkill((event.currentTarget as HTMLButtonElement).dataset.skillBuy!),'Skill rank learned. Its connected paths are now available.'));
    content.querySelector('.skill-tree-stage')?.addEventListener('keydown',event=>{
      const key=(event as KeyboardEvent).key,current=nodes.findIndex(node=>node.id===(document.activeElement as HTMLElement)?.dataset.skillNode);
      if(current<0||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(key))return;
      event.preventDefault();let next=current;
      if(key==='Home')next=0;else if(key==='End')next=nodes.length-1;else{
        const point=positions[current],horizontal=key==='ArrowLeft'||key==='ArrowRight',direction=key==='ArrowLeft'||key==='ArrowUp'?-1:1;
        const choices=positions.map((p,index)=>({index,along:horizontal?(p.x-point.x)*direction:(p.y-point.y)*direction,across:horizontal?Math.abs(p.y-point.y):Math.abs(p.x-point.x)})).filter(value=>value.index!==current&&value.along>0&&(!horizontal||value.across<1)).sort((a,b)=>horizontal?a.along-b.along:a.along+a.across*2-(b.along+b.across*2));
        if(choices.length)next=choices[0].index;
      }
      select(nodes[next].id);
    });
    content.querySelector('#reset-skills')!.addEventListener('click',()=>{const refund=this.progression.resetSkills();this.result(true,`Skills reset. ${refund} XP returned.`);});
  }
  private render(){
    const state=this.progression.state;
    const branchView=this.tab==='skills'&&this.branch!=='overview';
    this.element.classList.toggle('skill-branch-view',branchView);
    this.element.classList.toggle('research-view',this.tab==='research');
    this.element.querySelector('#progression-title')!.textContent=this.tab==='research'?'Tower mastery':branchView?`${SKILL_BRANCHES.find(item=>item.id===this.branch)?.name||'Skill'} paths`:'Grow beyond the battlefield';
    this.element.querySelector('#meta-wallet')!.textContent=`${state.xp.toLocaleString()} account XP · ${state.gems.toLocaleString()} gems · ${this.progression.totalRanks} skill ranks`;
    this.element.querySelectorAll<HTMLButtonElement>('[data-meta-tab]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.metaTab===this.tab));button.tabIndex=button.dataset.metaTab===this.tab?0:-1;});
    const content=this.element.querySelector<HTMLElement>('#meta-content')!;
    content.setAttribute('aria-labelledby',`meta-tab-${this.tab}`);
    this.element.querySelector('#meta-feedback')!.textContent='';
    if(this.tab==='skills'){
      this.renderSkills(content);
    }else if(this.tab==='research'){
      this.renderResearch(content);
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
      content.innerHTML=`<p class="meta-note">24 enemy types. Physical damage meets armor; elemental damage meets matching resistance. Negative resistance means a weakness. Arrow II lanterns and Ice II lenses reveal hidden foes to allies; base Magic and Prism detect immediately. Truesight is an optional premium ghost hunter. Elemental towers can strike visible ghosts.</p><div class="meta-grid bestiary-grid">${ENEMY_KINDS.map(kind=>{
        const enemy=ENEMY_DEFS[kind],flags=[enemy.flying?'Flying':'Ground',enemy.stealth?'Stealth':'',enemy.ghost?'Ghost':'',enemy.ccImmune?'Control immune':'',enemy.dodge?'Dodge':'',enemy.splitInto?'Splits on defeat':'',enemy.teleportInterval?'Teleports':'',enemy.heal?'Heals allies':'',enemy.summon?'Summons troops':''].filter(Boolean);
        return `<article class="meta-card" data-enemy-guide="${kind}"><small>${flags.join(' · ')}</small><h3>${enemy.name}</h3><p>${enemy.ability?`${enemy.ability}<br>`:''}${enemy.hp} health · ${enemy.speed} speed · ${Math.round(enemy.armor*100)}% armor · leaks ${enemy.leak} lives</p><p>${Object.entries(enemy.resistances).map(([type,resist])=>`${type} ${Math.round(resist!*100)}%`).join(' · ')||'No elemental resistance'}</p></article>`;
      }).join('')}</div>`;
    }
  }
}
