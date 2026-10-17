import * as THREE from "three";

export type MunicipalVariant = "sprinkler" | "sanitation";

/** Original city-service livery: white body, green belt line and amber work lamps. */
export const MUNICIPAL_BODY_COLOR = "#eef0ea";
export const MUNICIPAL_STRIPE_COLOR = "#2f8f5b";

/** City-service bodies behind the shared truck cab, inside the truck collider. */
export function createMunicipalBody(
  variant: MunicipalVariant,
  paint: THREE.MeshStandardMaterial,
  dark: THREE.MeshStandardMaterial,
  metal: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  group.name = `municipal-${variant}`;
  const stripe = new THREE.MeshStandardMaterial({ color: MUNICIPAL_STRIPE_COLOR, roughness: 0.55 });
  const lamp = new THREE.MeshStandardMaterial({ color: "#ffd166", emissive: "#ff9f1c", emissiveIntensity: 0.9 });
  group.userData.serviceLamp = lamp;
  const add = <T extends THREE.Mesh>(mesh: T, name: string, position: [number, number, number]) => {
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (name: string, size: [number, number, number], position: [number, number, number], material = paint) =>
    add(new THREE.Mesh(new THREE.BoxGeometry(...size), material), name, position);
  const bar = (name: string, radius: number, length: number, position: [number, number, number], material = metal) => {
    const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material), name, position);
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  };

  box("chassis", [2.33, 0.25, 4.2], [0, 0.52, 0.78], dark);
  // Cab door belt line and roof work lamps identify the city-service fleet.
  for (const side of [-1, 1]) box("cab-stripe", [0.02, 0.16, 1.4], [side * 1.198, 0.82, -2.08], stripe);
  box("roof-lamp-bar", [0.72, 0.09, 0.2], [0, 1.84, -2.12], lamp);

  if (variant === "sprinkler") {
    // An oval tank reads differently from the round fuel tanker.
    const tankGeometry = new THREE.CylinderGeometry(0.9, 0.9, 3.6, 20);
    tankGeometry.rotateX(Math.PI / 2);
    tankGeometry.scale(1.22, 0.8, 1);
    add(new THREE.Mesh(tankGeometry, paint), "water-tank", [0, 1.36, 0.78]);
    for (const z of [-0.45, 2.0]) {
      const strap = add(new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.035, 6, 24), metal), "tank-strap", [0, 1.36, z]);
      strap.scale.set(1.22, 0.8, 1);
    }
    for (const side of [-1, 1]) box("tank-stripe", [0.02, 0.18, 3.3], [side * 1.104, 1.36, 0.78], stripe);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 12), metal), "tank-hatch", [0, 2.1, 0.2]);
    for (const side of [-1, 1]) {
      const rail = box("roof-rail", [0.05, 0.05, 2.1], [side * 0.48, 2.17, 0.95], metal);
      rail.castShadow = false;
    }
    // Ladder rails and rungs sit on the flat rear tank face.
    for (const x of [0.52, 0.86]) box("ladder-rail", [0.05, 1.32, 0.05], [x, 1.32, 2.62], metal);
    for (const y of [0.85, 1.2, 1.55, 1.9]) box("ladder-rung", [0.38, 0.04, 0.04], [0.69, y, 2.62], metal);
    bar("rear-spray-bar", 0.06, 2.2, [0, 0.27, 2.86]);
    for (const x of [-0.9, -0.3, 0.3, 0.9]) {
      const nozzle = box("spray-nozzle", [0.12, 0.08, 0.16], [x, 0.21, 2.83], dark);
      nozzle.rotation.x = 0.5;
    }
    for (const side of [-1, 1]) {
      bar("side-spray-pipe", 0.045, 0.4, [side * 0.93, 0.34, -1.05]);
      box("side-spray-nozzle", [0.1, 0.08, 0.12], [side * 1.16, 0.34, -1.05], dark);
    }
    return group;
  }

  // Rear-loading compactor: tall box body, raked tailgate and bin tipper.
  box("compactor-body", [2.36, 1.52, 2.75], [0, 1.42, 0.225]);
  for (const side of [-1, 1]) {
    box("body-stripe", [0.02, 0.22, 2.6], [side * 1.19, 1.02, 0.225], stripe);
    for (const z of [-0.65, 0.25, 1.15]) box("body-rib", [0.05, 1.44, 0.08], [side * 1.2, 1.42, z], paint);
  }
  box("body-seam", [2.32, 1.3, 0.04], [0, 1.42, 1.6], dark);
  // The tailgate hangs from its top hinge with the bottom raked rearward.
  const tailgate = new THREE.Group();
  tailgate.name = "tailgate-pivot";
  tailgate.position.set(0, 2.1, 1.63);
  tailgate.rotation.x = -0.15;
  const onTailgate = (mesh: THREE.Mesh) => {
    group.remove(mesh);
    tailgate.add(mesh);
    return mesh;
  };
  onTailgate(box("tailgate", [2.3, 1.2, 0.95], [0, -0.68, 0.475]));
  onTailgate(box("bin-tipper", [1.5, 0.12, 0.08], [0, -0.82, 0.99], metal));
  for (const x of [-0.6, 0.6]) onTailgate(box("bin-tipper-hook", [0.1, 0.3, 0.1], [x, -1.0, 1.0], metal));
  const hazardRed = new THREE.MeshStandardMaterial({ color: "#d1372f", roughness: 0.5 });
  onTailgate(box("hazard-plate", [1.6, 0.24, 0.015], [0, -0.25, 0.952], dark));
  for (let i = 0; i < 5; i++) {
    onTailgate(box("hazard-stripe", [0.26, 0.16, 0.02], [(i - 2) * 0.3, -0.25, 0.962], i % 2 ? paint : hazardRed));
  }
  for (const x of [-0.95, 0.95]) onTailgate(box("tailgate-lamp", [0.16, 0.1, 0.05], [x, -0.25, 0.96], lamp));
  group.add(tailgate);
  const hopper = box("hopper-sill", [2.2, 0.4, 0.75], [0, 0.75, 2.5], dark);
  hopper.rotation.x = 0.35;
  bar("tailgate-hinge", 0.08, 2.32, [0, 2.1, 1.63], dark);
  for (const side of [-1, 1]) {
    const ram = box("tailgate-ram", [0.09, 0.95, 0.09], [side * 1.19, 1.5, 1.88], metal);
    ram.rotation.x = -0.35;
  }
  return group;
}

