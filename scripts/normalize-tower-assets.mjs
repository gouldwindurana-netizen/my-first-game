#!/usr/bin/env node
/** Normalize only the admitted PNG data; no asset-pack code is used or executed. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../src/assets/towers/animated/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));
const sourceHashes = new Map(provenance.files.map(file => [file.file, file.sha256]));
const hash = data => createHash('sha256').update(data).digest('hex');
const frameSize = 192;
await mkdir(new URL('runtime/', root), { recursive: true });
await mkdir(new URL('portraits/', root), { recursive: true });
const run = args => new Promise((resolve, reject) => {
  const command = spawn('magick', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let error = ''; command.stderr.on('data', data => { error += data; });
  command.on('error', reject); command.on('close', code => code === 0 ? resolve() : reject(new Error(`ImageMagick exited ${code}: ${error}`)));
});
const outputs = [];
// The painted revision supplies complete sheets and separate matching icons.
// Check every admitted source before deriving runtime data from any of them.
for (const file of provenance.files) assert.equal(hash(await readFile(new URL(file.file, root))), file.sha256, `${file.file}: original hash`);
const jobs = manifest.towers.flatMap(tower => {
  assert.match(tower.id, /^[a-z]+$/);
  return ['idle', 'attack'].map(animation => ({ kind: tower.id, animation, source: tower[animation] }));
});
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < jobs.length) {
    const job = jobs[cursor++], source = new URL(job.source, root), sourceData = await readFile(source);
    assert.equal(hash(sourceData), sourceHashes.get(job.source), `${job.source}: source hash`);
    const file = `runtime/${job.kind}_${job.animation}.webp`, target = new URL(file, root);
    const arguments_ = [fileURLToPath(source), '-filter', 'Lanczos', '-resize', '1920x576!', '-define', 'webp:lossless=true', fileURLToPath(target)];
    await run(arguments_);
    const data = await readFile(target);
    outputs.push({ file, source: job.source, sourceSha256: hash(sourceData), width: 1920, height: 576, bytes: data.byteLength, sha256: hash(data) });
    if (job.animation === 'idle') {
      const icon = `icons/${job.kind}.png`, iconSource = new URL(icon, root), iconData = await readFile(iconSource);
      assert.equal(hash(iconData), sourceHashes.get(icon), `${icon}: source hash`);
      const portrait = `portraits/${job.kind}.webp`, portraitTarget = new URL(portrait, root);
      await run([fileURLToPath(iconSource), '-filter', 'Lanczos', '-resize', '192x192!', '-define', 'webp:lossless=true', fileURLToPath(portraitTarget)]);
      const portraitData = await readFile(portraitTarget);
      outputs.push({ file: portrait, source: icon, sourceSha256: hash(iconData), width: frameSize, height: frameSize, bytes: portraitData.byteLength, sha256: hash(portraitData) });
    }
  }
}));
outputs.sort((a, b) => a.file.localeCompare(b.file));
const metadata = { version: 2, frameWidth: frameSize, frameHeight: frameSize, columns: manifest.columns, rows: manifest.rows, frameCount: manifest.frameCount, fps: manifest.fps, anchor: manifest.anchor,
  method: 'ImageMagick Lanczos downsample to 75% of original dimensions, then lossless WebP encoding. Portraits use the supplied matching 256px icons with the same downsample. Original PNGs are retained unchanged and are not loaded at runtime.',
  reason: '1920px sheet width fits 2048px WebGL texture limits; decoded tower-sheet memory decreases from 255 to 143 MiB. Separate portraits avoid DOM decoding seventeen full sheets.',
  sourceFrameSize: 256, semanticChanges: 'None: same artwork, transparency, frame count, timing, cell layout, and normalized anchor.',
  command: 'node scripts/normalize-tower-assets.mjs',
  sheetConversion: 'magick SOURCE.png -filter Lanczos -resize 1920x576! -define webp:lossless=true runtime/KIND_STATE.webp',
  portraitConversion: 'magick icons/KIND.png -filter Lanczos -resize 192x192! -define webp:lossless=true portraits/KIND.webp', repairs: [], outputs };
await writeFile(new URL('normalization.json', root), JSON.stringify(metadata, null, 2) + '\n');
console.log(`Normalized ${jobs.length} sheets and ${manifest.towers.length} portraits; originals unchanged.`);
