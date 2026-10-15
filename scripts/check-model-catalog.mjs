// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const catalog = JSON.parse(fs.readFileSync('docs/data/model-catalog.json')).models;
assert.equal(catalog.length, 24);
assert.equal(new Set(catalog.map(item => item.id)).size, 24);
for (const item of catalog) {
  assert.equal(item.status, 'sample-not-integrated');
  assert.ok(!JSON.stringify(item).includes('pastel-toon'));
  assert.equal(item.sizeMeters.length, 3);
  assert.ok(item.sizeMeters.every(n => Number.isFinite(n) && n > 0));
  assert.ok(item.triangles > 0 && item.bytes > 0);
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
}
const require = createRequire(fs.realpathSync('docs/node_modules/vitepress/package.json'));
const { createServer } = await import(require.resolve('vite'));
const server = await createServer({root: path.resolve('docs'), configFile: false, server: { middlewareMode: true }, define: {__MODEL_CATALOG_BASE__: JSON.stringify('https://local.invalid')}});
const originalFetch = globalThis.fetch;
try {
 const { loadModelSample } = await server.ssrLoadModule('/.vitepress/theme/components/models/loadModelSample.ts');
 if (process.argv[2]) {
   globalThis.fetch = async url => new Response(fs.readFileSync(path.join(process.argv[2], new URL(url).pathname)));
   for (const item of catalog) {
     const root = await loadModelSample(item.id);
     assert.ok(root.children.length);
     root.traverse(o => { o.geometry?.dispose(); for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) m.dispose(); });
   }
   console.log('24 real GLBs loaded with byte count and SHA-256 verification.');
 }
 for (const failure of ['offline','404','corrupt','checksum']) {
   globalThis.fetch = async url => { if (failure === 'checksum') return new Response(new Uint8Array(catalog.find(item => url.endsWith('/' + item.package + '/' + item.file)).bytes)); if (failure === 'offline') throw new Error('Offline'); return new Response('corrupt', { status: failure === '404' ? 404 : 200 }); };
   for (const item of catalog) await assert.rejects(loadModelSample(item.id));
 }
 await assert.rejects(loadModelSample('unknown'));
 console.log('Catalog schema and 96 failure cases passed.');
} finally { globalThis.fetch = originalFetch; await server.close(); }
