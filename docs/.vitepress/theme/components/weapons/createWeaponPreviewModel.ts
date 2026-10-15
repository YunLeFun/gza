import { modelAssetBase, verifiedModelBytes } from '../models/modelAssetSafety';
import { MODEL_CATALOG } from '../models/modelCatalog';
import type { Group } from 'three';
import { createItemPreviewModel } from '../items/createItemPreviewModel';
import { WEAPON_CATALOG } from './weaponCatalog';

// Empty by default: unpublished models must never produce a broken production gallery.
declare const __WEAPON_MODEL_BASE__: string;
export type WeaponModelSource = 'game' | 'external' | 'fallback';
export async function createWeaponPreviewModel(id: string, report: (source: WeaponModelSource) => void): Promise<Group> {
  if (!WEAPON_CATALOG.some(item => item.id === id)) throw new Error(`Unknown weapon ${id}`);
  const base = modelAssetBase(__WEAPON_MODEL_BASE__);
  if (base) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const file = `${id.split(':')[1]}.glb`;
      const expected = MODEL_CATALOG.find(item => item.package === 'gza-weapons-lowpoly-v1' && item.file === file);
      if (!expected) throw new Error('Weapon model is not in the verified catalog');
      const bytes = await verifiedModelBytes(`${base}/${file}`, expected);
      const gltf = await new GLTFLoader().parseAsync(bytes, `${base}/`);
      if (!gltf.scene.children.length) throw new Error('Empty model');
      report('external');
      return gltf.scene;
    } catch { report('fallback'); }
  } else report('game');
  return createItemPreviewModel(id);
}
