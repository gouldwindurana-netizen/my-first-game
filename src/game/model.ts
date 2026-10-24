/** Deterministic game rules. All time values are seconds; no renderer or browser state. */
export type Point = { x: number; y: number };
export type TowerKind = 'archer' | 'cannon' | 'frost' | 'arcane';
export type EnemyKind = 'grunt' | 'runner' | 'brute' | 'boss';
export type GameStatus = 'building' | 'wave' | 'won' | 'lost';

export const PATH: Point[] = [
  { x: 68, y: 118 }, { x: 117, y: 132 }, { x: 210, y: 136 },
  { x: 265, y: 153 }, { x: 303, y: 183 }, { x: 320, y: 225 },
  { x: 328, y: 282 }, { x: 359, y: 325 }, { x: 425, y: 360 },
  { x: 502, y: 381 }, { x: 573, y: 381 }, { x: 634, y: 367 },
  { x: 675, y: 336 }, { x: 688, y: 285 }, { x: 682, y: 249 },
  { x: 648, y: 213 }, { x: 659, y: 190 }, { x: 713, y: 164 },
  { x: 765, y: 156 }, { x: 818, y: 173 }, { x: 858, y: 202 },
  { x: 869, y: 244 }, { x: 869, y: 293 }, { x: 889, y: 330 },
  { x: 936, y: 357 }, { x: 997, y: 387 }, { x: 1054, y: 418 },
  { x: 1140, y: 450 },
];

export const PADS = [
  { id: 0, x: 234, y: 241 }, { id: 1, x: 380, y: 153 },
  { id: 2, x: 422, y: 294 }, { id: 3, x: 529, y: 428 },
  { id: 4, x: 571, y: 237 }, { id: 5, x: 738, y: 250 },
  { id: 6, x: 813, y: 372 }, { id: 7, x: 961, y: 271 },
];

export const TOWER_DEFS: Record<TowerKind, {
  name: string; description: string; cost: number; damage: number;
  range: number; interval: number; color: number;
}> = {
  archer: { name: 'Ranger nest', description: 'Fast arrows. Excels against runners.', cost: 70, damage: 16, range: 170, interval: 0.65, color: 0xd8ba75 },
  cannon: { name: 'Ember cannon', description: 'Explosive shells. Breaks armor and groups.', cost: 120, damage: 43, range: 160, interval: 1.6, color: 0xec8b5e },
  arcane: { name: 'Arcane spire', description: 'Chain lightning jumps between nearby enemies.', cost: 100, damage: 24, range: 165, interval: 1.05, color: 0xb78dff },
  frost: { name: 'Frost shrine', description: 'Slows enemies by 45%. Combines with other towers.', cost: 90, damage: 9, range: 160, interval: 0.9, color: 0x88d9de },
};

export const ENEMY_DEFS: Record<EnemyKind, {
  hp: number; speed: number; reward: number; leak: number;
}> = {
  grunt: { hp: 52, speed: 48, reward: 11, leak: 1 },
  runner: { hp: 37, speed: 81, reward: 10, leak: 1 },
  brute: { hp: 165, speed: 35, reward: 24, leak: 2 },
  boss: { hp: 1800, speed: 25, reward: 180, leak: 8 },
};

export interface Enemy {
  id: number; kind: EnemyKind; x: number; y: number; hp: number; maxHp: number;
  distance: number; speed: number; slowUntil: number;
}
export interface Tower {
  id: number; padId: number; kind: TowerKind; level: number; cooldown: number; spent: number;
}
export interface Shot {
  id: number; kind: TowerKind; from: Point; to: Point; life: number; maxLife: number;
}
export interface FloatText {
  id: number; x: number; y: number; text: string; color: string; life: number;
}
export interface WaveDef {
  name: string; description: string; enemies: { kind: EnemyKind; delay: number }[];
}

