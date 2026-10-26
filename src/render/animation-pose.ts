/** Renderer-independent poses. Every value depends only on the caller's pausable clock. */
export interface AnimationPose {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}
export interface RecoilPose extends AnimationPose { flash: number; }
type TowerKind = 'archer' | 'cannon' | 'frost' | 'arcane' | 'mortar' | 'tesla' | 'venom';
const neutral = (): AnimationPose => ({ offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 });

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
