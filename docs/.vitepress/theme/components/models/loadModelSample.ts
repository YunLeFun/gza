import { verifiedModelBytes } from './modelAssetSafety';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_CATALOG, modelUrl } from './modelCatalog';
export async function loadModelSample(id: string) {
  const item = MODEL_CATALOG.find(item => item.id === id);
  if (!item) throw new Error('Unknown model');
  const url = modelUrl(item);
  if (!url) throw new Error('Model publication pending');
  const bytes = await verifiedModelBytes(url, item);
  const gltf = await new GLTFLoader().parseAsync(bytes, url.substring(0, url.lastIndexOf('/') + 1));
  if (!gltf.scene.children.length) throw new Error('Empty model');
  return gltf.scene;
}
