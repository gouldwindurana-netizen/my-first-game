import { LEVEL_ART } from './level-art';
import './main-menu.css';

export interface MainMenuData {
  canResume: boolean;
  completed: number;
  total: number;
  xp: number;
  gems: number;
  difficulty: string;
  hasProgress?: boolean;
  canChooseStage?: boolean;
}

interface MainMenuCallbacks {
  onCampaign: () => void;
  onContinue: () => void;
  onSkills: () => void;
  onSettings: () => void;
  onGuide: () => void;
}

/** Title-screen navigation stays separate from battle state and saved progression. */
export class MainMenu {
  readonly element: HTMLDivElement;
  private canResume = false;

  constructor(parent: HTMLElement, callbacks: MainMenuCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'main-menu';
    this.element.className = 'main-menu';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'main-menu-title');
    this.element.setAttribute('aria-describedby', 'main-menu-description');
    this.element.style.setProperty('--menu-world-art', `url("${LEVEL_ART.eldervale}")`);
    this.element.innerHTML = `
      <div class="menu-world" aria-hidden="true"></div>
      <div class="menu-frame" aria-hidden="true"></div>
      <div class="menu-content">
        <section class="menu-heading">
          <svg class="menu-crest" viewBox="0 0 92 108" fill="none" aria-hidden="true">
            <path d="M46 4 84 18 79 70 46 103 13 70 8 18Z" fill="#102b3b" stroke="currentColor" stroke-width="1.5"/>
            <path d="M46 13 75 24 71 66 46 92 21 66 17 24Z" stroke="currentColor" opacity=".35"/>
            <path d="M46 29v42m0-30-12 13m12-13 12 13M29 67l17 14 17-14M37 27l9-10 9 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="m6 49-4 14 8 11m76-25 4 14-8 11" stroke="currentColor" opacity=".6"/>
          </svg>
          <span class="menu-eyebrow">CHRONICLES OF THE RIFT</span>
          <h1 id="main-menu-title">Mossguard</h1>
          <div class="menu-title-rule" aria-hidden="true"><span>✦</span></div>
          <p id="main-menu-description">The old kingdom still needs its wardens.</p>
        </section>
        <nav class="menu-actions" aria-label="Main menu">
          <button id="menu-continue" class="menu-action menu-action-primary" hidden><span id="menu-continue-label">Continue campaign</span><span aria-hidden="true">›</span></button>
          <button id="menu-play" class="menu-action menu-action-primary"><span>Play campaign</span><span aria-hidden="true">›</span></button>
          <button id="menu-skills" class="menu-action"><span>Skill tree &amp; legacy</span><span aria-hidden="true">✧</span></button>
          <div class="menu-secondary">
            <button id="menu-settings" class="menu-action">Settings</button>
            <button id="menu-guide" class="menu-action">Field guide</button>
          </div>
        </nav>
        <section class="menu-progress" aria-label="Saved campaign progress">
          <div class="menu-progress-line"><span id="menu-difficulty">NORMAL CAMPAIGN</span><span id="menu-completion">0 / 12 stages secured</span></div>
          <div class="menu-progress-track" aria-hidden="true"><span id="menu-progress-fill"></span></div>
          <div id="menu-wallet" class="menu-wallet">0 XP <span aria-hidden="true">·</span> 0 gems</div>
        </section>
      </div>
      <aside class="menu-world-caption" aria-hidden="true"><span>THE WESTERN RIFT</span><strong>Stand together.<br>Hold the ancient road.</strong></aside>
      <footer class="menu-footer"><span>A tower defense campaign</span><span id="menu-resume-hint">Plan your defense. Shape your legacy.</span></footer>`;
    parent.appendChild(this.element);

    const actions: Record<string, () => void> = {
      'menu-play': callbacks.onCampaign,
      'menu-continue': callbacks.onContinue,
      'menu-skills': callbacks.onSkills,
      'menu-settings': callbacks.onSettings,
      'menu-guide': callbacks.onGuide,
    };
    for (const [id, action] of Object.entries(actions)) {
      this.element.querySelector<HTMLButtonElement>(`#${id}`)!.addEventListener('click', action);
    }
    this.element.addEventListener('keydown', event => {
      // A title-screen key must never trigger the battle hotkeys underneath it.
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        if (this.canResume) callbacks.onContinue();
      }
      if (event.key === 'Tab') {
        const buttons = [...this.element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(button => button.getClientRects().length);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
  }

  get isOpen(): boolean { return !this.element.hidden; }

  show(data: MainMenuData): void {
    const wasOpen = this.isOpen;
    const total = Number.isFinite(data.total) ? Math.max(1, Math.floor(data.total)) : 12;
    const completed = Number.isFinite(data.completed) ? Math.max(0, Math.min(total, Math.floor(data.completed))) : 0;
    this.canResume = data.canResume;
    const hasProgress = data.hasProgress ?? completed > 0;
    const continueButton = this.element.querySelector<HTMLButtonElement>('#menu-continue')!;
    continueButton.hidden = !data.canResume && !hasProgress;
    this.element.querySelector('#menu-continue-label')!.textContent = data.canResume ? 'Resume defense' : 'Continue campaign';
    const playButton = this.element.querySelector<HTMLButtonElement>('#menu-play')!;
    playButton.disabled = data.canChooseStage === false;
    playButton.title = playButton.disabled ? 'Resume and finish the current wave before choosing another stage.' : 'Choose a battlefield and difficulty.';
    playButton.classList.toggle('menu-action-primary', continueButton.hidden);
    const difficulty = data.difficulty ? data.difficulty.toUpperCase() : 'NORMAL';
    this.element.querySelector('#menu-difficulty')!.textContent = `${difficulty} CAMPAIGN`;
    this.element.querySelector('#menu-completion')!.textContent = `${completed} / ${total} stages secured`;
    this.element.querySelector<HTMLElement>('#menu-progress-fill')!.style.width = `${completed / total * 100}%`;
    const xp = Number.isFinite(data.xp) ? Math.max(0, Math.floor(data.xp)) : 0;
    const gems = Number.isFinite(data.gems) ? Math.max(0, Math.floor(data.gems)) : 0;
    this.element.querySelector('#menu-wallet')!.textContent = `${xp.toLocaleString()} XP · ${gems.toLocaleString()} gems`;
    this.element.querySelector('#menu-resume-hint')!.textContent = data.canResume ? 'Escape to resume your defense.' : 'Plan your defense. Shape your legacy.';
    this.element.hidden = false;
    if (!wasOpen) (continueButton.hidden ? playButton : continueButton).focus();
  }

  hide(): void { this.element.hidden = true; }
}
