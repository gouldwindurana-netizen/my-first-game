#!/usr/bin/env node
/** Verify original pack bytes and actual PNG headers independently from the runtime manifest. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
const root = new URL('../src/assets/towers/animated/', import.meta.url);
const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const normalization = JSON.parse(await readFile(new URL('normalization.json', root), 'utf8'));
const expected = manifest.towers.flatMap(tower => [tower.idle, tower.attack]).sort();
const sheets = provenance.files.filter(file => file.file.startsWith('sheets/'));
assert.equal(manifest.towers.length, 17); assert.equal(sheets.length, 34);
assert.equal(manifest.version, 2); assert.equal(provenance.files.length, 72);
assert.equal(new Set(provenance.files.map(file => file.file)).size, provenance.files.length);
assert.equal(provenance.files.filter(file => file.file.startsWith('icons/')).length, 17);
assert.equal(provenance.files.filter(file => file.file.startsWith('masters/')).length, 17);
assert.deepEqual(sheets.map(file => file.file).sort(), expected);
const sourceHashes = new Map(provenance.files.map(file => [file.file, file.sha256]));
function verifyPNG(data, file) {
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file}: PNG signature`);
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  assert(width > 0 && height > 0, `${file}: positive dimensions`);
  assert.equal(data[24], 8, `${file}: 8-bit channels`);
  assert.equal(data[25], 6, `${file}: RGBA transparency`);
  assert.equal(data[28], 0, `${file}: noninterlaced rows`);
  const chunks = []; let offset = 8, ended = false;
  while (offset < data.length) {
    assert(offset + 12 <= data.length, `${file}: complete chunk header`);
    const size = data.readUInt32BE(offset), type = data.toString('ascii', offset + 4, offset + 8);
    assert(offset + size + 12 <= data.length, `${file}: complete ${type} chunk`);
    if (type === 'IDAT') chunks.push(data.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
    if (type === 'IEND') { ended = true; break; }
  }
  assert(ended && offset === data.length && chunks.length > 0, `${file}: complete PNG stream`);
  const rows = inflateSync(Buffer.concat(chunks)), stride = width * 4 + 1;
  assert.equal(rows.length, stride * height, `${file}: all pixel rows decode`);
  for (let row = 0; row < height; row++) assert(rows[row * stride] <= 4, `${file}: valid PNG row filter`);
  return { width, height };
}
for (const file of provenance.files) {
  const data = await readFile(new URL(file.file, root));
  assert.equal(data.byteLength, file.bytes, `${file.file}: original byte count`);
  assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, `${file.file}: original SHA-256`);
  if (file.file.endsWith('.png')) {
    const size = verifyPNG(data, file.file);
    if (file.file.startsWith('sheets/')) assert.deepEqual(size, { width: manifest.frameWidth * manifest.columns, height: manifest.frameHeight * manifest.rows }, `${file.file}: sheet grid`);
    if (file.file.startsWith('icons/')) assert.deepEqual(size, { width: 256, height: 256 }, `${file.file}: icon dimensions`);
  }
}
assert.equal(normalization.outputs.length, 51);
assert.deepEqual(normalization.anchor, manifest.anchor);
assert.deepEqual(normalization.repairs, [], 'Painted source sheets require no repair');
for (const file of [...normalization.repairs, ...normalization.outputs]) {
  assert.equal(file.sourceSha256, sourceHashes.get(file.source), `${file.file}: recorded original source`);
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
console.log(`PASS: ${provenance.files.length} painted source hashes and complete PNG streams, plus all 51 lossless runtime/portrait hashes, dimensions, alpha, and source mappings`);