const wave = (name: string, description: string, kinds: EnemyKind[], spacing = 1.2): WaveDef => ({
  name, description, enemies: kinds.map((kind, index) => ({ kind, delay: index * spacing })),
});
const many = (kind: EnemyKind, count: number): EnemyKind[] => Array.from({ length: count }, () => kind);
export const WAVES: WaveDef[] = [
  wave('Footsteps in the fern', 'A small scouting party. Build a ranger nest near the entrance.', many('grunt', 7), 1.55),
  wave('Quick on their feet', 'Fast runners join the attack. A frost shrine can buy time.', ['grunt', 'grunt', ...many('runner', 7), 'grunt', 'grunt'], 1.15),
  wave('Iron hides', 'Armored brutes resist arrows. Ember cannons ignore armor.', ['grunt', 'grunt', 'brute', 'runner', 'runner', 'brute', 'grunt', 'brute', 'grunt'], 1.4),
  wave('The gathering swarm', 'A close-packed swarm. Splash damage is your friend.', [...many('grunt', 13), ...many('runner', 5)], 0.65),
  wave('Heavy footsteps', 'Brutes lead the charge. Upgrade towers to level II.', ['brute', 'grunt', 'grunt', 'brute', 'runner', 'runner', 'brute', 'brute', 'grunt', 'brute', 'runner', 'brute'], 1.1),
  wave('Through the undergrowth', 'Runners dart between armored escorts.', [...many('runner', 8), 'brute', 'brute', ...many('runner', 8), 'brute'], 0.75),
  wave('Bramble battalion', 'A sustained mixed attack. Cover the second half of the trail.', ['brute', 'brute', ...many('grunt', 8), ...many('runner', 7), 'brute', 'brute', 'brute'], 0.85),
  wave('Nightfall rush', 'The fastest attack yet. Frost and splash work together.', [...many('runner', 13), ...many('brute', 6), ...many('grunt', 8)], 0.6),
  wave('The roots tremble', 'An armored vanguard. Save your meteor for tight groups.', [...many('brute', 10), ...many('runner', 12), ...many('brute', 4)], 0.85),
  wave('Shattered procession', 'Armored ranks march close together. Chain lightning punishes their formation.', ['brute', ...many('grunt', 7), 'brute', 'brute', ...many('runner', 9), ...many('brute', 6)], 0.72),
  wave('The violet breach', 'The portal surges. Upgrade your arcane spires and prepare for the king.', [...many('runner', 10), ...many('brute', 8), ...many('grunt', 10), ...many('brute', 4)], 0.64),
  wave('The Hollow King', 'The forest stands with you. Defeat the king and his final guard.', ['brute', 'brute', 'boss', ...many('runner', 8), ...many('brute', 7), ...many('grunt', 8)], 1.05),
];

const lengths = PATH.slice(1).map((point, index) => Math.hypot(point.x - PATH[index].x, point.y - PATH[index].y));
export const PATH_LENGTH = lengths.reduce((sum, length) => sum + length, 0);

export function positionAt(distance: number): Point {
  let remaining = Math.max(0, distance);
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const fraction = remaining / lengths[index];
      return { x: PATH[index].x + (PATH[index + 1].x - PATH[index].x) * fraction, y: PATH[index].y + (PATH[index + 1].y - PATH[index].y) * fraction };
    }
    remaining -= lengths[index];
  }
  return { ...PATH[PATH.length - 1] };
}

export class GameModel {
  gold = 240;
  lives = 20;
  wave = 0;
  status: GameStatus = 'building';
  paused = false;
  speed = 1;
  time = 0;
  kills = 0;
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  floats: FloatText[] = [];
  meteorCooldown = 0;
  private nextId = 1;
  private pending: WaveDef['enemies'] = [];
  private waveTime = 0;
  private clearedAt = 0;

  get waveRemaining(): number { return this.pending.length + this.enemies.length; }
  get earlyBonus(): number {
    return this.status === 'building' && this.wave > 0 ? Math.max(0, Math.ceil(24 * (1 - (this.time - this.clearedAt) / 12))) : 0;
  }

  private get actionable(): boolean { return this.status !== 'won' && this.status !== 'lost'; }

