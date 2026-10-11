import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { enableStaticBatchCulling } from "./staticBatchCulling";

export interface StaticDestructionRange { id: string | null; offset: number; count: number }
export interface StaticBatchOptions {
  cameraCulling?: boolean;
  /** Retain the visibility of original cells and owners when joining their batches. */
  preserveSourceVisibility?: boolean;
}
export function destructibleOwner(object: THREE.Object3D): string | null {
  for (let p: THREE.Object3D | null = object; p; p = p.parent) if (typeof p.userData.destructibleId === "string") return p.userData.destructibleId;
  return null;
}

/** Bake directly into the final non-indexed attributes. Repeated box/leaf
 * sources otherwise expand, transform and copy their arrays through several
 * temporary geometries before reaching the same merged buffer.
 */
function bakeStaticParts(parts: readonly THREE.Mesh<THREE.BufferGeometry, THREE.Material>[], inverseRoot: THREE.Matrix4) {
  const names = Object.keys(parts[0]!.geometry.attributes), first = parts[0]!.geometry;
  const supported = parts.every(part => {
    const geometry = part.geometry, count = geometry.getAttribute("position").count;
    if (Object.keys(geometry.morphAttributes).length || geometry.index?.normalized) return false;
    return names.every(name => {
      const attribute = geometry.getAttribute(name), reference = first.getAttribute(name);
      return attribute instanceof THREE.BufferAttribute
        && !(attribute instanceof THREE.Float16BufferAttribute)
        && !(attribute instanceof THREE.InstancedBufferAttribute)
        && attribute.count === count && attribute.gpuType === THREE.FloatType && attribute.array.constructor === reference.array.constructor
        && attribute.gpuType === (reference as THREE.BufferAttribute).gpuType;
    });
  });
  if (!supported) {
    const temporary = parts.map(part => {
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot, part.matrixWorld)); return geometry;
    });
    const geometry = mergeGeometries(temporary); temporary.forEach(item => item.dispose()); return geometry;
  }
  const count = parts.reduce((sum, part) => sum + (part.geometry.index?.count ?? part.geometry.getAttribute("position").count), 0);
  const geometry = new THREE.BufferGeometry();
  for (const name of names) {
    const source = first.getAttribute(name) as THREE.BufferAttribute;
    const ArrayType = source.array.constructor as THREE.TypedArrayConstructor;
    const attribute = new THREE.BufferAttribute(new ArrayType(count * source.itemSize), source.itemSize, source.normalized);
    attribute.gpuType = source.gpuType; geometry.setAttribute(name, attribute);
  }
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3(), vector = new THREE.Vector3();
  let offset = 0;
  for (const part of parts) {
    const index = part.geometry.index, count = index?.count ?? part.geometry.getAttribute("position").count;
    matrix.multiplyMatrices(inverseRoot, part.matrixWorld); normalMatrix.getNormalMatrix(matrix);
    for (const name of names) {
      const source = part.geometry.getAttribute(name) as THREE.BufferAttribute, target = geometry.getAttribute(name) as THREE.BufferAttribute;
      if (name === "position" || name === "normal" || name === "tangent") {
        for (let i = 0; i < count; i++) {
          const vertex = index ? index.getX(i) : i;
          vector.fromBufferAttribute(source, vertex);
          if (name === "position") vector.applyMatrix4(matrix);
          else if (name === "normal") vector.applyNormalMatrix(normalMatrix);
          else vector.transformDirection(matrix);
          target.setXYZ(offset + i, vector.x, vector.y, vector.z);
          // Tangents may have a fourth handedness component, untouched by
          // BufferGeometry.applyMatrix4, including normalized integer storage.
          for (let c = 3; c < source.itemSize; c++) target.array[(offset + i) * source.itemSize + c] = source.array[vertex * source.itemSize + c]!;
        }
      } else if (!index) target.array.set(source.array, offset * source.itemSize);
      else for (let i = 0; i < count; i++) {
        const start = index.getX(i) * source.itemSize, output = (offset + i) * source.itemSize;
        for (let c = 0; c < source.itemSize; c++) target.array[output + c] = source.array[start + c]!;
      }
    }
    offset += count;
  }
  return geometry;
}
/** Bake only rigid, opaque parts. Call before the model is attached to the scene. */
export function batchStaticModel(root: THREE.Group, sharedGeometry?: ReadonlySet<THREE.BufferGeometry>, boundaries?: ReadonlySet<THREE.Object3D>, options?: StaticBatchOptions) {
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const buckets = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
  root.traverseVisible(object => {
    // Selectable outfits, helmets and cargo must retain their visibility boundaries.
    for (let parent: THREE.Object3D | null = object; parent && parent !== root; parent = parent.parent) {
      if (parent.userData.skinPart || boundaries?.has(parent)) return;
    }
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh
      || Array.isArray(object.material) || object.material.transparent
      || object.geometry.morphAttributes.position || object.children.length > 0) return;
    const attributes = Object.keys(object.geometry.attributes).sort().map(key => {
      const attribute = object.geometry.getAttribute(key);
      return `${key}:${attribute.itemSize}:${attribute.normalized}`;
    }).join(",");
    const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}/${object.layers.mask}/${object.renderOrder}/${attributes}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(object);
    buckets.set(key, bucket);
  });
  const removedGeometries = new Set<THREE.BufferGeometry>();
  for (const parts of buckets.values()) {
    if (parts.length < 2) continue;
    const geometry = bakeStaticParts(parts, inverseRoot);
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const source = parts[0];
    const mesh = new THREE.Mesh(geometry, source.material);
    mesh.name = "static-batch";
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    mesh.layers.mask = source.layers.mask;
    mesh.renderOrder = source.renderOrder;
    let offset = 0;
    const ranges: StaticDestructionRange[] = [], partBounds: THREE.Box3[] = [], sourceVisibility: THREE.Object3D[][] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!, positions = geometry.getAttribute("position");
      const count = part.geometry.index?.count ?? part.geometry.getAttribute("position").count;
      const inherited = part.userData.destructibleRanges as StaticDestructionRange[] | undefined;
      const sections = inherited ?? [{ id: destructibleOwner(part), offset: 0, count }];
      const ancestors: THREE.Object3D[] = [];
      // Cells and owners stay in the scene after their rigid meshes are baked.
      // Retaining a removed source mesh would also retain its disposed arrays.
      if (options?.preserveSourceVisibility) for (let parent = part.parent; parent && parent !== root; parent = parent.parent) ancestors.push(parent);
      for (const section of sections) {
        ranges.push({ ...section, offset: section.offset + offset });
        sourceVisibility.push(ancestors);
        if (options?.cameraCulling || options?.preserveSourceVisibility) {
          const bounds = new THREE.Box3(), point = new THREE.Vector3();
          for (let n = section.offset; n < section.offset + section.count; n++) bounds.expandByPoint(point.fromBufferAttribute(positions, offset + n));
          partBounds.push(bounds.expandByScalar(0.001));
        }
      }
      offset += count;
    }
    if (ranges.some(r => r.id)) mesh.userData.destructibleRanges = ranges;
    if (partBounds.length) enableStaticBatchCulling(mesh, ranges, partBounds, options?.preserveSourceVisibility ? sourceVisibility : undefined);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    for (const part of parts) {
      removedGeometries.add(part.geometry);
      part.removeFromParent();
    }
  }
  // A source geometry can also belong to an unbatched transparent part.
  root.traverse(object => {
    if (object instanceof THREE.Mesh) removedGeometries.delete(object.geometry);
  });
  removedGeometries.forEach(geometry => { if (!sharedGeometry?.has(geometry)) geometry.dispose(); });
}
