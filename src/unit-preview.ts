import { ENEMY_DEFS, type EnemyKind } from './game/model';
import { sampleWalkCycle, animationTick } from './render/walk-cycle';
import { UNIT_KINDS, UNIT_NAMES, getWalkingAsset } from './walking-assets';

/** A close-up of the same atlases and distance-based frame selector used in combat. */
export class UnitPreview {
  private readonly images = new Map<EnemyKind, HTMLImageElement>();
  private readonly distances = new Map<EnemyKind, number>();
  private frameRequest = 0;
  private lastTime = 0;
  private presentationTime = 0;
  private lastPoseTick = -1;
  private active = false;
  private paused = false;
  private slowed = false;
  private lastReduced = false;
  constructor(private readonly reduced: () => boolean) {
    const list = document.getElementById('unit-preview-list')!;
    list.innerHTML = UNIT_KINDS.map(kind => {
      const asset = getWalkingAsset(kind);
      return `<figure class="unit-preview-card"><canvas data-walk-kind="${kind}" data-src="${asset.url}" data-frame-width="${asset.frameWidth}" data-frame-height="${asset.frameHeight}" data-frame-count="${asset.frameCount}" data-fps="${asset.fps}" data-frame="0" role="img" aria-label="${UNIT_NAMES[kind]} walking animation"></canvas><figcaption><strong>${UNIT_NAMES[kind]}</strong><span>${kind === 'runner' ? 'Quick running stride' : kind === 'brute' ? 'Heavy armored steps' : kind === 'boss' ? 'Deliberate warlord march' : 'Alternating goblin steps'}</span></figcaption></figure>`;
    }).join('');
    for (const kind of UNIT_KINDS) {
      this.distances.set(kind, 0);
      const image = new Image(); image.onload = () => this.draw();
      image.onerror = () => { document.getElementById('preview-status')!.textContent = 'A unit preview could not be loaded.'; };
      image.src = getWalkingAsset(kind).url; this.images.set(kind, image);
      const canvas = this.canvas(kind), density = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(192 * density); canvas.height = Math.round(160 * density);
    }
    document.getElementById('preview-play')!.addEventListener('click', () => { this.paused = !this.paused; this.controls(); this.draw(); });
    document.getElementById('preview-slow')!.addEventListener('click', () => { this.slowed = !this.slowed; this.controls(); });
    this.controls();
  }
  private canvas(kind: EnemyKind): HTMLCanvasElement { return document.querySelector(`canvas[data-walk-kind="${kind}"]`)!; }
  open(): void {
    this.active = true; this.paused = false; this.slowed = false; this.lastTime = 0;this.presentationTime=0;this.lastPoseTick=-1;
    for (const kind of UNIT_KINDS) this.distances.set(kind, 0);
    this.controls(); this.draw(); cancelAnimationFrame(this.frameRequest);
    this.frameRequest = requestAnimationFrame(this.update);
  }
  close(): void { this.active = false; cancelAnimationFrame(this.frameRequest); this.frameRequest = 0; }
  private controls(): void {
    const play = document.getElementById('preview-play')!;
    play.setAttribute('aria-pressed', String(this.paused || this.reduced()));
    this.lastReduced = this.reduced();
    (play as HTMLButtonElement).disabled = this.lastReduced;
    play.textContent = this.lastReduced ? 'Reduced motion enabled' : this.paused ? 'Play walking cycles' : 'Pause walking cycles';
    document.getElementById('preview-slow')!.setAttribute('aria-pressed', String(this.slowed));
    document.getElementById('preview-status')!.textContent = this.reduced() ? 'Reduced motion: neutral contact poses.' : this.paused ? 'Paused on the current pose.' : this.slowed ? 'Slow motion: inspect each footfall.' : '24-fps interpolated cycles. The battle stays paused during this preview.';
  }
  private update = (time: number): void => {
    if (!this.active) return;
    const changedMotion = this.lastReduced !== this.reduced();
    if (changedMotion) this.controls();
    const delta = this.lastTime === 0 ? 0 : Math.min(.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    if (!this.paused && !this.reduced() && !document.hidden) {
      this.presentationTime += delta;
      for (const kind of UNIT_KINDS) this.distances.set(kind, this.distances.get(kind)! + ENEMY_DEFS[kind].speed * delta * (this.slowed ? .35 : 1));
    }
    const tick=animationTick(this.presentationTime);
    if(tick!==this.lastPoseTick||changedMotion){this.draw();this.lastPoseTick=tick;}
    this.frameRequest = requestAnimationFrame(this.update);
  };
  private draw(): void {
    for (const kind of UNIT_KINDS) {
      const canvas = this.canvas(kind), context = canvas.getContext('2d'), image = this.images.get(kind);
      if (!context || !image?.complete || !image.naturalWidth) continue;
      const asset = getWalkingAsset(kind), walk = sampleWalkCycle(kind, this.distances.get(kind) ?? 0, 0, this.reduced());
      canvas.dataset.frame = String(walk.frame);
      const density = canvas.width / 192;
      context.setTransform(density, 0, 0, density, 0, 0); context.clearRect(0, 0, 192, 160);
      context.fillStyle = '#0005'; context.beginPath(); context.ellipse(96, 140, 29, 7, 0, 0, Math.PI * 2); context.fill();
      const scale = 106 / asset.bodyHeight, width = asset.frameWidth * scale, height = asset.frameHeight * scale;
      context.imageSmoothingEnabled = true;
      context.drawImage(image, walk.frame * asset.frameWidth, 0, asset.frameWidth, asset.frameHeight,
        96 - width * asset.origin.x, 140 - height * asset.origin.y, width, height);
    }
  }
}
