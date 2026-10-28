#!/usr/bin/env node
/** Verify original pack bytes and actual PNG headers independently from the runtime manifest. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../src/assets/towers/animated/', import.meta.url);
const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const normalization = JSON.parse(await readFile(new URL('normalization.json', root), 'utf8'));
const expected = manifest.towers.flatMap(tower => [tower.idle, tower.attack]).sort();
const sheets = provenance.files.filter(file => file.file.startsWith('sheets/'));
assert.equal(manifest.towers.length, 17); assert.equal(sheets.length, 34);
assert.deepEqual(sheets.map(file => file.file).sort(), expected);
for (const file of provenance.files) {
  const data = await readFile(new URL(file.file, root));
  assert.equal(data.byteLength, file.bytes, `${file.file}: original byte count`);
  assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, `${file.file}: original SHA-256`);
  if (file.file.startsWith('sheets/')) {
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file.file}: PNG signature`);
    assert.equal(data.readUInt32BE(16), 2560, `${file.file}: width`);
    assert.equal(data.readUInt32BE(20), 768, `${file.file}: height`);
    assert.equal(data[25], 6, `${file.file}: RGBA transparency`);
  }
}
assert.equal(normalization.outputs.length, 51);
for (const file of [...normalization.repairs, ...normalization.outputs]) {
  const data = await readFile(new URL(file.file, root));
  assert.equal(data.byteLength, file.bytes, `${file.file}: output byte count`);
  assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, `${file.file}: output hash`);
  if (file.file.endsWith('.webp')) {
    assert.equal(data.subarray(0, 4).toString(), 'RIFF'); assert.equal(data.subarray(8, 12).toString(), 'WEBP');
    assert.equal(data.subarray(12, 16).toString(), 'VP8L', `${file.file}: lossless WebP`);
    assert.equal(data[20], 0x2f);
    const bits = data.readUInt32LE(21);
    assert.equal((bits & 0x3fff) + 1, file.width, `${file.file}: actual width`);
    assert.equal(((bits >>> 14) & 0x3fff) + 1, file.height, `${file.file}: actual height`);
    assert.equal((bits >>> 28) & 1, 1, `${file.file}: transparency retained`);
    assert(file.width <= 2048, `${file.file}: mobile WebGL texture limit`);
  }
}
console.log(`PASS: ${provenance.files.length} original source hashes, repaired Earth sheet, and all 51 lossless runtime/portrait hashes, dimensions, and alpha`);
