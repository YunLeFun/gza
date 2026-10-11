import * as THREE from "three";

/** Original block helmet: open face, clear shield, side padding and connected chin straps. */
export function createRiderHelmet(shell: THREE.Material, lining: THREE.Material, reflector: THREE.Material) {
  const group = new THREE.Group(); group.name = "rider-helmet";
  const add = (name: string, size: [number, number, number], material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name; mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  add("helmet-crown", [0.46, 0.12, 0.45], shell, 0, 0.415, 0.22);
  add("helmet-rear-shell", [0.46, 0.215, 0.075], shell, 0, 0.2475, 0.4075);
  // The lip overlaps the crown in height, so recess its ends from the crown walls.
  add("helmet-brow", [0.45, 0.035, 0.055], shell, 0, 0.367, -0.012);
  add("helmet-reflector", [0.09, 0.055, 0.012], reflector, 0, 0.43, -0.012);
  const glass = new THREE.MeshStandardMaterial({ color: "#b3e7ef", transparent: true, opacity: 0.24,
    roughness: 0.16, metalness: 0.12, depthWrite: false });
  const visor = add("helmet-visor", [0.41, 0.23, 0.012], glass, 0, 0.246, 0.004);
  visor.renderOrder = 2;
  for (const side of [-1, 1]) {
    // Adjacent panels meet at their edges; overlapping coplanar walls shimmer in orbit.
    add(`helmet-side-${side}`, [0.055, 0.215, 0.315], shell, side * 0.2025, 0.2475, 0.2125);
    add(`helmet-inner-padding-${side}`, [0.02, 0.025, 0.28], lining, side * 0.19, 0.14, 0.22);
    add(`visor-hinge-${side}`, [0.02, 0.065, 0.065], lining, side * 0.241, 0.332, 0.06);
    const start = new THREE.Vector3(side * 0.205, 0.14, 0.235), end = new THREE.Vector3(side * 0.1, 0.071, 0.15);
    const strap = add(`helmet-strap-${side}`, [0.023, start.distanceTo(end), 0.022], lining, 0, 0, 0);
    strap.position.copy(start).add(end).multiplyScalar(0.5);
    strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), start.sub(end).normalize());
  }
  add("helmet-chin-strap", [0.22, 0.023, 0.025], lining, 0, 0.071, 0.15);
  add("helmet-buckle", [0.045, 0.035, 0.033], lining, 0.07, 0.071, 0.14);
  group.traverse(object => object.layers.set(2));
  return group;
}
