import type { LightShadow, Object3D, Object3DEventMap, Scene } from "three";

type ShadowLight = Object3D & { isLight: true; shadow: LightShadow };
type ShadowState = { autoUpdate: boolean; needsUpdate: boolean };
interface ShadowRegistry { lights: Set<ShadowLight>; freezes: Set<Map<LightShadow, ShadowState>> }
const registries = new WeakMap<Scene, ShadowRegistry>();

function freezeShadow(shadow: LightShadow, snapshots: Map<LightShadow, ShadowState>) {
  if (snapshots.has(shadow)) return;
  snapshots.set(shadow, { autoUpdate: shadow.autoUpdate, needsUpdate: shadow.needsUpdate });
  shadow.autoUpdate = false; shadow.needsUpdate = false;
}

function registryFor(scene: Scene): ShadowRegistry {
  const previous = registries.get(scene);
  if (previous) return previous;
  const registry: ShadowRegistry = { lights: new Set(), freezes: new Set() }, watched = new Set<Object3D>();
  const added = (event: Object3DEventMap["childadded"]) => watch(event.child);
  const removed = (event: Object3DEventMap["childremoved"]) => unwatch(event.child);
  function watch(object: Object3D) {
    if (watched.has(object)) return;
    watched.add(object);
    // Shared callbacks watch every public Object3D.add() entry, including an
    // empty mesh that later receives a light. No per-object closure is created.
    object.addEventListener("childadded", added); object.addEventListener("childremoved", removed);
    if ("isLight" in object && object.isLight === true && "shadow" in object && object.shadow && typeof object.shadow === "object"
      && "autoUpdate" in object.shadow && "needsUpdate" in object.shadow) {
      const light = object as ShadowLight;
      registry.lights.add(light);
      if (light.castShadow) for (const snapshots of registry.freezes) freezeShadow(light.shadow, snapshots);
    }
    for (const child of object.children) watch(child);
  }
  function unwatch(object: Object3D) {
    if (!watched.delete(object)) return;
    object.removeEventListener("childadded", added); object.removeEventListener("childremoved", removed);
    registry.lights.delete(object as ShadowLight);
    for (const child of object.children) unwatch(child);
  }
  registries.set(scene, registry); watch(scene);
  return registry;
}

/** Prime once after scene construction; future secondary passes only visit lights. */
export function prepareSceneShadowRegistry(scene: Scene) { registryFor(scene); }

/** Secondary passes must reuse the world pass's shadows on either backend. */
export function freezeSceneShadows(scene: Scene): () => void {
  const registry = registryFor(scene), shadows = new Map<LightShadow, ShadowState>();
  registry.freezes.add(shadows);
  // Keep non-casting lights registered too: enabling castShadow later emits no
  // graph event. Newly enabled lights join every active nested freeze in order.
  for (const light of registry.lights) if (light.castShadow) {
    for (const snapshots of registry.freezes) freezeShadow(light.shadow, snapshots);
  }
  let restored = false;
  return () => {
    if (restored) return;
    restored = true; registry.freezes.delete(shadows);
    for (const [shadow, previous] of shadows) {
      shadow.autoUpdate = previous.autoUpdate; shadow.needsUpdate = previous.needsUpdate;
    }
  };
}
