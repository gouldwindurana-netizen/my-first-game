import Phaser from 'phaser';
import { PADS, PATH_LENGTH, TOWER_DEFS, type GameModel, type Enemy, type EnemyKind, type TowerKind } from '../game/model';
import { suppliedAtlas, TOWER_ATLAS_URL, ENEMY_ATLAS_URL, TOWER_TEXTURE, ENEMY_TEXTURE } from '../asset-art';
import { walkPose, towerRecoil } from './animation-pose';

export function preloadAssetSheets(scene: Phaser.Scene): void {
  scene.load.image(TOWER_TEXTURE, TOWER_ATLAS_URL);
  scene.load.image(ENEMY_TEXTURE, ENEMY_ATLAS_URL);
}
export function prepareAssetFrames(scene: Phaser.Scene): void {
  for (const [name, frame] of Object.entries(suppliedAtlas.frames)) {
    const key = frame.sheet === 'core-tower-upgrades' ? TOWER_TEXTURE : ENEMY_TEXTURE;
    if (!scene.textures.exists(key)) throw new Error(`Missing supplied asset texture: ${key}`);
    const texture = scene.textures.get(key);
    if (!texture.has(name)) texture.add(name, 0, frame.x, frame.y, frame.width, frame.height);
  }
}
interface TowerView { image: Phaser.GameObjects.Image; born: number; upgrade: number; level: number; fired: number; fireSequence: number; state: string; }
interface EnemyView { image: Phaser.GameObjects.Image; enemy: Enemy; lastX: number; hp: number; hit: number; hitSequence: number; state: string; }
interface Particle { x: number; y: number; vx: number; vy: number; born: number; life: number; color: number; size: number; }
interface Ghost { image: Phaser.GameObjects.Image; born: number; scale: number; x: number; y: number; }
const enemyHeights: Record<EnemyKind, number> = { grunt: 36, runner: 34, brute: 48, boss: 70 };

