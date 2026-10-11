import * as THREE from "three";
import type { StaticDestructionRange } from "./staticBatch";
import { getNodeMaterials } from "./nodeMaterials";

/** Compile shared ancestor suffixes once. A cell can own thousands of ranges,
 * but its visibility only needs reading once for each actual render pass.
 */
function compileSourceVisibility(chains: readonly (readonly THREE.Object3D[])[], sourceShown: Uint8Array) {
  const objects: THREE.Object3D[] = [], objectIds = new Map<THREE.Object3D, number>();
  const objectIndices: number[] = [], firstChild: number[] = [], nextSibling: number[] = [], firstRange: number[] = [], roots: number[] = [];
  const nodes = new Map<number, Map<number, number>>(), rangeNext = new Int32Array(chains.length).fill(-1);
  for (let r = 0; r < chains.length; r++) {
    const chain = chains[r]!; let parent = -1;
    for (let i = chain.length - 1; i >= 0; i--) {
      const object = chain[i]!;
      let objectId = objectIds.get(object);
      if (objectId === undefined) { objectId = objects.length; objects.push(object); objectIds.set(object, objectId); }
      let byParent = nodes.get(objectId);
      if (!byParent) { byParent = new Map(); nodes.set(objectId, byParent); }
      let node = byParent.get(parent);
      if (node === undefined) {
        node = objectIndices.length; objectIndices.push(objectId); firstChild.push(-1); firstRange.push(-1);
        nextSibling.push(parent < 0 ? -1 : firstChild[parent]!);
        if (parent < 0) roots.push(node); else firstChild[parent] = node;
        byParent.set(parent, node);
      }
      parent = node;
    }
    if (parent >= 0) { rangeNext[r] = firstRange[parent]!; firstRange[parent] = r; }
  }
  const objectShown = new Uint8Array(objects.length), nodeShown = new Uint8Array(objectIndices.length).fill(1);
  let changed = false;
  function setShown(node: number, shown: number) {
    nodeShown[node] = shown;
    for (let r = firstRange[node]!; r >= 0; r = rangeNext[r]!) { sourceShown[r] = shown; changed = true; }
  }
  function hide(node: number) {
    if (!nodeShown[node]) return;
    setShown(node, 0);
    for (let child = firstChild[node]!; child >= 0; child = nextSibling[child]!) hide(child);
  }
  function visit(node: number) {
    const object = objectIndices[node]!; let state = objectShown[object]!;
    if (!state) objectShown[object] = state = objects[object]!.visible ? 2 : 1;
    if (state === 1) { hide(node); return; }
    if (!nodeShown[node]) setShown(node, 1);
    for (let child = firstChild[node]!; child >= 0; child = nextSibling[child]!) visit(child);
  }
  return () => {
    // Refresh actual pass visibility: prepareView may change it between cameras.
    objectShown.fill(0); changed = false;
    for (const root of roots) visit(root);
    return changed;
  };
}

/** Preserve the material draw and submit only original parts and faces that
 * this render camera can rasterize. The untouched bounds still enclose all views.
 */
