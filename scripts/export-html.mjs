#!/usr/bin/env node
/** Build the same game as one offline HTML file; no server or runtime downloads. */
import { mkdtemp, readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { Script } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(root, 'samples/mossguard.html');
const scratch = await mkdtemp(path.join(tmpdir(), 'mossguard-html-'));

try {
  // Library mode bundles imported images and font files as data URLs. IIFE output
  // avoids module/CORS restrictions when opening the sample through file://.
  await build({
    configFile: false,
    root,
    base: './',
    build: {
      outDir: scratch,
      emptyOutDir: true,
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      target: 'es2020',
      minify: 'esbuild',
      lib: {
        entry: path.resolve(root, 'src/main.ts'),
        name: 'Mossguard',
        formats: ['iife'],
        fileName: () => 'game.js',
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });

  const files = await readdir(scratch);
  const styleFiles = files.filter(file => file.endsWith('.css'));
  const script = await readFile(path.join(scratch, 'game.js'), 'utf8');
  const styles = (await Promise.all(styleFiles.map(file => readFile(path.join(scratch, file), 'utf8')))).join('\n');
  const shell = await readFile(path.resolve(root, 'index.html'), 'utf8');
  const entry = /<script\b[^>]*\bsrc=["']\/src\/main\.ts["'][^>]*>\s*<\/script>/i;
  if (!entry.test(shell)) throw new Error('Cannot locate the source entry script in index.html');
  if (!styles || !script) throw new Error('Standalone build did not emit CSS and JavaScript');

  // A literal closing tag inside a JS string must not terminate its HTML element.
  const safeScript = script.replace(/<\/script/gi, '<\\/script');
  const safeStyles = styles.replace(/<\/style/gi, '<\\/style');
  const licensePaths = [
    'THIRD_PARTY_NOTICES.md',
    'docs/ASSET_INTEGRATION.md',
    'src/assets/pack/provenance.json',
    'src/assets/towers/LICENSE.txt',
    'src/assets/towers/provenance.json',
    'src/assets/towers/animated/USER_ASSET_NOTICE.txt',
    'src/assets/towers/animated/provenance.json',
    'src/assets/towers/animated/normalization.json',
    'LICENSES/phaser-MIT.txt',
    'LICENSES/cormorant-garamond-OFL.txt',
    'LICENSES/dm-sans-OFL.txt',
  ];
  const notices = (await Promise.all(licensePaths.map(async file => `${file}\n${await readFile(path.resolve(root, file), 'utf8')}`))).join('\n\n' + '—'.repeat(50) + '\n\n');
  const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const licensePanel = `<details style="margin:16px auto;max-width:1200px;padding:12px 20px;font:11px/1.6 sans-serif;color:#9cadb6"><summary style="cursor:pointer">Open-source licenses and notices</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(notices)}</pre></details>`;
  const html = shell
    .replace('</head>', `<style>${safeStyles}</style>\n</head>`)
    .replace('</body>', () => `${licensePanel}\n</body>`)
    .replace(entry, () => `<script>${safeScript}</script>`);

  if (/<script\b[^>]*\bsrc=/i.test(html) || /<link\b[^>]*\brel=["']stylesheet["']/i.test(html)) {
    throw new Error('Standalone export still contains an external script or stylesheet');
  }
  if (/\bimport\.meta\b/.test(script)) throw new Error('Standalone export retains import.meta');
  // Validate the actual embedded script, including HTML assembly transformations.
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1], { filename: 'mossguard-inline.js' });
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`Standalone HTML: ${path.relative(root, target)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
