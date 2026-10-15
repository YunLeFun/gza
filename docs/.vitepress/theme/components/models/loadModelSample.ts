import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_CATALOG, modelUrl } from './modelCatalog';
export async function loadModelSample(id: string) {
  const item = MODEL_CATALOG.find(item => item.id === id);
  if (!item) throw new Error('Unknown model');
  const url = modelUrl(item);
  if (!url) throw new Error('Model publication pending');
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== item.bytes) throw new Error('Model size mismatch');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== item.sha256) throw new Error('Model checksum mismatch');
  const gltf = await new GLTFLoader().parseAsync(bytes, url.substring(0, url.lastIndexOf('/') + 1));
  if (!gltf.scene.children.length) throw new Error('Empty model');
  return gltf.scene;
}
