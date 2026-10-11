// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const reference = JSON.parse(await readFile(join(root, 'docs/data/game-reference.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const record of reference.files) {
  const bytes = await readFile(join(root, 'docs/.vitepress/game-reference', record.path));
  if (bytes.length !== record.bytes || digest(bytes) !== record.sha256) {
    throw new Error(`Documentation reference changed without updating provenance: ${record.path}`);
  }
}
for (const mapRecord of reference.mapPreview) {
  const bytes = await readFile(join(root, mapRecord.path));
  if (bytes.length !== mapRecord.bytes || digest(bytes) !== mapRecord.sha256) {
    throw new Error(`Map preview snapshot changed without updating provenance: ${mapRecord.path}`);
  }
}
const map = JSON.parse(await readFile(join(root, 'docs/data/map-preview.json'), 'utf8'));
if (!map.published || !map.version || !map.inputs.length || !map.attribution || !map.license) {
  throw new Error('Map preview requires published inputs, version and attribution.');
}
async function checkImports(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'cache', 'dist'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await checkImports(path);
    else if (/\.(?:ts|mts|vue|css)$/.test(entry.name)) {
      const text = await readFile(path, 'utf8');
      if (/(?:from\s*|import\s*\(|import\s*)['"][^'"]*(?:private-source|\/source\/)/.test(text)) {
        throw new Error(`Private checkout imported by documentation: ${path}`);
      }
    }
  }
}
await checkImports(join(root, 'docs'));
console.log(`Verified ${reference.files.length} documentation reference files and the published map snapshot.`);
