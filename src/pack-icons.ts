import { icon as fallbackIcon } from './icons';
import eye from './assets/pack/ui/eye.svg?raw';
import gold from './assets/pack/ui/gold.svg?raw';
import heart from './assets/pack/ui/heart.svg?raw';
import lightning from './assets/pack/ui/lightning.svg?raw';
import map from './assets/pack/ui/map.svg?raw';
import pause from './assets/pack/ui/pause.svg?raw';
import play from './assets/pack/ui/play.svg?raw';
import sell from './assets/pack/ui/sell.svg?raw';
import settings from './assets/pack/ui/settings.svg?raw';
import shield from './assets/pack/ui/shield.svg?raw';
import snow from './assets/pack/ui/snow.svg?raw';
import sound from './assets/pack/ui/sound.svg?raw';
import starfall from './assets/pack/ui/starfall.svg?raw';
import target from './assets/pack/ui/target.svg?raw';
import upgrade from './assets/pack/ui/upgrade.svg?raw';
import wave from './assets/pack/ui/wave.svg?raw';

const supplied: Record<string, string> = {
  eye, gold, heart, bolt: lightning, lightning, map, pause, play, sell,
  settings, shield, snow, sound, meteor: starfall, starfall,
  range: target, crosshair: target, target, upgrade, flag: wave, wave,
};

/** Inline original pack SVG artwork; unmapped controls retain their existing icons. */
export function icon(name: string, cls = ''): string {
  const svg = supplied[name];
  if (!svg) return fallbackIcon(name, cls);
  const safeClass = `icon ${cls}`.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return svg.replace('<svg ', `<svg class="${safeClass}" aria-hidden="true" focusable="false" `);
}