export interface MunicipalEffects {
  lamp: THREE.MeshStandardMaterial | null;
  spray: THREE.Group | null;
}

/**
 * Translucent spray fans and a fading wet strip behind the sprinkler. They are
 * kept out of the collider body and the static batch (transparent materials),
 * and stay hidden until animateMunicipalEffects runs.
 */
export function createSprinklerSpray() {
  const group = new THREE.Group();
  group.name = "sprinkler-spray";
  // Static previews show the clean truck; the race loop reveals the spray.
  group.visible = false;
  const water = new THREE.MeshBasicMaterial({
    color: "#dff3ff", transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide,
  });
  const wet = new THREE.MeshBasicMaterial({
    color: "#1b262b", transparent: true, opacity: 0.26, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const fan = (name: string, points: readonly (readonly [number, number, number])[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, water);
    mesh.name = name;
    mesh.renderOrder = 2;
    group.add(mesh);
    return mesh;
  };
  // Rear bar: a low sheet hitting the road and a lighter mist arc above it.
  fan("spray-sheet", [[-1.05, 0.24, 2.92], [1.05, 0.24, 2.92], [1.6, 0.02, 4.7], [-1.6, 0.02, 4.7]]);
  fan("spray-mist", [[-0.95, 0.3, 2.95], [0.95, 0.3, 2.95], [1.75, 0.7, 4.1], [-1.75, 0.7, 4.1]]);
  for (const side of [-1, 1]) {
    fan("side-spray", [
      [side * 1.2, 0.38, -1.15], [side * 1.2, 0.3, -0.95], [side * 2.5, 0.02, -0.45], [side * 2.5, 0.02, -1.45],
    ]);
  }
  for (const [name, from, to, opacity] of [["wet-trail-near", 2.9, 13, 1], ["wet-trail-far", 13, 24, 0.45]] as const) {
    const material = opacity === 1 ? wet : wet.clone();
    material.opacity = wet.opacity * opacity;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.7, to - from), material);
    strip.name = name;
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, -0.015, (from + to) / 2);
    strip.renderOrder = 1;
    group.add(strip);
  }
  group.userData.water = water;
  return group;
}

export function findMunicipalEffects(root: THREE.Object3D): MunicipalEffects {
  let lamp: THREE.MeshStandardMaterial | null = null;
  let spray: THREE.Group | null = null;
  root.traverse(object => {
    if (object.userData.serviceLamp instanceof THREE.MeshStandardMaterial) lamp = object.userData.serviceLamp;
    if (object.name === "sprinkler-spray" && object instanceof THREE.Group) spray = object;
  });
  return { lamp, spray };
}

/** Flashing work lamps and a flickering spray while the truck cruises upright. */
export function animateMunicipalEffects(effects: MunicipalEffects, elapsed: number, active: boolean) {
  const time = Number.isFinite(elapsed) ? elapsed : 0;
  if (effects.lamp) effects.lamp.emissiveIntensity = active && Math.sin(time * 7.5) > 0.15 ? 1.8 : 0.35;
  if (!effects.spray) return;
  effects.spray.visible = active;
  if (!active) return;
  const water = effects.spray.userData.water as THREE.MeshBasicMaterial | undefined;
  if (water) water.opacity = 0.3 + 0.07 * Math.sin(time * 17);
  // Sheets are authored in place, so the flutter is a small offset, not a scale.
  effects.spray.children.forEach((part, index) => {
    if (!part.name.startsWith("wet-trail")) part.position.y = 0.03 * Math.sin(time * 23 + index * 1.9);
  });
}