export function enableStaticBatchCulling(mesh: THREE.Mesh, ranges: readonly StaticDestructionRange[], bounds: readonly THREE.Box3[], sourceVisibility?: readonly (readonly THREE.Object3D[])[]) {
  const originalGeometry = mesh.geometry, positions = originalGeometry.getAttribute("position");
  let geometry = originalGeometry;
  let indices: Uint32Array<ArrayBufferLike> = new Uint32Array(positions.count);
  for (let i = 0; i < indices.length; i++) indices[i] = i;
  let attribute = new THREE.BufferAttribute(indices, 1).setUsage(THREE.DynamicDrawUsage); geometry.setIndex(attribute);
  const planes = new Float64Array(positions.count / 3 * 4), planeReady = new Uint8Array(positions.count / 3), shown = new Uint8Array(positions.count / 3).fill(1);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
  const frustum = new THREE.Frustum(), projection = new THREE.Matrix4(), previousProjection = new THREE.Matrix4(), inverse = new THREE.Matrix4(), previousWorld = new THREE.Matrix4(), eye = new THREE.Vector3();
  let hasCamera = false, hasInverse = false, dirty = false, orthographic = false, side: THREE.Side = THREE.DoubleSide;
  let coordinateSystem: THREE.CoordinateSystem = THREE.WebGLCoordinateSystem;
  let reversedDepth = false;
  const sourceShown = new Uint8Array(ranges.length).fill(1);
  const refreshSourceVisibility = sourceVisibility ? compileSourceVisibility(sourceVisibility, sourceShown) : undefined;
  let visibilityEpoch = 0, destructionEpoch = 0;
  function refreshVisibility() {
    if (refreshSourceVisibility?.()) { visibilityEpoch++; dirty = true; }
    return visibilityEpoch;
  }
  const rangeProjected = new Uint8Array(ranges.length).fill(1);
  const orderedRanges = Array.from(ranges, (_, i) => i).sort((a, b) => ranges[a]!.offset - ranges[b]!.offset);
  let end = 0, partitioned = true;
  for (const i of orderedRanges) {
    const range = ranges[i]!;
    partitioned &&= range.offset === end && range.count >= 0 && range.count % 3 === 0;
    end = range.offset + range.count;
  }
  partitioned &&= end === positions.count;
  const uploadRanges = new WeakMap<THREE.BufferAttribute, { start: number; count: number }>();
  function update(camera?: THREE.Camera, material?: THREE.Material, visibilityRefreshed = false) {
    if (!visibilityRefreshed) refreshVisibility();
    if (camera) {
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
      const nextOrthographic = Boolean((camera as THREE.OrthographicCamera).isOrthographicCamera), nextSide = material?.side ?? THREE.DoubleSide;
      if (!dirty && hasCamera && previousProjection.equals(projection) && orthographic === nextOrthographic
        && side === nextSide && coordinateSystem === camera.coordinateSystem && reversedDepth === camera.reversedDepth) return;
      previousProjection.copy(projection); coordinateSystem = camera.coordinateSystem; reversedDepth = camera.reversedDepth;
      frustum.setFromProjectionMatrix(projection, coordinateSystem, reversedDepth);
      // Camera movement does not change this static mesh's inverse. Parent
      // movement and mirrored transforms still invalidate it exactly.
      if (!hasInverse || !previousWorld.equals(mesh.matrixWorld)) {
        inverse.copy(mesh.matrixWorld).invert(); previousWorld.copy(mesh.matrixWorld); hasInverse = true;
      }
      orthographic = nextOrthographic;
      if (orthographic) eye.setFromMatrixColumn(camera.matrixWorld, 2).transformDirection(inverse);
      else eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
      side = nextSide; hasCamera = true;
    }
    const hidden = mesh.userData.destroyedParts as ReadonlySet<string> | undefined;
    let changed = dirty, remaining = false;
    const tolerance = orthographic ? 1e-9 : 1e-4;
    for (let r = 0; r < ranges.length; r++) {
      const range = ranges[r]!, intact = !range.id || !hidden?.has(range.id); remaining ||= intact;
      const inView = intact && Boolean(sourceShown[r]) && (!hasCamera || frustum.intersectsBox(bounds[r]!));
      if (partitioned && !inView) {
        // Clear a newly hidden section once; successive cameras outside that
        // whole section do not need to revisit any of its triangles.
        if (rangeProjected[r]) { shown.fill(0, range.offset / 3, (range.offset + range.count) / 3); changed = true; }
        rangeProjected[r] = 0; continue;
      }
      rangeProjected[r] = inView ? 1 : 0;
      for (let vertex = range.offset; vertex < range.offset + range.count; vertex += 3) {
        const triangle = vertex / 3, p = triangle * 4;
        let visible = inView;
        if (visible && hasCamera && side !== THREE.DoubleSide) {
          // Distant cells and double-sided surfaces need no plane at startup.
          // Cache the same exact plane when a pass first selects this triangle.
          if (!planeReady[triangle]) {
            a.fromBufferAttribute(positions, vertex); b.fromBufferAttribute(positions, vertex + 1); c.fromBufferAttribute(positions, vertex + 2);
            normal.crossVectors(b.sub(a), c.sub(a)).normalize();
            planes[p] = normal.x; planes[p + 1] = normal.y; planes[p + 2] = normal.z; planes[p + 3] = normal.dot(a); planeReady[triangle] = 1;
          }
          const facing = planes[p]! * eye.x + planes[p + 1]! * eye.y + planes[p + 2]! * eye.z - (orthographic ? 0 : planes[p + 3]!);
          visible = side === THREE.FrontSide ? facing >= -tolerance : facing <= tolerance;
        }
        const next = visible ? 1 : 0;
        if (shown[triangle] !== next) { shown[triangle] = next; changed = true; }
      }
    }
    // Only destruction hides the complete mesh. A later shadow/reflection
    // camera must still be allowed to select geometry after an empty colour pass.
    mesh.visible = remaining;
    if (!changed) return; dirty = false;
    let count = 0;
    if (partitioned) for (const r of orderedRanges) {
      if (!rangeProjected[r]) continue;
      const range = ranges[r]!;
      for (let vertex = range.offset; vertex < range.offset + range.count; vertex += 3) if (shown[vertex / 3]) {
        indices[count++] = vertex; indices[count++] = vertex + 1; indices[count++] = vertex + 2;
      }
    } else for (let triangle = 0; triangle < shown.length; triangle++) if (shown[triangle]) {
      const vertex = triangle * 3; indices[count++] = vertex; indices[count++] = vertex + 1; indices[count++] = vertex + 2;
    }
    // The element buffer is uploaded by renderBufferDirect binding setup after
    // these callbacks, even when colour and shadow draw in the same frame.
    geometry.setDrawRange(0, count);
    if (count > 0) {
      // The unused tail remains allocated for other cameras and restoration.
      // A zero draw leaves an earlier pending upload intact and adds none.
      let uploadRange = uploadRanges.get(attribute);
      if (!uploadRange) { uploadRange = { start: 0, count }; uploadRanges.set(attribute, uploadRange); }
      attribute.clearUpdateRanges(); uploadRange.count = count; attribute.updateRanges.push(uploadRange); attribute.needsUpdate = true;
    }
  }
  type GPUProtocol = ReturnType<NonNullable<ReturnType<typeof getNodeMaterials>>["createWebGPUStaticBatchCullingProtocol"]>;
  let gpuProtocol: GPUProtocol | undefined;
  mesh.onBeforeRender = (renderer, scene, camera, _geometry, material) => {
    if (!renderer || !("isWebGPURenderer" in renderer)) { update(camera, material); return; }
    if (!gpuProtocol) {
      const nodes = getNodeMaterials();
      if (!nodes) throw new Error("WebGPU static culling requires the initialized node material runtime");
      gpuProtocol = nodes.createWebGPUStaticBatchCullingProtocol(mesh, originalGeometry, positions.count, {
        refreshVisibility, destructionEpoch: () => destructionEpoch,
        activate(next) { mesh.geometry = geometry = next; attribute = next.index!; indices = attribute.array as Uint32Array; },
        update(camera, side) { dirty = true; update(camera, { side } as THREE.Material, true); },
      });
    }
    gpuProtocol.before(renderer, scene, camera, material);
  };
  mesh.onAfterRender = renderer => {
    if (!renderer || !("isWebGPURenderer" in renderer)) return;
    gpuProtocol?.after();
  };
  mesh.onBeforeShadow = (renderer, _object, _camera, shadowCamera, _geometry, depthMaterial) => {
    // GPU switches to the shadow camera allocation in onBeforeRender below.
    // Its earlier onBeforeShadow callback still points at the main allocation.
    if (renderer && "isWebGPURenderer" in renderer) return;
    update(shadowCamera, depthMaterial);
  };
  mesh.userData.rebuildDestruction = () => { destructionEpoch++; dirty = true; update(); };
}
