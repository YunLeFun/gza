import type { Group } from 'three';
import { createItemPreviewModel } from '../items/createItemPreviewModel';
import { WEAPON_CATALOG } from './weaponCatalog';

// Empty by default: unpublished models must never produce a broken production gallery.
declare const __WEAPON_MODEL_BASE__: string;
export type WeaponModelSource = 'game' | 'external' | 'fallback';
export async function createWeaponPreviewModel(id: string, report: (source: WeaponModelSource) => void): Promise<Group> {
  if (!WEAPON_CATALOG.some(item => item.id === id)) throw new Error(`Unknown weapon ${id}`);
  if (__WEAPON_MODEL_BASE__) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const url = `${__WEAPON_MODEL_BASE__.replace(/\/$/, '')}/${id.split(':')[1]}.glb`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      // This interface accepts self-contained GLB only, without remote textures.
      const gltf = await new GLTFLoader().parseAsync(bytes, `${__WEAPON_MODEL_BASE__}/`);
      if (!gltf.scene.children.length) throw new Error('Empty model');
      report('external');
      return gltf.scene;
    } catch { report('fallback'); }
  } else report('game');
  return createItemPreviewModel(id);
}
