import * as THREE from "three";
import type { GameRenderer } from "./rendererTypes";

interface CullingState {
  refreshVisibility(): number;
  destructionEpoch(): number;
  activate(geometry: THREE.BufferGeometry): void;
  update(camera: THREE.Camera, side: THREE.Side): void;
}
interface View {
  geometry: THREE.BufferGeometry;
  projection: THREE.Matrix4;
  world: THREE.Matrix4;
  orthographic: boolean;
  side: THREE.Side;
  coordinateSystem: THREE.CoordinateSystem;
  reversedDepth: boolean;
  visibilityEpoch: number;
  destructionEpoch: number;
  valid: boolean;
}

/** Loaded with the GPU runtime. Recorded nested passes need separate indices. */
export function createWebGPUStaticBatchCullingProtocol(mesh: THREE.Mesh, original: THREE.BufferGeometry, vertexCount: number, culling: CullingState) {
  const views = new WeakMap<THREE.Camera, View>(), geometries = new Set<THREE.BufferGeometry>();
  const stack: THREE.BufferGeometry[] = [], projection = new THREE.Matrix4();
  original.addEventListener("dispose", () => {
    for (const geometry of geometries) geometry.dispose();
    geometries.clear();
  });
  return {
    before(renderer: GameRenderer, scene: THREE.Scene, camera: THREE.Camera, material: THREE.Material) {
      stack.push(mesh.geometry);
      const visibilityEpoch = culling.refreshVisibility(), destructionEpoch = culling.destructionEpoch();
      let view = views.get(camera);
      if (!view) {
        const geometry = new THREE.BufferGeometry();
        geometry.attributes = original.attributes; geometry.morphAttributes = original.morphAttributes;
        geometry.morphTargetsRelative = original.morphTargetsRelative;
        geometry.boundingBox = original.boundingBox; geometry.boundingSphere = original.boundingSphere; geometry.groups = original.groups;
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(vertexCount), 1).setUsage(THREE.StreamDrawUsage));
        view = { geometry, projection: new THREE.Matrix4(), world: new THREE.Matrix4(), orthographic: false,
          side: THREE.DoubleSide, coordinateSystem: THREE.WebGPUCoordinateSystem, reversedDepth: false,
          visibilityEpoch: -1, destructionEpoch: -1, valid: false };
        views.set(camera, view); geometries.add(geometry);
      }
      culling.activate(view.geometry);
      // renderObject invokes the source callback before applying this override.
      const override = scene.overrideMaterial as (THREE.Material & { isShadowPassMaterial?: boolean }) | null;
      const side = material.allowOverride && override?.isShadowPassMaterial
        ? material.shadowSide ?? (renderer.shadowMap.type === THREE.VSMShadowMap ? material.side
          : material.side === THREE.FrontSide ? THREE.BackSide : material.side === THREE.BackSide ? THREE.FrontSide : THREE.DoubleSide)
        : material.side;
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
      const orthographic = Boolean((camera as THREE.OrthographicCamera).isOrthographicCamera);
      if (view.valid && view.projection.equals(projection) && view.world.equals(mesh.matrixWorld)
        && view.orthographic === orthographic && view.side === side
        && view.coordinateSystem === camera.coordinateSystem && view.reversedDepth === camera.reversedDepth
        && view.visibilityEpoch === visibilityEpoch && view.destructionEpoch === destructionEpoch) return;
      // CPU planes/inverse remain shared. A miss reconstructs this view from
      // that state; a hit preserves both its draw range and upload version.
      culling.update(camera, side);
      view.projection.copy(projection); view.world.copy(mesh.matrixWorld); view.orthographic = orthographic;
      view.side = side; view.coordinateSystem = camera.coordinateSystem; view.reversedDepth = camera.reversedDepth;
      view.visibilityEpoch = visibilityEpoch; view.destructionEpoch = destructionEpoch; view.valid = true;
    },
    after() { const parent = stack.pop(); if (parent) culling.activate(parent); },
  };
}
