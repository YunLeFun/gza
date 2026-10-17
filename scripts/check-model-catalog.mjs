// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
// Resolve optional asset directory before normalizing the working directory.
if (process.argv[2]) process.argv[2] = path.resolve(process.argv[2]);
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
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
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({root: path.resolve('docs'), configFile: false, server: { middlewareMode: true }, define: {__MODEL_CATALOG_BASE__: JSON.stringify('https://local.invalid')}});
const originalFetch = globalThis.fetch;
try {
 const { modelAssetBase, assertSelfContainedGlb, verifiedModelBytes } = await server.ssrLoadModule('/.vitepress/theme/components/models/modelAssetSafety.ts');
 for (const unsafe of ['', '/models', 'javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/models', 'http://example.com', 'https://name:secret@example.com', 'https://example.com/?signature=value', 'https://example.com/#fragment']) assert.equal(modelAssetBase(unsafe), '');
 for (const safe of ['https://example.com/models/', 'http://localhost:8081/', 'http://127.0.0.1:8081/', 'http://[::1]:8081/']) assert.ok(modelAssetBase(safe));
 const fixture = json => {
   const text = Buffer.from(JSON.stringify(json));
   const length = Math.ceil(text.length / 4) * 4;
   const bytes = Buffer.alloc(20 + length, 0x20);
   bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8);
   bytes.writeUInt32LE(length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); text.copy(bytes, 20);
   return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
 };
 const minimal = {asset: {version: '2.0'}, scenes: [{}], meshes: [{}], buffers: [{byteLength: 0}]};
 assert.doesNotThrow(() => assertSelfContainedGlb(fixture(minimal)));
 for (const invalid of [
   {...minimal, buffers: [{uri: 'https://outside.invalid/file.bin'}]},
   {...minimal, buffers: [{uri: 'data:application/octet-stream;base64,AA=='}]},
   {...minimal, images: [{uri: 'https://outside.invalid/image.png'}]},
   {...minimal, textures: [{}]}, {...minimal, skins: [{}]}, {...minimal, scenes: [{}, {}]},
 ]) assert.throws(() => assertSelfContainedGlb(fixture(invalid)));
 assert.throws(() => assertSelfContainedGlb(new ArrayBuffer(4)));
 const valid = fixture(minimal), sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', valid)).toString('hex');
 globalThis.fetch = async (_url, options) => {
   assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
   return new Response(valid);
 };
 assert.equal((await verifiedModelBytes('https://local.invalid/test.glb', {bytes: valid.byteLength, sha256})).byteLength, valid.byteLength);
 let cancelled = false;
 globalThis.fetch = async () => new Response(new ReadableStream({start(controller) {controller.enqueue(new Uint8Array(100));}, cancel() {cancelled = true;}}));
 await assert.rejects(verifiedModelBytes('https://local.invalid/large.glb', {bytes: 20, sha256}), /exceeds manifest/);
 assert.ok(cancelled, 'oversized stream is cancelled');
 await assert.rejects(verifiedModelBytes('https://local.invalid/large.glb', {bytes: 9 * 1024 * 1024, sha256}), /Invalid model size/);
 console.log('URL boundaries, self-contained GLB restrictions, credential-free fetch and bounded stream cancellation passed.');
 const { loadModelSample } = await server.ssrLoadModule('/.vitepress/theme/components/models/loadModelSample.ts');
 if (process.argv[2]) {
   globalThis.fetch = async url => new Response(fs.readFileSync(path.join(process.argv[2], ...new URL(url).pathname.split('/').filter(Boolean))));
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