  build(padId: number, kind: TowerKind): boolean {
    const def = TOWER_DEFS[kind];
    if (!this.actionable || !def || !PADS.some(pad => pad.id === padId) || this.towers.some(tower => tower.padId === padId) || this.gold < def.cost) return false;
    this.gold -= def.cost;
    this.towers.push({ id: this.nextId++, padId, kind, level: 1, cooldown: 0, spent: def.cost });
    return true;
  }

  upgradeCost(tower: Tower): number { return Math.round(TOWER_DEFS[tower.kind].cost * (tower.level === 1 ? 0.8 : 1.2)); }

  upgrade(id: number): boolean {
    const tower = this.towers.find(item => item.id === id);
    if (!this.actionable || !tower || tower.level >= 3) return false;
    const cost = this.upgradeCost(tower);
    if (this.gold < cost) return false;
    this.gold -= cost;
    tower.spent += cost;
    tower.level++;
    return true;
  }

  sell(id: number): boolean {
    const tower = this.towers.find(item => item.id === id);
    if (!this.actionable || !tower) return false;
    const refund = Math.floor(tower.spent * 0.7);
    this.gold += refund;
    const pad = PADS.find(item => item.id === tower.padId)!;
    this.float(pad.x, pad.y - 30, `+${refund}`, '#e8c981');
    this.towers = this.towers.filter(item => item.id !== id);
    return true;
  }

  getTowerStats(tower: Tower): { damage: number; range: number; interval: number } {
    const def = TOWER_DEFS[tower.kind];
    return { damage: Math.round(def.damage * (1 + (tower.level - 1) * 0.8)), range: def.range + (tower.level - 1) * 18, interval: def.interval / (1 + (tower.level - 1) * 0.12) };
  }

  nextWave(): WaveDef | undefined { return WAVES[this.wave]; }

  startWave(): boolean {
    const next = this.nextWave();
    if (this.status !== 'building' || this.paused || !next) return false;
    this.gold += this.earlyBonus;
    this.wave++;
    this.waveTime = 0;
    this.pending = next.enemies.map(enemy => ({ ...enemy }));
    this.status = 'wave';
    return true;
  }

