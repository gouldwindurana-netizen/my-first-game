import Phaser from 'phaser';
import { PADS, type GameModel, type EnemyKind } from '../game/model';
import {
  suppliedAtlas, TOWER_ATLAS_URL, ENEMY_ATLAS_URL, TOWER_TEXTURE, ENEMY_TEXTURE,
} from '../asset-art';

/** The supplied sheets are irregular; explicit source rectangles avoid neighboring subjects. */
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

interface EnemyView {
  image: Phaser.GameObjects.Image;
  lastX: number;
}
const enemyHeights: Record<EnemyKind, number> = { grunt: 36, runner: 34, brute: 48, boss: 70 };

/** Disposable rendered objects; all combat and progression remain in GameModel. */
export class AssetViews {
  private readonly towers = new Map<number, Phaser.GameObjects.Image>();
  private readonly enemies = new Map<number, EnemyView>();
  private readonly shadows: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.shadows = scene.add.graphics().setDepth(5.8);
  }

  sync(model: GameModel, visualTimeSeconds: number): void {
    const towerIds = new Set(model.towers.map(tower => tower.id));
    const enemyIds = new Set(model.enemies.map(enemy => enemy.id));
    for (const [id, image] of this.towers) {
      if (!towerIds.has(id)) { image.destroy(); this.towers.delete(id); }
    }
    for (const [id, view] of this.enemies) {
      if (!enemyIds.has(id)) { view.image.destroy(); this.enemies.delete(id); }
    }
    this.shadows.clear();

    for (const tower of model.towers) {
      const pad = PADS.find(site => site.id === tower.padId);
      if (!pad) continue;
      const key = `${tower.kind}-${tower.level}`;
      const frame = suppliedAtlas.frames[key];
      let image = this.towers.get(tower.id);
      if (!image) {
        image = this.scene.add.image(pad.x, pad.y + 16, TOWER_TEXTURE, key).setOrigin(.5, 1);
        this.towers.set(tower.id, image);
      }
      if (image.frame.name !== key) image.setFrame(key);
      const desiredHeight = [84, 100, 116][tower.level - 1] ?? 116;
      image.setScale(Math.min(desiredHeight / frame.height, 95 / frame.width));
      image.setPosition(pad.x, pad.y + 16).setDepth(6 + (pad.y + 16) / 1000);
      image.setName(`asset-tower-${tower.id}-${key}`);
      this.shadows.fillStyle(0x04101b, .25).fillEllipse(pad.x + 2, pad.y + 14, Math.min(66, image.displayWidth * .8), 22);
    }

    for (const enemy of model.enemies) {
      const key = `enemy-${enemy.kind}`;
      const frame = suppliedAtlas.frames[key];
      let view = this.enemies.get(enemy.id);
      if (!view) {
        const image = this.scene.add.image(enemy.x, enemy.y + 6, ENEMY_TEXTURE, key).setOrigin(.5, 1);
        view = { image, lastX: enemy.x };
        this.enemies.set(enemy.id, view);
      }
      if (view.image.frame.name !== key) view.image.setFrame(key);
      const bob = visualTimeSeconds === 0 ? 0 : Math.sin(visualTimeSeconds * 10 + enemy.id * 1.7) * 1.2;
      const deltaX = enemy.x - view.lastX;
      if (Math.abs(deltaX) > .03) view.image.setFlipX(deltaX < 0);
      view.lastX = enemy.x;
      view.image.setScale(enemyHeights[enemy.kind] / frame.height);
      view.image.setPosition(enemy.x, enemy.y + 6 + bob).setDepth(6 + (enemy.y + 6) / 1000);
      view.image.setName(`asset-enemy-${enemy.id}-${enemy.kind}`);
      this.shadows.fillStyle(0x04101b, .28).fillEllipse(enemy.x + 1, enemy.y + 5, enemyHeights[enemy.kind] * .65, enemyHeights[enemy.kind] * .17);
      if (enemy.slowUntil > model.time) {
        this.shadows.lineStyle(1.5, 0x9fe9ff, .75).strokeEllipse(enemy.x, enemy.y + 4, enemyHeights[enemy.kind] * .75, enemyHeights[enemy.kind] * .23);
      }
    }
  }

  destroy(): void {
    for (const image of this.towers.values()) image.destroy();
    for (const view of this.enemies.values()) view.image.destroy();
    this.towers.clear();
    this.enemies.clear();
    this.shadows.destroy();
  }
}
