// SPDX-License-Identifier: Apache-2.0
// VitePress copies public files verbatim. Unpublished samples must never ship.
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../docs/public/models/', import.meta.url));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (entry.isDirectory()) await files(`${directory}/${entry.name}`);
    else throw new Error('Unpublished model media in docs/public/models. Move it to a separate local asset server before building; publish through the approved COS pipeline.');
  }
}
await files(root);
console.log('No unpublished model media will be copied into the documentation build.');
