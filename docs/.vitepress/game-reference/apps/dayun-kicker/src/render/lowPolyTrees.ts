import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type TreeKind = "broadleaf" | "column" | "layered" | "palm" | "royal-palm";
interface TreeOptions { kind?: TreeKind; position?: [number, number, number]; scale?: number; seed?: number }

/** Two opaque meshes per tree, shared face colors and a tiny three-band lighting ramp. */
export function createLowPolyTrees() {
  const ramp = new THREE.DataTexture(new Uint8Array([72, 72, 72, 255, 156, 156, 156, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
  const foliage = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  const bark = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  foliage.name = "lowpoly-foliage"; bark.name = "lowpoly-bark";
  // Feather leaves are open surfaces. One shared opaque double-sided material
  // preserves both sides without duplicating every leaflet's triangles.
  const featherFoliage = foliage.clone(); featherFoliage.side = THREE.DoubleSide; featherFoliage.name = "lowpoly-feather-foliage";
  const crowns = {
    broadleaf: crown([[0, 4.55, 0, 1.25, 1.2, 1.2], [-0.8, 3.7, 0.05, 1, 1.15, 1.05], [0.75, 3.65, -0.1, 1.05, 1.05, 1.1]]),
    column: crown([[0, 4.7, 0, 0.86, 1.3, 0.87], [-0.43, 3.65, 0.1, 0.72, 1.15, 0.76], [0.43, 3.7, -0.08, 0.76, 1.2, 0.72]]),
    layered: crown([[0.12, 4.5, 0, 1.24, 1.1, 1.05], [-0.75, 3.7, 0.12, 0.98, 0.88, 1.12], [0.8, 3.55, -0.1, 1, 0.95, 1.05]]),
    palm: palmCrown(),
    "royal-palm": royalPalmCrown(),
  };
  const trunk = branchedTrunk(), palmTrunk = faceColor(new THREE.CylinderGeometry(0.15, 0.26, 5.25, 6).translate(0, 2.625, 0), true);
  const royalTrunk = faceColor(new THREE.CylinderGeometry(.22, .38, 13.2, 8, 2).translate(0, 6.6, 0), true, true);
  const sources = new Set([...Object.values(crowns), trunk, palmTrunk, royalTrunk]), disposed = new Set<THREE.BufferGeometry>();
  // Static batching or the owning scene may release a source before this palette is destroyed.
  sources.forEach(geometry => geometry.addEventListener("dispose", () => disposed.add(geometry)));
  let sequence = 0;
  return {
    geometries: sources as ReadonlySet<THREE.BufferGeometry>,
    add(parent: THREE.Object3D, options: TreeOptions = {}) {
      const seed = options.seed ?? sequence++, kinds = ["broadleaf", "column", "layered"] as const;
      const kind = options.kind ?? kinds[Math.abs(seed) % kinds.length]!;
      const tree = new THREE.Group(); tree.name = `lowpoly-tree-${kind}`;
      tree.position.set(...(options.position ?? [0, 0, 0])); tree.scale.setScalar(options.scale ?? 1);
      tree.rotation.y = (seed * 2.399963) % (Math.PI * 2);
      for (const [geometry, material] of [[kind === "royal-palm" ? royalTrunk : kind === "palm" ? palmTrunk : trunk, bark], [crowns[kind], kind === "royal-palm" ? featherFoliage : foliage]] as const) {
        const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; tree.add(mesh);
      }
      parent.add(tree); return tree;
    },
    dispose() {
      sources.forEach(geometry => { if (!disposed.has(geometry)) geometry.dispose(); });
      foliage.dispose(); featherFoliage.dispose(); bark.dispose(); ramp.dispose();
    },
  };
}

function crown(clumps: number[][]) {
  const pieces = clumps.map(([x, y, z, sx, sy, sz]) => {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    geometry.scale(sx!, sy!, sz!); geometry.translate(x!, y!, z!); return geometry;
  });
  return faceColor(mergeParts(pieces));
}

function branchedTrunk() {
  // Ground hides the root cap; opaque crowns and branch joints hide the other
  // ends. Open tubes keep the same silhouette without those internal faces.
  const trunk = new THREE.CylinderGeometry(0.14, 0.25, 3.45, 6, 1, true).translate(0, 1.725, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const branches = [-1, 1].map(side => {
    const start = new THREE.Vector3(0, 2.25, 0), end = new THREE.Vector3(side * 0.8, 3.55, side * -0.08);
    const direction = end.clone().sub(start), geometry = new THREE.CylinderGeometry(0.065, 0.13, direction.length(), 4, 1, true);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(0.5).toArray()); return geometry;
  });
  return faceColor(mergeParts([trunk, ...branches]), true);
}

function palmCrown() {
  const p: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7, c = Math.cos(angle), s = Math.sin(angle), base = p.length / 3;
    for (const [r, y, width] of [[0, 5.25, 0], [0.9, 5.35, -0.42], [0.9, 5.6, 0], [0.9, 5.35, 0.42], [2.05, 4.78, 0], [0.9, 5.22, 0]]) {
      p.push(c * r! - s * width!, y!, s * r! + c * width!); uv.push(r! / 2.05, width! + 0.5);
    }
    for (const n of [0, 1, 2, 0, 2, 3, 1, 4, 2, 2, 4, 3, 0, 5, 1, 0, 3, 5, 1, 5, 4, 5, 3, 4]) index.push(base + n);
  }
  const fronds = new THREE.BufferGeometry(); fronds.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  fronds.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); fronds.setIndex(index);
  const center = new THREE.IcosahedronGeometry(0.43, 0).translate(0, 5.35, 0);
  return faceColor(mergeParts([fronds, center]));
}

/** Tall smooth trunk, green crownshaft and drooping feather leaves observed
 * beside E block. Leaflets are opaque folded triangles, with no alpha overdraw.
 */
function royalPalmCrown() {
  const p: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) => p.push(...a, ...b, ...c);
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9, c = Math.cos(angle), s = Math.sin(angle);
    const at = (t: number, side = 0) => [c * t * 3.9 - s * side, 14.2 + Math.sin(t * Math.PI) * .7 - t * t * 2.4, s * t * 3.9 + c * side];
    for (let j = 0; j < 6; j++) {
      const t = .12 + j * .14, a = at(t), b = at(t + .14);
      for (const side of [-1, 1]) {
        const tip = at(t + .24, side * Math.sin(t * Math.PI) * .72); tip[1]! -= .22;
        const ridge = at(t + .08, side * .13); ridge[1]! += .045;
        triangle(a, ridge, tip); triangle(ridge, b, tip);
      }
    }
  }
  const leaves = new THREE.BufferGeometry(); leaves.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  // Match the existing geometry layout for the two shared sector batches.
  leaves.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2));
  const shaft = new THREE.CylinderGeometry(.24, .22, 1.15, 8).translate(0, 13.65, 0);
  return faceColor(mergeParts([leaves, shaft]), false, true);
}

