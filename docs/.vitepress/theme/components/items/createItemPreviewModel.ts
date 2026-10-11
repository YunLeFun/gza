import * as THREE from 'three';

/** Isolate resources before disposing a game factory, including factories with hidden parts. */
function isolate(source: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  const clone = source.clone(true);
  clone.visible = true;
  clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0);
  clone.traverse(object => {
    object.layers.set(0);
    if (object instanceof THREE.Mesh) {
      object.geometry = object.geometry.clone();
      object.material = Array.isArray(object.material) ? object.material.map(material => material.clone()) : object.material.clone();
    }
  });
  root.add(clone);
  return root;
}
function release(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
}
export async function createItemPreviewModel(id: string): Promise<THREE.Group> {
  const [family, key] = id.split(':');
  if (family === 'melee') {
    const { CITY_MELEE_ORDER } = await import('../../../game-reference/packages/dayun-kicker-coop/src/cityMelee');
    const tool = CITY_MELEE_ORDER.find(value => value === key);
    if (!tool) throw new Error(`Unknown tool ${id}`);
    const { createCityMeleeEffects } = await import('../../../game-reference/apps/dayun-kicker/src/city-coop/meleeEffects');
    const effects = createCityMeleeEffects();
    try { effects.pose(tool, 0, false); return isolate(effects.hand); }
    finally { effects.dispose(); }
  }
  if (family === 'weapon' && (key === 'smg' || key === 'shotgun')) {
    const { createPassengerRig } = await import('../../../game-reference/apps/dayun-kicker/src/render/passengerRig');
    const rig = createPassengerRig();
    try {
      const rifle = rig.group.getObjectByName('passenger-rifle');
      if (!rifle) throw new Error('Missing shared rifle model');
      return isolate(rifle);
    } finally { rig.dispose(); }
  }
  if (family === 'weapon' && (key === 'feather-duster' || key === 'gas-cylinder' || key === 'slingshot')) {
    const { createHouseholdWeaponModels } = await import('../../../game-reference/apps/dayun-kicker/src/render/householdWeaponModel');
    const models = createHouseholdWeaponModels();
    const all = new THREE.Group(); all.add(...Object.values(models));
    try { return isolate(models[key]); } finally { release(all); }
  }
  if (family === 'race') {
    const { ITEM_KINDS } = await import('../../../game-reference/apps/dayun-kicker/src/game/items');
    if (!ITEM_KINDS.some(value => value === key)) throw new Error(`Unknown race item ${id}`);
    const { createItemBoxes } = await import('../../../game-reference/apps/dayun-kicker/src/render/itemBoxes');
    const scene = new THREE.Scene(), boxes = createItemBoxes(scene);
    try {
      const box = scene.getObjectByName(`item-boxes-${key}`) as THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
      const group = new THREE.Group(), material = box.material.clone();
      // Factory owns the shared question-mark canvas; keep an independent texture.
      material.map = box.material.map!.clone(); material.map.needsUpdate = true;
      group.add(new THREE.Mesh(box.geometry.clone(), material));
      return group;
    } finally { boxes.dispose(); }
  }
  throw new Error(`No model available for ${id}`);
}