  meteor(x: number, y: number): boolean {
    if (this.status !== 'wave' || this.paused || this.meteorCooldown > 0 || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    this.meteorCooldown = 25;
    for (const enemy of this.enemies) {
      if (Math.hypot(enemy.x - x, enemy.y - y) <= 120) this.damage(enemy, 145);
    }
    this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    this.float(x, y - 20, 'STARFALL', '#ffd9a1');
    return true;
  }

  update(deltaSeconds: number): void {
    if (this.paused || !this.actionable || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const delta = Math.min(deltaSeconds, 0.1) * (this.speed === 2 ? 2 : 1);
    this.time += delta;
    this.meteorCooldown = Math.max(0, this.meteorCooldown - delta);
    for (const shot of this.shots) shot.life -= delta;
    this.shots = this.shots.filter(shot => shot.life > 0);
    for (const text of this.floats) { text.life -= delta; text.y -= delta * 19; }
    this.floats = this.floats.filter(text => text.life > 0);
    if (this.status !== 'wave') return;

    this.waveTime += delta;
    while (this.pending.length && this.pending[0].delay <= this.waveTime) {
      const entry = this.pending.shift()!;
      const def = ENEMY_DEFS[entry.kind];
      const multiplier = 1 + Math.max(0, this.wave - 3) * 0.045;
      const hp = Math.round(def.hp * multiplier);
      this.enemies.push({ id: this.nextId++, kind: entry.kind, ...PATH[0], hp, maxHp: hp, distance: 0, speed: def.speed, slowUntil: 0 });
    }

    for (const enemy of this.enemies) {
      enemy.distance += enemy.speed * (enemy.slowUntil > this.time ? 0.55 : 1) * delta;
      const position = positionAt(enemy.distance);
      enemy.x = position.x;
      enemy.y = position.y;
      if (enemy.distance >= PATH_LENGTH) {
        this.lives = Math.max(0, this.lives - ENEMY_DEFS[enemy.kind].leak);
        enemy.hp = 0;
        this.float(1030, 440, `−${ENEMY_DEFS[enemy.kind].leak} ♥`, '#ef9a8d');
      }
    }
    this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    if (this.lives <= 0) { this.status = 'lost'; return; }

    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - delta);
      if (tower.cooldown > 0) continue;
      const pad = PADS.find(item => item.id === tower.padId)!;
      const stats = this.getTowerStats(tower);
      const target = this.enemies.filter(enemy => enemy.hp > 0 && Math.hypot(enemy.x - pad.x, enemy.y - pad.y) <= stats.range).sort((a, b) => b.distance - a.distance)[0];
      if (!target) continue;
      tower.cooldown = stats.interval;
      const life = tower.kind === 'cannon' ? 0.32 : tower.kind === 'arcane' ? 0.2 : 0.18;
      this.shots.push({ id: this.nextId++, kind: tower.kind, from: { x: pad.x, y: pad.y - 22 }, to: { x: target.x, y: target.y }, life, maxLife: life });
      if (tower.kind === 'cannon') {
        for (const enemy of this.enemies) if (enemy.hp > 0 && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= 65) this.damage(enemy, stats.damage);
      } else if (tower.kind === 'arcane') {
        // A chain visits each enemy at most once, including targets killed by its first hit.
        const visited = new Set([target.id]);
        let previous = target;
        let damage = stats.damage;
        this.damage(previous, damage);
        for (let jump = 1; jump < tower.level + 1; jump++) {
          const next = this.enemies
            .filter(enemy => enemy.hp > 0 && !visited.has(enemy.id) && Math.hypot(enemy.x - previous.x, enemy.y - previous.y) <= 95)
            .sort((a, b) => Math.hypot(a.x - previous.x, a.y - previous.y) - Math.hypot(b.x - previous.x, b.y - previous.y) || a.id - b.id)[0];
          if (!next) break;
          this.shots.push({ id: this.nextId++, kind: 'arcane', from: { x: previous.x, y: previous.y }, to: { x: next.x, y: next.y }, life: 0.2, maxLife: 0.2 });
          visited.add(next.id);
          damage *= 0.65;
          this.damage(next, damage);
          previous = next;
        }
      } else {
        this.damage(target, stats.damage * (tower.kind === 'archer' && (target.kind === 'brute' || target.kind === 'boss') ? 0.6 : 1));
        if (tower.kind === 'frost' && target.hp > 0) target.slowUntil = this.time + 2.2;
      }
    }
    this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    if (this.waveRemaining === 0) {
      this.gold += 35 + this.wave * 7;
      this.clearedAt = this.time;
      this.status = this.wave === WAVES.length ? 'won' : 'building';
    }
  }

  private damage(enemy: Enemy, amount: number): void {
    if (enemy.hp <= 0) return;
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (enemy.hp === 0) {
      this.kills++;
      this.gold += ENEMY_DEFS[enemy.kind].reward;
      this.float(enemy.x, enemy.y - 15, `+${ENEMY_DEFS[enemy.kind].reward}`, '#e8c981');
    }
  }

  private float(x: number, y: number, text: string, color: string): void {
    this.floats.push({ id: this.nextId++, x, y, text, color, life: 1.1 });
  }

  reset(): void {
    this.gold = 240; this.lives = 20; this.wave = 0; this.status = 'building';
    this.paused = false; this.speed = 1; this.time = 0; this.kills = 0;
    this.towers = []; this.enemies = []; this.shots = []; this.floats = [];
    this.meteorCooldown = 0; this.nextId = 1; this.pending = []; this.waveTime = 0; this.clearedAt = 0;
  }

  snapshot() {
    return {
      gold: this.gold, lives: this.lives, wave: this.wave, status: this.status,
      paused: this.paused, speed: this.speed, time: this.time, kills: this.kills,
      meteorCooldown: this.meteorCooldown, waveRemaining: this.waveRemaining, earlyBonus: this.earlyBonus,
      towers: this.towers.map(tower => ({ ...tower })), enemies: this.enemies.map(enemy => ({ ...enemy })),
    };
  }
}