function mergeParts(parts: THREE.BufferGeometry[]) {
  const flat = parts.map(p => p.index ? p.toNonIndexed() : p.clone());
  // All parts use the same layout, so they can also join the existing sector batches.
  flat.forEach(p => p.computeVertexNormals());
  const merged = mergeGeometries(flat)!;
  [...parts, ...flat].forEach(p => p.dispose()); return merged;
}

/** One color per triangle keeps facets crisp; warmer upper foliage avoids a plastic sphere. */
function faceColor(source: THREE.BufferGeometry, wood = false, royal = false) {
  const geometry = source.index ? source.toNonIndexed() : source;
  if (geometry !== source) source.dispose(); geometry.computeVertexNormals();
  const p = geometry.attributes.position, n = geometry.attributes.normal, colors: number[] = [];
  const low = new THREE.Color(wood ? royal ? "#767768" : "#725943" : royal ? "#294e39" : "#46735a"), high = new THREE.Color(wood ? royal ? "#aaa58c" : "#ad8a60" : royal ? "#79945b" : "#9cb56b");
  const color = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const height = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / (royal ? 2.65 : 1);
    const tint = wood ? 0.18 + (n.getX(i) + 1) * 0.2 : THREE.MathUtils.clamp((height - 2.5) / 3.5 * 0.65 + Math.max(0, n.getY(i)) * 0.23, 0, 0.86);
    color.copy(low).lerp(high, tint);
    for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); geometry.computeBoundingSphere(); return geometry;
}
