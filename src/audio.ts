import { getAudioContextConstructor } from './platform';
import arcane from './assets/pack/audio/arcane.wav?url';
import arrow from './assets/pack/audio/arrow.wav?url';
import build from './assets/pack/audio/build.wav?url';
import cannon from './assets/pack/audio/cannon.wav?url';
import defeat from './assets/pack/audio/defeat.wav?url';
import enemyDeath from './assets/pack/audio/enemy_death.wav?url';
import enemyHit from './assets/pack/audio/enemy_hit.wav?url';
import frost from './assets/pack/audio/frost.wav?url';
import uiClick from './assets/pack/audio/ui_click.wav?url';
import upgrade from './assets/pack/audio/upgrade.wav?url';
import victory from './assets/pack/audio/victory.wav?url';
import waveStart from './assets/pack/audio/wave_start.wav?url';

export type SoundName = 'arcane' | 'arrow' | 'build' | 'cannon' | 'defeat' | 'enemy_death' | 'enemy_hit' | 'frost' | 'ui_click' | 'upgrade' | 'victory' | 'wave_start';

const files: Record<SoundName, string> = {
  arcane, arrow, build, cannon, defeat, enemy_death: enemyDeath,
  enemy_hit: enemyHit, frost, ui_click: uiClick, upgrade, victory, wave_start: waveStart,
};
const intervals: Record<SoundName, number> = {
  arcane: .16, arrow: .125, build: .12, cannon: .2, defeat: 1,
  enemy_death: .15, enemy_hit: .1, frost: .16, ui_click: .06,
  upgrade: .15, victory: 1, wave_start: .4,
};

/** Decode bundled WAV bytes without fetching when the single-file build inlines them. */
async function readAudioBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const separator = url.indexOf(',');
    if (separator < 0) throw new Error('Invalid embedded audio');
    const metadata = url.slice(0, separator);
    const payload = url.slice(separator + 1);
    const binary = metadata.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Audio asset could not be loaded');
  return response.arrayBuffer();
}

/** Supports callback-based decodeAudioData in older embedded Safari browsers. */
function decode(context: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const result = context.decodeAudioData(bytes, resolve, reject);
    if (result && typeof result.catch === 'function') void result.catch(reject);
  });
}

/** User-gesture-only playback for the WAV effects supplied in the design pack. */
export class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private lastPlayed = new Map<SoundName, number>();
  private loading: Promise<boolean> | null = null;
  private active = false;
  private request = 0;

  get enabled(): boolean { return this.active; }

  async enable(): Promise<boolean> {
    const request = ++this.request;
    try {
      const AudioConstructor = getAudioContextConstructor();
      if (!AudioConstructor) return false;
      this.context ??= new AudioConstructor();
      // Resume immediately in the gesture handler, before waiting for asset decoding.
      const resumed = this.context.resume();
      const context = this.context;
      this.loading ??= this.loadBuffers(context);
      const [, loaded] = await Promise.all([resumed, this.loading]);
      if (request !== this.request) return false;
      this.active = loaded && context.state === 'running';
      if (!loaded) this.loading = null;
      return this.active;
    } catch {
      if (request === this.request) this.active = false;
      this.loading = null;
      return false;
    }
  }

  disable(): void {
    this.request++;
    this.active = false;
    for (const source of this.voices) {
      try { source.stop(); } catch { /* A source may already have completed. */ }
      source.disconnect();
    }
    this.voices.clear();
    this.lastPlayed.clear();
  }

  play(name: SoundName): void {
    const context = this.context;
    const buffer = this.buffers.get(name);
    if (!this.active || !context || context.state !== 'running' || !buffer) return;
    const now = context.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < intervals[name]) return;
    this.lastPlayed.set(name, now);
    // Keep a dense wave from accumulating unlimited concurrent sources.
    if (this.voices.size >= 16) {
      const oldest = this.voices.values().next().value as AudioBufferSourceNode | undefined;
      if (oldest) { try { oldest.stop(); } catch { /* Already ended. */ } this.voices.delete(oldest); }
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = .2;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  }

  private async loadBuffers(context: AudioContext): Promise<boolean> {
    const outcomes = await Promise.allSettled((Object.keys(files) as SoundName[]).map(async name => {
      if (this.buffers.has(name)) return;
      const bytes = await readAudioBytes(files[name]);
      this.buffers.set(name, await decode(context, bytes));
    }));
    return outcomes.every(outcome => outcome.status === 'fulfilled');
  }
}
