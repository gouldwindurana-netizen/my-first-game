/** Concept panels keep their native aspect ratio in the game world. */
export const MAP_GEOMETRY: Record<string, { width: number; height: number; sourceWidth: number; sourceHeight: number }> = {
  eldervale: { width: 1100, height: 680, sourceWidth: 1595, sourceHeight: 986 },
  frostbound: { width: 1100, height: 1100 * 324 / 757, sourceWidth: 757, sourceHeight: 324 },
  ember: { width: 1100, height: 1100 * 320 / 759, sourceWidth: 759, sourceHeight: 320 },
  mirewood: { width: 1100, height: 1100 * 324 / 760, sourceWidth: 760, sourceHeight: 324 },
  crystal: { width: 1100, height: 1100 * 344 / 757, sourceWidth: 757, sourceHeight: 344 },
};
