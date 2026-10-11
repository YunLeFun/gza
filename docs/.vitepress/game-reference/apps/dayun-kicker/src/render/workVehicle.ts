import * as THREE from "three";

/** Compact self-propelled machines, using the traffic fleet's collision envelope. */
export function createWorkVehicle(variant: "roller" | "loader") {
  const group = new THREE.Group();
  group.name = `work-${variant}`;
  const paint = new THREE.MeshStandardMaterial({ color: variant === "roller" ? "#e9bf36" : "#ef9830", roughness: 0.64, flatShading: true });
  const rubber = new THREE.MeshStandardMaterial({ color: "#192126", roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: "#aebac0", metalness: 0.35, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: "#294c60", roughness: 0.35 });
  const box = (name: string, size: [number, number, number], position: [number, number, number], material = paint) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };
  const axle = (name: string, radius: number, width: number, x: number, y: number, z: number, material = rubber) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), material);
    mesh.name = name;
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  const arm = (x: number, from: THREE.Vector3, to: THREE.Vector3) => {
    const direction = to.clone().sub(from);
    const mesh = box("lift-arm", [0.16, direction.length(), 0.2], [x, 0, 0]);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.position.x = x;
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  };

  box("chassis", [1.7, 0.3, 3.4], [0, 0.65, 0.35], rubber);
  box("engine-hood", [1.6, 0.6, 1.45], [0, 1.02, 1.45]);
  box("rear-grille", [1.22, 0.3, 0.03], [0, 1.07, 2.192], rubber);
  box("operator-cab", [1.13, 0.91, 1.1], [0, 1.59, 0.05]);
  box("windshield", [0.91, 0.61, 0.025], [0, 1.67, -0.513], glass);
  box("rear-window", [0.91, 0.61, 0.025], [0, 1.67, 0.613], glass);
  for (const side of [-1, 1]) {
    box("side-window", [0.025, 0.61, 0.85], [side * 0.578, 1.67, 0.05], glass);
    box("entry-step", [0.32, 0.12, 0.62], [side * 0.9, 0.82, 0.22], metal);
  }
  box("roof", [1.3, 0.13, 1.25], [0, 2.11, 0.05]);
  const lamp = new THREE.MeshStandardMaterial({ color: "#fff4b3", emissive: "#ffc751", emissiveIntensity: 0.65 });
  for (const side of [-1, 1]) box("work-light", [0.18, 0.1, 0.06], [side * 0.45, 2.08, -0.61], lamp);

  if (variant === "roller") {
    axle("front-steel-drum", 0.72, 2.08, 0, 0.73, -1.62, metal);
    for (const side of [-1, 1]) {
      arm(side * 1.12, new THREE.Vector3(0, 0.92, -0.62), new THREE.Vector3(0, 0.73, -1.62));
      axle("rear-tire", 0.64, 0.38, side, 0.65, 1.4);
      axle("rear-hub", 0.3, 0.4, side, 0.65, 1.4, paint);
    }
    box("drum-scraper", [1.94, 0.12, 0.18], [0, 1.38, -1.25], rubber);
  } else {
    for (const side of [-1, 1]) {
      for (const z of [-1.25, 1.4]) {
        axle("loader-tire", 0.57, 0.38, side, 0.58, z);
        axle("loader-hub", 0.26, 0.4, side, 0.58, z, paint);
      }
      arm(side * 0.62, new THREE.Vector3(0, 1.16, -0.2), new THREE.Vector3(0, 0.64, -2.05));
      box("bucket-side", [0.12, 0.55, 0.68], [side * 1.05, 0.58, -2.4]);
    }
    box("bucket-floor", [2.22, 0.12, 0.72], [0, 0.32, -2.4], metal);
    box("bucket-back", [2.22, 0.58, 0.1], [0, 0.61, -2.05]);
    for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) box("bucket-tooth", [0.13, 0.11, 0.22], [x, 0.31, -2.8], metal);
  }
  group.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}
