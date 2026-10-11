import * as THREE from "three";

// Shared render construction, independent of rigid bodies and crossing traffic.
export const CAR_WIDTH = 1.82;

export const CAR_HEIGHT = 1.42;

export const CAR_LENGTH = 4.18;

const BODY_COLORS = ["#2887c8", "#e8b62f", "#d84b45", "#e9e6dc", "#4a9a6c", "#8b63b6"];

export function createCarMesh(id: number) {
  const group = new THREE.Group();
  group.name = `cross-traffic-car-${id}`;
  const visual = new THREE.Group();
  visual.position.y = -CAR_HEIGHT / 2;
  group.add(visual);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: BODY_COLORS[id % BODY_COLORS.length],
    roughness: 0.48,
    metalness: 0.14,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#15191c", roughness: 0.82 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#83bed2",
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.78,
  });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: "#fff2b0",
    emissive: "#ffd95a",
    emissiveIntensity: 1.1,
  });
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: "#ff4c43",
    emissive: "#a90b05",
    emissiveIntensity: 0.95,
  });

  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH, 0.62, CAR_LENGTH), bodyMaterial);
  // Leave a readable strip of daylight beneath the chassis so mini riders can
  // visibly shoot under cross traffic instead of clipping through a solid box.
  lowerBody.position.y = 0.72;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  visual.add(lowerBody);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH * 0.82, 0.72, 2.18), glassMaterial);
  cabin.position.set(0, 1.08, 0.12);
  cabin.scale.z = 1;
  cabin.castShadow = true;
  visual.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH * 0.78, 0.12, 1.7), bodyMaterial);
  roof.position.set(0, 1.45, 0.18);
  roof.castShadow = true;
  visual.add(roof);

  const bumperGeometry = new THREE.BoxGeometry(CAR_WIDTH * 0.82, 0.16, 0.16);
  const frontBumper = new THREE.Mesh(bumperGeometry, darkMaterial);
  frontBumper.position.set(0, 0.5, -CAR_LENGTH / 2 - 0.02);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = CAR_LENGTH / 2 + 0.02;
  visual.add(frontBumper, rearBumper);

  const lampGeometry = new THREE.BoxGeometry(0.3, 0.18, 0.05);
  for (const x of [-0.55, 0.55]) {
    const headlight = new THREE.Mesh(lampGeometry, lightMaterial);
    headlight.position.set(x, 0.67, -CAR_LENGTH / 2 - 0.09);
    const tail = new THREE.Mesh(lampGeometry, tailMaterial);
    tail.position.set(x, 0.67, CAR_LENGTH / 2 + 0.09);
    visual.add(headlight, tail);
  }

  const wheelGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  for (const side of [-1, 1]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(wheelGeometry, darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * (CAR_WIDTH / 2 + 0.03), 0.35, z);
      wheel.castShadow = true;
      visual.add(wheel);
    }
  }

  return group;
}
