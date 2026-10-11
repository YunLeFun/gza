import * as THREE from "three";
import { batchStaticModel } from "./staticBatch";

/** Low-poly everyday props share the passenger's grip and forward aim coordinates. */
export function createHouseholdWeaponModels() {
  const wood = new THREE.MeshStandardMaterial({ color: "#91613b", roughness: 0.9 });
  const feathers = new THREE.MeshStandardMaterial({ color: "#d99d55", roughness: 1 });
  const featherTips = new THREE.MeshStandardMaterial({ color: "#a94032", roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: "#71847d", roughness: 0.55, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: "#343638", roughness: 0.85 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#e6c782", roughness: 0.95 });
  const segment = (root: THREE.Group, name: string, from: THREE.Vector3, to: THREE.Vector3, width: number, paint: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, from.distanceTo(to), 6), paint);
    mesh.name = name; mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()); root.add(mesh);
  };
  const duster = new THREE.Group(); duster.name = "passenger-feather-duster";
  segment(duster, "duster-handle", new THREE.Vector3(0, -0.09, 0.08), new THREE.Vector3(0, 0.025, -0.43), 0.022, wood);
  for (let index = 0; index < 9; index++) {
    const angle = index * Math.PI * 2 / 9;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), index % 3 ? feathers : featherTips);
    mesh.name = `duster-feather-${index}`;
    mesh.scale.set(0.045, 0.045, 0.19); mesh.position.set(Math.sin(angle) * 0.055, 0.025 + Math.cos(angle) * 0.055, -0.49);
    mesh.rotation.y = Math.sin(angle) * 0.25; duster.add(mesh);
  }
  const cylinder = new THREE.Group(); cylinder.name = "passenger-gas-cylinder";
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.37, 10), steel);
  tank.name = "gas-cylinder-body"; tank.position.set(0, 0.015, -0.2); cylinder.add(tank);
  for (const y of [-0.18, 0.2]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 5), steel);
    cap.scale.y = 0.4; cap.position.set(0, y, -0.2); cylinder.add(cap);
  }
  segment(cylinder, "gas-cylinder-valve", new THREE.Vector3(0, 0.19, -0.2), new THREE.Vector3(0, 0.28, -0.2), 0.035, dark);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.013, 4, 10), dark);
  handle.name = "gas-cylinder-handle"; handle.position.set(0, 0.25, -0.2); cylinder.add(handle);
  const slingshot = new THREE.Group(); slingshot.name = "passenger-slingshot";
  const base = new THREE.Vector3(0, -0.08, -0.08), fork = new THREE.Vector3(0, 0.04, -0.43);
  segment(slingshot, "slingshot-grip", base, fork, 0.032, wood);
  for (const side of [-1, 1]) {
    const tip = new THREE.Vector3(side * 0.13, 0.19, -0.5);
    segment(slingshot, `slingshot-fork-${side}`, fork, tip, 0.025, wood);
    segment(slingshot, `slingshot-band-${side}`, tip, new THREE.Vector3(0, 0.025, -0.565), 0.008, rubber);
  }
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 4), dark);
  stone.name = "slingshot-stone"; stone.position.set(0, 0.025, -0.565); slingshot.add(stone);
  const models = { "feather-duster": duster, "gas-cylinder": cylinder, slingshot };
  for (const model of Object.values(models)) { model.userData.skinPart = true; batchStaticModel(model); model.visible = false; }
  return models;
}
