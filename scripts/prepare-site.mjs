#!/usr/bin/env node
/** Include the downloadable sample and legal notices in any static-site deployment. */
import { copyFile, cp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
await copyFile(new URL('samples/mossguard.html', root), new URL('dist/mossguard.html', root));
await copyFile(new URL('THIRD_PARTY_NOTICES.md', root), new URL('dist/THIRD_PARTY_NOTICES.md', root));
await cp(fileURLToPath(new URL('LICENSES', root)), fileURLToPath(new URL('dist/LICENSES', root)), { recursive: true });
await writeFile(new URL('dist/.nojekyll', root), '');
console.log('Prepared dist/ with the website, downloadable HTML sample, and license notices.');