/** Procedural poses preserve the supplied illustrations and their grounded sprite anchors. */
export class AssetViews {
  private readonly towers = new Map<number, TowerView>();
  private readonly enemies = new Map<number, EnemyView>();
  private readonly shadows: Phaser.GameObjects.Graphics;
  private readonly effects: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private ghosts: Ghost[] = [];
  private lastShot = 0;
  private lastTime = -1;
  private clock = 0;
  private reduced = false;
  private deaths = 0;
  constructor(private readonly scene: Phaser.Scene) {
    this.shadows = scene.add.graphics().setDepth(5.8);
    this.effects = scene.add.graphics().setDepth(8);
  }
  private burst(x: number, y: number, color: number, count: number, time: number): void {
    if (this.reduced) return;
    for (let i = 0; i < count && this.particles.length < 160; i++) {
      const angle = i * 2.39996 + time, speed = 15 + (i % 5) * 9;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, born: time, life: .35 + (i % 4) * .12, color, size: 1.5 + i % 3 });
    }
  }
  private clear(): void {
    for (const view of this.towers.values()) view.image.destroy();
    for (const view of this.enemies.values()) view.image.destroy();
    for (const view of this.ghosts) view.image.destroy();
    this.towers.clear(); this.enemies.clear(); this.ghosts = []; this.particles = []; this.lastShot = 0; this.deaths = 0;
  }
  sync(model: GameModel, time: number, reduced = false): void {
    if (model.time < this.lastTime) this.clear();
    this.lastTime = model.time; this.clock = time; this.reduced = reduced;
    const fx = this.effects.clear(); this.shadows.clear();
    if (reduced) { this.particles = []; for (const ghost of this.ghosts) ghost.image.destroy(); this.ghosts = []; }
    const towerIds = new Set(model.towers.map(t => t.id)), enemyIds = new Set(model.enemies.map(e => e.id));
    for (const [id, view] of this.towers) if (!towerIds.has(id)) { view.image.destroy(); this.towers.delete(id); }
    for (const [id, view] of this.enemies) if (!enemyIds.has(id)) {
      if (view.enemy.hp <= 0 && view.enemy.distance < PATH_LENGTH) {
        this.deaths++;
        if (!reduced && this.ghosts.length < 30) {
          this.ghosts.push({ image: view.image, born: time, scale: view.image.scaleX, x: view.enemy.x, y: view.enemy.y + 6 });
          this.burst(view.enemy.x, view.enemy.y - 12, 0xb3d39d, 9, time);
        } else view.image.destroy();
      } else view.image.destroy();
      this.enemies.delete(id);
    }
    // Only the originating shot belongs to a tower; chain jumps do not repeat its recoil.
    for (const shot of model.shots) if (shot.id > this.lastShot) {
      for (const tower of model.towers) {
        const pad = PADS[tower.padId];
        if (Math.abs(shot.from.x - pad.x) < 1 && Math.abs(shot.from.y - (pad.y - 22)) < 1) {
          const view = this.towers.get(tower.id);
          if (view) { view.fired = time; view.fireSequence++; }
        }
      }
      this.burst(shot.to.x, shot.to.y - 12, TOWER_DEFS[shot.kind].color, shot.kind === 'cannon' ? 10 : 4, time);
      this.lastShot = Math.max(this.lastShot, shot.id);
    }
    for (const tower of model.towers) {
      const pad = PADS[tower.padId], key = `${tower.kind}-${tower.level}`, frame = suppliedAtlas.frames[key];
      let view = this.towers.get(tower.id);
      if (!view) {
        view = { image: this.scene.add.image(pad.x, pad.y + 16, TOWER_TEXTURE, key).setOrigin(.5, 1), born: time, upgrade: -10, level: tower.level, fired: -10, fireSequence: 0, state: 'building' };
        this.towers.set(tower.id, view); this.burst(pad.x, pad.y + 4, 0xe8cd8a, 15, time);
      }
      if (view.level !== tower.level) { view.level = tower.level; view.upgrade = time; this.burst(pad.x, pad.y - 40, 0xffe6a5, 22, time); }
      const image = view.image;
      if (image.frame.name !== key) image.setFrame(key);
      const base = Math.min(([84, 100, 116][tower.level - 1] ?? 116) / frame.height, 95 / frame.width);
      const buildAge = time - view.born, upgradeAge = time - view.upgrade, fireAge = time - view.fired;
      const recoil = towerRecoil(tower.kind, fireAge, reduced);
      const build = reduced ? 1 : Math.min(1, buildAge / .34);
      const lift = !reduced && upgradeAge < .5 ? Math.sin(upgradeAge * Math.PI / .5) * 3 : 0;
      image.setScale(base * recoil.scaleX * (.85 + .15 * build), base * recoil.scaleY * (.35 + .65 * build));
      image.setPosition(pad.x + recoil.offsetX, pad.y + 16 + recoil.offsetY - lift).setRotation(recoil.rotation).setAlpha(reduced ? 1 : .5 + .5 * build);
      image.setDepth(6 + (pad.y + 16) / 1000).setName(`asset-tower-${tower.id}-${key}`);
      view.state = buildAge < .34 ? 'building' : upgradeAge < .5 ? 'upgrading' : fireAge < .36 ? 'firing' : 'idle';
      this.shadows.fillStyle(0x04101b, .25).fillEllipse(pad.x + 2, pad.y + 14, Math.min(66, image.displayWidth * .8), 22);
      const color = TOWER_DEFS[tower.kind].color;
      if (recoil.flash > 0) { fx.fillStyle(color, recoil.flash * .65).fillCircle(pad.x, pad.y - 53, tower.kind === 'cannon' ? 13 * recoil.flash : 8 * recoil.flash); }
      if (!reduced && (tower.kind === 'frost' || tower.kind === 'arcane')) this.magic(fx, tower.kind, pad.x, pad.y - image.displayHeight + 18, time, tower.id);
      if (!reduced && upgradeAge < .6) { fx.lineStyle(2, 0xffdf9d, 1 - upgradeAge / .6).strokeEllipse(pad.x, pad.y + 9, 40 + upgradeAge * 110, 18 + upgradeAge * 50); }
    }
    for (const enemy of model.enemies) {
      const key = `enemy-${enemy.kind}`, frame = suppliedAtlas.frames[key];
      let view = this.enemies.get(enemy.id);
      if (!view) { view = { image: this.scene.add.image(enemy.x, enemy.y + 6, ENEMY_TEXTURE, key).setOrigin(.5, 1), enemy, lastX: enemy.x, hp: enemy.hp, hit: -10, hitSequence: 0, state: 'walking' }; this.enemies.set(enemy.id, view); }
      if (enemy.hp < view.hp) { view.hit = time; view.hitSequence++; this.burst(enemy.x, enemy.y - 16, 0xf6d798, 4, time); }
      const dx = enemy.x - view.lastX;
      if (Math.abs(dx) > .03) view.image.setFlipX(dx < 0);
      const slow = enemy.slowUntil > model.time, pose = walkPose(enemy.kind, time, enemy.id, true, slow, reduced);
      const base = enemyHeights[enemy.kind] / frame.height;
      view.image.setScale(base * pose.scaleX, base * pose.scaleY).setRotation(pose.rotation);
      view.image.setPosition(enemy.x + pose.offsetX, enemy.y + 6 + pose.offsetY).setDepth(6 + (enemy.y + 6) / 1000).setName(`asset-enemy-${enemy.id}-${enemy.kind}`);
      // Alpha feedback works in both Phaser Canvas and WebGL renderers.
      view.image.setAlpha(time - view.hit < .12 ? .58 : 1);
      view.state = time - view.hit < .18 ? 'hit' : slow ? 'slowed' : 'walking';
      view.hp = enemy.hp; view.enemy = enemy; view.lastX = enemy.x;
      this.shadows.fillStyle(0x04101b, .28).fillEllipse(enemy.x + 1, enemy.y + 5, enemyHeights[enemy.kind] * .65, enemyHeights[enemy.kind] * .17);
      if (slow) { fx.lineStyle(1.5, 0x9fe9ff, .75).strokeEllipse(enemy.x, enemy.y + 4, enemyHeights[enemy.kind] * .75, enemyHeights[enemy.kind] * .23); }
    }
    this.ghosts = this.ghosts.filter(ghost => {
      const age = time - ghost.born, p = age / .42;
      if (p >= 1) { ghost.image.destroy(); return false; }
      ghost.image.setAlpha((1 - p) * .8).setRotation(p * .8).setPosition(ghost.x, ghost.y + p * 8).setScale(ghost.scale * (1 - p * .35));
      return true;
    });
    this.particles = this.particles.filter(particle => {
      const age = time - particle.born;
      if (age >= particle.life) return false;
      fx.fillStyle(particle.color, (1 - age / particle.life) * .85).fillCircle(particle.x + particle.vx * age, particle.y + particle.vy * age + 35 * age * age, particle.size * (1 - age / particle.life * .6));
      return true;
    });
  }
  private magic(fx: Phaser.GameObjects.Graphics, kind: TowerKind, x: number, y: number, time: number, id: number): void {
    const color = TOWER_DEFS[kind].color, phase = time * 1.8 + id;
    fx.fillStyle(color, .07 + (Math.sin(phase) + 1) * .035).fillCircle(x, y, 17);
    for (let i = 0; i < 3; i++) {
      const angle = phase + i * Math.PI * 2 / 3;
      fx.fillStyle(color, .75).fillCircle(x + Math.cos(angle) * 14, y + Math.sin(angle) * 8, 1.8);
    }
  }
  getSnapshot() {
    const pose = (image: Phaser.GameObjects.Image) => ({ x: image.x, y: image.y, scaleX: image.scaleX, scaleY: image.scaleY, rotation: image.rotation, alpha: image.alpha });
    return { time: this.clock, reduced: this.reduced, deaths: this.deaths, particles: this.particles.length, ghosts: this.ghosts.length,
      towers: [...this.towers].map(([id, v]) => ({ id, state: v.state, fireSequence: v.fireSequence, level: v.level, ...pose(v.image) })),
      enemies: [...this.enemies].map(([id, v]) => ({ id, state: v.state, hitSequence: v.hitSequence, ...pose(v.image) })) };
  }
  destroy(): void { this.clear(); this.shadows.destroy(); this.effects.destroy(); }
}
