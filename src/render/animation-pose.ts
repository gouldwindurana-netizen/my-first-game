/** Renderer-independent poses. Every value depends only on the caller's pausable clock. */
export interface AnimationPose {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}
export interface RecoilPose extends AnimationPose { flash: number; }
type EnemyKind = 'grunt' | 'runner' | 'brute' | 'boss';
type TowerKind = 'archer' | 'cannon' | 'frost' | 'arcane' | 'mortar' | 'tesla' | 'venom';
const neutral = (): AnimationPose => ({ offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 });

const strides: Record<EnemyKind, { period: number; lift: number; sway: number; rock: number; squash: number }> = {
  grunt: { period: 1, lift: 1.5, sway: .65, rock: .035, squash: .025 },
  runner: { period: .6, lift: 2.1, sway: .85, rock: .055, squash: .034 },
  brute: { period: 1.4, lift: .9, sway: .45, rock: .022, squash: .018 },
  boss: { period: 1.8, lift: .65, sway: .3, rock: .014, squash: .012 },
};

export function walkPose(kind: EnemyKind, time: number, id: number, moving: boolean, slow: boolean, reduced: boolean): AnimationPose {
  if (reduced) return neutral();
  const clock = Number.isFinite(time) ? time : 0;
  const identity = Number.isFinite(id) ? id : 0;
  if (!moving) {
    const breath = Math.sin((clock / 2.4 + identity * .137) * Math.PI * 2) * .006;
    return { offsetX: 0, offsetY: 0, scaleX: 1 + breath, scaleY: 1 - breath, rotation: 0 };
  }
  const stride = strides[kind];
  const phase = (clock * (slow ? .55 : 1) / stride.period + identity * .137) * Math.PI * 2;
  const swing = Math.sin(phase);
  const compression = Math.sin(phase * 2) * stride.squash;
  const strength = slow ? .8 : 1;
  return {
    offsetX: swing * stride.sway * strength,
    offsetY: -(1 - Math.cos(phase * 2)) * .5 * stride.lift * strength,
    scaleX: 1 + compression,
    scaleY: 1 - compression,
    rotation: swing * stride.rock * strength,
  };
}

const recoil: Record<TowerKind, { duration: number; x: number; y: number; wide: number; tall: number; rock: number }> = {
  archer: { duration: .18, x: .7, y: 1.2, wide: .015, tall: -.025, rock: .018 },
  cannon: { duration: .28, x: -1.9, y: 2.2, wide: .045, tall: -.045, rock: -.045 },
  frost: { duration: .32, x: 0, y: -.7, wide: .025, tall: .035, rock: 0 },
  arcane: { duration: .36, x: 0, y: -.9, wide: .035, tall: .025, rock: .025 },
  mortar: { duration: .34, x: 0, y: 3, wide: .04, tall: -.06, rock: -.03 },
  tesla: { duration: .3, x: 0, y: -.6, wide: .03, tall: .035, rock: 0 },
  venom: { duration: .26, x: .5, y: 1, wide: .025, tall: -.02, rock: .016 },
};

export function towerRecoil(kind: TowerKind, age: number, reduced: boolean): RecoilPose {
  const def = recoil[kind];
  if (!Number.isFinite(age) || age < 0 || age >= def.duration) return { ...neutral(), flash: 0 };
  const envelope = (1 - age / def.duration) ** 2;
  const flash = Math.max(0, 1 - age / .14);
  if (reduced) return { ...neutral(), flash };
  return {
    offsetX: def.x * envelope,
    offsetY: def.y * envelope,
    scaleX: 1 + def.wide * envelope,
    scaleY: 1 + def.tall * envelope,
    rotation: def.rock * envelope,
    flash,
  };
}
