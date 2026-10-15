// SPDX-License-Identifier: Apache-2.0
// Run from the repository root. Optional directory enables real GLB validation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
// Resolve optional asset directory before normalizing the working directory.
if (process.argv[2]) process.argv[2] = path.resolve(process.argv[2]);
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const require = createRequire(fs.realpathSync('docs/node_modules/vitepress/package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({
  root: path.resolve('docs'), configFile: false, server: { middlewareMode: true },
  resolve: { alias: { '@yunlefun/dayun-kicker-coop': path.resolve('docs/.vitepress/game-reference/packages/dayun-kicker-coop/src/docs.ts') } },
  define: { __MODEL_CATALOG_BASE__: JSON.stringify(''), __WEAPON_MODEL_BASE__: JSON.stringify('https://local.invalid/models/weapons') },
});
const originalFetch = globalThis.fetch;
try {
  const { createWeaponPreviewModel } = await server.ssrLoadModule('/.vitepress/theme/components/weapons/createWeaponPreviewModel.ts');
  const { WEAPON_CATALOG } = await server.ssrLoadModule('/.vitepress/theme/components/weapons/weaponCatalog.ts');
  const { ITEM_CATALOG } = await server.ssrLoadModule('/.vitepress/theme/components/items/itemCatalog.ts');
  assert.deepEqual(new Set(WEAPON_CATALOG.map(item => item.id)), new Set(ITEM_CATALOG.filter(item => item.category === '武器').map(item => item.id)));
  const release = root => root.traverse(object => {
    object.geometry?.dispose();
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) material.dispose();
  });
  const directory = process.argv[2];
  if (directory) {
    globalThis.fetch = async url => new Response(fs.readFileSync(path.join(directory, path.basename(url))));
    for (const item of WEAPON_CATALOG) {
      let source;
      const model = await createWeaponPreviewModel(item.id, value => { source = value; });
      assert.equal(source, 'external', item.id);
      assert.ok(model.getObjectByName('grip'), `${item.id} grip`);
      assert.ok(model.children.length, item.id);
      release(model);
    }
    console.log(`Loaded ${WEAPON_CATALOG.length} real external GLB models.`);
  }
  for (const failure of ['offline', '404', 'invalid']) {
    globalThis.fetch = async () => {
      if (failure === 'offline') throw new Error('Simulated offline');
      return new Response('Invalid GLB', { status: failure === '404' ? 404 : 200 });
    };
    for (const item of WEAPON_CATALOG) {
      let source;
      const model = await createWeaponPreviewModel(item.id, value => { source = value; });
      assert.equal(source, 'fallback', item.id);
      assert.ok(model.children.length, item.id);
      release(model);
    }
    console.log(`Passed ${failure} fallback for ${WEAPON_CATALOG.length} weapons.`);
  }
  await assert.rejects(createWeaponPreviewModel('weapon:unknown', () => {}), /Unknown weapon/);
  console.log('Weapon preview catalog and loader checks passed.');
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
