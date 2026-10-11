import * as THREE from "three";

/** Folded transport poses fit the existing truck collision envelope. */
export function createConstructionBody(
  variant: "crane" | "excavator",
  dark: THREE.MeshStandardMaterial,
  metal: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  group.name = `construction-${variant}`;
  const paint = new THREE.MeshStandardMaterial({ color: "#efb632", roughness: 0.65, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({ color: "#234858", roughness: 0.3 });
  const box = (name: string, size: [number, number, number], position: [number, number, number], material = paint) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const beam = (name: string, start: THREE.Vector3, end: THREE.Vector3, width: number, material = paint) => {
    const direction = end.clone().sub(start);
    const mesh = box(name, [width, direction.length(), width], [0, 0, 0], material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };
  const pivot = (name: string, radius: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.18, 12), dark);
    mesh.name = name;
    mesh.position.set(0, y, z);
    group.add(mesh);
  };
  box("transport-deck", [2.4, 0.22, 4.05], [0, 0.65, 0.76]);
  for (const side of [-1, 1]) {
    box("side-rail", [0.12, 0.26, 3.6], [side * 1.14, 0.8, 0.76], dark);
    // Small inlaid safety blocks stay flush with the transport platform.
    for (const z of [-0.65, 0.1, 0.85, 1.6, 2.35]) {
      box("safety-marker", [0.025, 0.12, 0.22], [side * 1.207, 0.66, z], metal);
    }
  }
  if (variant === "crane") {
    pivot("slew-ring", 0.62, 0.92, -0.3);
    box("operator-cab", [0.66, 0.95, 0.8], [-0.6, 1.37, -0.52]);
    box("operator-window", [0.025, 0.52, 0.57], [-0.945, 1.53, -0.57], glass);
    box("operator-inner-window", [0.025, 0.52, 0.57], [-0.255, 1.53, -0.57], glass);
    box("operator-windshield", [0.48, 0.52, 0.025], [-0.6, 1.53, -0.933], glass);
    box("counterweight", [0.64, 0.55, 0.95], [0.58, 1.14, -0.5], dark);
    beam("main-boom", new THREE.Vector3(0.15, 1.2, -0.6), new THREE.Vector3(0.15, 1.77, 1.42), 0.4);
    beam("telescoping-boom", new THREE.Vector3(0.15, 1.65, 1), new THREE.Vector3(0.15, 1.98, 2.42), 0.24);
    beam("lift-cylinder", new THREE.Vector3(0.15, 0.94, 0.2), new THREE.Vector3(0.15, 1.58, 1.13), 0.085, metal);
    beam("hook-cable", new THREE.Vector3(0.15, 1.98, 2.42), new THREE.Vector3(0.15, 1.24, 2.42), 0.035, dark);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 10, Math.PI * 1.5), metal);
    hook.name = "crane-hook";
    hook.position.set(0.15, 1.12, 2.42);
    group.add(hook);
    for (const side of [-1, 1]) box("stowed-outrigger", [0.24, 0.24, 0.68], [side * 1, 0.94, -0.66], metal);
  } else {
    for (const side of [-1, 1]) {
      box("crawler-track", [0.4, 0.33, 2.15], [side * 0.7, 0.96, 0.68], dark);
      for (const z of [-0.06, 0.67, 1.4]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 8), metal);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.7, 0.96, z);
        group.add(wheel);
      }
    }
    pivot("excavator-turntable", 0.5, 1.2, 0.45);
    box("operator-cab", [0.72, 0.86, 0.92], [-0.43, 1.69, 0.36]);
    box("operator-window", [0.025, 0.56, 0.68], [-0.802, 1.78, 0.34], glass);
    box("operator-inner-window", [0.025, 0.56, 0.68], [-0.057, 1.78, 0.34], glass);
    box("operator-windshield", [0.51, 0.56, 0.025], [-0.43, 1.78, 0.833], glass);
    box("engine-cover", [0.73, 0.48, 1.1], [0.35, 1.46, 0.14]);
    beam("folded-boom", new THREE.Vector3(0.48, 1.43, 0.54), new THREE.Vector3(0.48, 1.97, 1.4), 0.22);
    beam("folded-stick", new THREE.Vector3(0.48, 1.97, 1.4), new THREE.Vector3(0.48, 1.14, 2.08), 0.17);
    beam("hydraulic-ram", new THREE.Vector3(0.48, 1.52, 0.95), new THREE.Vector3(0.48, 1.87, 1.43), 0.065, metal);
    box("bucket-floor", [0.72, 0.1, 0.65], [0.48, 0.91, 2.16], dark);
    box("bucket-back", [0.72, 0.4, 0.09], [0.48, 1.1, 1.88]);
    for (const x of [0.16, 0.8]) box("bucket-side", [0.08, 0.36, 0.56], [x, 1.08, 2.12]);
    for (const x of [0.24, 0.48, 0.72]) box("bucket-tooth", [0.1, 0.09, 0.22], [x, 0.92, 2.52], metal);
  }
  return group;
}
