import * as THREE from "three";
import { HARBOR_COLORS as C } from "../config/render/environment";

/** Original shared-bike livery (fictional 云骑单车): teal frame, cream fenders and lock. */
export const SHARED_BIKE_COLORS = { frame: C.teal, trim: "#ece5d0", dark: "#1d2427", rubber: "#14181a", metal: "#aeb7bb" } as const;
export const SHARED_BIKE_SIZE = { length: 1.8, width: 0.66, height: 1.12, wheelRadius: 0.33 } as const;

/**
 * Low-poly step-through shared bike: origin on the ground at the bike centre,
 * local -Z forward. Front basket, rear smart lock and kickstand read at a glance.
 */
export function createSharedBikeModel() {
  const group = new THREE.Group();
  group.name = "shared-bike";
  const material = (color: string, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
  const frame = material(SHARED_BIKE_COLORS.frame, 0.55), trim = material(SHARED_BIKE_COLORS.trim);
  const dark = material(SHARED_BIKE_COLORS.dark), rubber = material(SHARED_BIKE_COLORS.rubber, 0.95), metal = material(SHARED_BIKE_COLORS.metal, 0.4);
  const add = (name: string, mesh: THREE.Mesh, position: [number, number, number]) => {
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (name: string, size: [number, number, number], position: [number, number, number], paint = frame) =>
    add(name, new THREE.Mesh(new THREE.BoxGeometry(...size), paint), position);
  const tube = (name: string, from: THREE.Vector3, to: THREE.Vector3, radius = 0.028, paint = frame) => {
    const direction = to.clone().sub(from);
    const mesh = add(name, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), paint), [0, 0, 0]);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };
  const r = SHARED_BIKE_SIZE.wheelRadius;
  for (const z of [-0.56, 0.56]) {
    const wheel = add("wheel", new THREE.Mesh(new THREE.TorusGeometry(r - 0.035, 0.035, 6, 18), rubber), [0, r, z]);
    wheel.rotation.y = Math.PI / 2;
    const hub = add("hub", new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 8), metal), [0, r, z]);
    hub.rotation.z = Math.PI / 2;
    // Solid spoke discs keep the low-poly silhouette readable from a distance.
    const disc = add("wheel-disc", new THREE.Mesh(new THREE.CylinderGeometry(r - 0.07, r - 0.07, 0.012, 14), trim), [0, r, z]);
    disc.rotation.z = Math.PI / 2;
    box("fender", [0.09, 0.025, 0.46], [0, r * 2 + 0.06, z + (z < 0 ? -0.04 : 0.04)], trim);
  }
  const bottom = new THREE.Vector3(0, 0.3, 0.02), head = new THREE.Vector3(0, 0.86, -0.42), seat = new THREE.Vector3(0, 0.86, 0.2);
  tube("down-tube", head, bottom, 0.034);
  tube("seat-tube", bottom, seat);
  tube("chain-stay", bottom, new THREE.Vector3(0, r, 0.56));
  tube("seat-stay", seat.clone().setY(0.72), new THREE.Vector3(0, r, 0.56), 0.022);
  tube("fork", head, new THREE.Vector3(0, r, -0.56), 0.026, metal);
  tube("stem", head, new THREE.Vector3(0, 1.02, -0.38), 0.024, metal);
  const bar = add("handlebar", new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.58, 6), metal), [0, 1.03, -0.38]);
  bar.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) box("grip", [0.1, 0.04, 0.04], [side * 0.27, 1.03, -0.38], dark);
  box("saddle", [0.15, 0.06, 0.26], [0, 0.9, 0.22], dark);
  box("chain-guard", [0.03, 0.12, 0.46], [0.07, 0.34, 0.3], trim);
  box("brand-plate", [0.075, 0.12, 0.2], [0, 0.6, -0.2], trim);
  // Open front basket: floor and four thin walls.
  box("basket-floor", [0.36, 0.02, 0.28], [0, 0.84, -0.66], dark);
  box("basket-front", [0.36, 0.2, 0.02], [0, 0.94, -0.8], dark);
  box("basket-back", [0.36, 0.2, 0.02], [0, 0.94, -0.52], dark);
  for (const side of [-1, 1]) box("basket-side", [0.02, 0.2, 0.28], [side * 0.18, 0.94, -0.66], dark);
  // Rear smart lock with a dark code panel on top.
  box("smart-lock", [0.17, 0.11, 0.2], [0, r * 2 + 0.13, 0.6], trim);
  box("lock-panel", [0.11, 0.012, 0.12], [0, r * 2 + 0.19, 0.6], dark);
  const stand = box("kickstand", [0.025, 0.3, 0.025], [0.12, 0.19, 0.18], metal);
  stand.rotation.z = 0.35;
  return group;
}
