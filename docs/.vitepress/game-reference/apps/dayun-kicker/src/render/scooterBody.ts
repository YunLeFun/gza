import * as THREE from "three";
import { SCOOTER_LAYOUT, SCOOTER_SEATING_LAYOUT, type ScooterSeating } from "../config/render/rider";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { batchStaticModel } from "./staticBatch";
import { getScooterSkin } from "../game/skins";

const DEFAULT_CARGO_COLOR = getScooterSkin("stock").palette.cargoColor!;

const seatingModels = new WeakMap<THREE.Group, { single: THREE.Group; double?: THREE.Group;
  fixtures: THREE.Group; createDouble: () => THREE.Group }>();

export function setScooterBodySeating(group: THREE.Group, seating: ScooterSeating) {
  const model = seatingModels.get(group);
  if (!model) throw new Error("Scooter seating requires an original body model");
  if (seating === "double" && !model.double) {
    model.double = model.createDouble();
    group.add(model.double);
  }
  model.single.visible = seating === "single";
  if (model.double) model.double.visible = seating === "double";
  model.fixtures.position.z = seating === "double" ? SCOOTER_SEATING_LAYOUT.rearFixtureOffset : 0;
  group.userData.seating = seating;
}

/** Exterior completion shares the scooter rig but never enters the cockpit pass. */
export function createScooterBody(shell: THREE.Material, accent: THREE.Material, rubber: THREE.Material, metal: THREE.Material) {
  const group = new THREE.Group();
  group.name = "scooter-exterior";
  const box = (name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(0.045, ...size.map(v => v / 3))), material);
    mesh.name = name; mesh.position.set(...position); group.add(mesh); return mesh;
  };
  box("battery-housing", [0.57, 0.26, 0.49], [0, -0.91, 0.13], shell);
  box("seat-pedestal", [0.37, 0.25, 0.3], [0, -0.8, 0.18], rubber);
  box("scooter-seat", [0.55, 0.14, 0.66], [0, -0.72, 0.27], rubber);
  box("seat-piping", [0.56, 0.025, 0.63], [0, -0.765, 0.27], accent);
  const single = new THREE.Group();
  single.name = "scooter-single-seat-kit";
  single.userData.skinPart = true;
  for (const name of ["scooter-seat", "seat-piping"]) single.add(group.getObjectByName(name)!);
  group.add(single);
  // Twin side arms leave the tire free to rotate; a solid crossbar clipped it.
  for (const side of [-1, 1]) box(`rear-swingarm-${side}`, [0.035, 0.065, 0.5], [side * 0.12, -1.04, 0.43], metal);
  const arch = new THREE.Shape();
  arch.absarc(0, 0, 0.273, 0, Math.PI, false);
  arch.absarc(0, 0, 0.255, Math.PI, 0, true);
  arch.closePath();
  const archGeometry = new THREE.ExtrudeGeometry(arch, { depth: 0.2, steps: 1, bevelEnabled: false, curveSegments: 16 });
  archGeometry.translate(0, 0, -0.1);
  const fender = new THREE.Mesh(archGeometry, shell);
  fender.name = "rear-fender"; fender.rotation.y = Math.PI / 2; fender.position.set(0, SCOOTER_LAYOUT.axleY, SCOOTER_LAYOUT.rearAxleZ); group.add(fender);

  // A pair of side stays visibly ties the rear arch to the swingarm/axle.
  for (const side of [-1, 1]) {
    const start = new THREE.Vector3(side * 0.12, SCOOTER_LAYOUT.axleY, SCOOTER_LAYOUT.rearAxleZ);
    const end = new THREE.Vector3(side * 0.096, SCOOTER_LAYOUT.axleY + 0.205, SCOOTER_LAYOUT.rearAxleZ + 0.167);
    const stay = box(`rear-fender-stay-${side}`, [0.025, start.distanceTo(end), 0.027], [0, 0, 0], metal);
    stay.position.copy(start).add(end).multiplyScalar(0.5);
    stay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  }

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.16, 28), rubber);
  wheel.name = "rear-wheel"; wheel.rotation.z = Math.PI / 2; wheel.position.set(0, SCOOTER_LAYOUT.axleY, SCOOTER_LAYOUT.rearAxleZ); group.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.175, 16), metal);
  hub.name = "rear-hub"; hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); group.add(hub);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.29, 12), metal);
  axle.name = "rear-axle"; axle.rotation.z = Math.PI / 2; axle.position.copy(wheel.position); group.add(axle);
  for (const side of [-1, 1]) {
    box(`rear-body-trim-${side}`, [0.025, 0.07, 0.38], [side * 0.291, -0.94, 0.13], accent);
    const supportStart = new THREE.Vector3(side * 0.23, -0.75, 0.56);
    const supportEnd = new THREE.Vector3(side * 0.23, -0.56, 0.77);
    const support = box(`cargo-rack-support-${side}`, [0.04, supportStart.distanceTo(supportEnd), 0.04], [0, 0, 0], metal);
    support.position.copy(supportStart).add(supportEnd).multiplyScalar(0.5);
    support.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), supportEnd.sub(supportStart).normalize());
  }
  box("cargo-rack", [0.68, 0.06, 0.42], [0, -0.56, 0.88], metal);
  for (const part of [...group.children]) if (part.name.startsWith("cargo-rack")) single.add(part);
  const cargoShell = new THREE.MeshStandardMaterial({ color: DEFAULT_CARGO_COLOR, roughness: 0.65 });
  cargoShell.name = "scooter-cargo-shell";
  cargoShell.userData.cargoColor = true;
  const cargoLid = rubber.clone();
  cargoLid.name = "scooter-cargo-lid";
  cargoLid.userData.cargoColor = true;
  if (cargoLid instanceof THREE.MeshStandardMaterial) cargoLid.color.set(DEFAULT_CARGO_COLOR);
  const reflective = new THREE.MeshStandardMaterial({ color: "#edf4dc", roughness: 0.5 });
  box("delivery-box", [0.66, 0.52, 0.47], [0, -0.27, 0.93], cargoShell);
  box("delivery-box-lid", [0.69, 0.06, 0.5], [0, 0.01, 0.93], cargoLid);
  box("delivery-box-reflector", [0.52, 0.06, 0.018], [0, -0.44, 1.174], reflective);
  box("rear-light-bracket", [0.38, 0.15, 0.04], [0, -0.65, 0.875], rubber);
  const red = new THREE.MeshStandardMaterial({ color: "#ed403a", emissive: "#ba2117", emissiveIntensity: 0.35 });
  box("rear-tail-light", [0.34, 0.075, 0.025], [0, -0.7, 0.9], red);
  const branding = createLabelMaterial("小云闪送", "外卖配送", DEFAULT_CARGO_COLOR, getCargoLabelInk(DEFAULT_CARGO_COLOR));
  branding.name = "scooter-cargo-brand";
  branding.userData.deliveryBrand = true;
  const backLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), branding);
  backLabel.name = "delivery-brand-back"; backLabel.position.set(0, -0.23, 1.169); group.add(backLabel);
  for (const side of [-1, 1]) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.28), branding);
    label.name = `delivery-brand-side-${side}`; label.rotation.y = side * Math.PI / 2;
    label.position.set(side * 0.334, -0.23, 0.93); group.add(label);
  }
  // Keep the removable delivery kit out of rigid batching so street skins can swap it.
  const deliveryKit = new THREE.Group();
  deliveryKit.name = "scooter-delivery-kit";
  deliveryKit.userData.skinPart = true;
  for (const part of [...group.children]) if (part.name.startsWith("delivery-")) deliveryKit.add(part);
  group.add(deliveryKit);
  box("license-plate-bracket", [0.045, 0.22, 0.025], [0, -0.79, 0.9], metal);
  box("license-plate-backing", [0.30, 0.16, 0.02], [0, -0.87, 0.925], rubber);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14),
    createLabelMaterial("云·A0068", "电动自行车", "#ecf4e6", "#205d44", true));
  plate.name = "scooter-license-plate"; plate.position.set(0, -0.87, 0.94); group.add(plate);
  const fixtures = new THREE.Group();
  fixtures.name = "scooter-rear-fixtures";
  fixtures.userData.skinPart = true;
  for (const part of [...group.children]) if (/^rear-(light|tail)|^license-plate|^scooter-license-plate/.test(part.name)) fixtures.add(part);
  group.add(fixtures);
  group.traverse(object => { object.layers.set(2); if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  // Keep this small painted panel readable in the toy style; the rider's hard
  // projected shadow otherwise breaks it into patches. It still casts shadows.
  group.getObjectByName("battery-housing")!.receiveShadow = false;
  seatingModels.set(group, { single, fixtures, createDouble() {
    const kit = new THREE.Group(); kit.name = "scooter-double-seat-kit"; kit.userData.skinPart = true;
    const add = (name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
      const part = box(name, size, position, material); kit.add(part); return part;
    };
    const seat = SCOOTER_SEATING_LAYOUT.doubleSeat;
    add("double-seat-cushion", [seat.width, seat.height, seat.length], [0, -0.72, seat.z], rubber);
    add("double-seat-piping", [seat.width + 0.01, 0.025, seat.length - 0.03], [0, -0.765, seat.z], accent);
    add("double-seat-rear-support", [0.35, 0.15, 0.58], [0, -0.86, 0.72], shell);
    for (const side of [-1, 1]) {
      add(`passenger-footrest-${side}`, [0.21, 0.035, 0.29],
        [side * SCOOTER_SEATING_LAYOUT.passengerFoot.x, SCOOTER_SEATING_LAYOUT.passengerFoot.y, SCOOTER_SEATING_LAYOUT.passengerFoot.z], rubber);
      const support = add(`passenger-footrest-support-${side}`, [0.035, 0.37, 0.035], [side * 0.31, -1.04, 0.69], metal);
      support.rotation.x = -0.16;
      add(`passenger-grab-rail-${side}`, [0.035, 0.045, 0.39], [side * 0.31, -0.57, 0.94], metal);
      add(`passenger-grab-support-${side}`, [0.035, 0.16, 0.035], [side * 0.31, -0.65, 1.08], metal);
    }
    kit.traverse(object => { object.layers.set(2); if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    batchStaticModel(kit);
    return kit;
  } });
  group.userData.seating = "single";
  return group;
}


/** Small shared textures keep the lettering legible without coplanar decals. */
function createLabelMaterial(title: string, subtitle: string, background: string, ink: string, plate = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = background; context.fillRect(0, 0, 512, 256);
  context.fillStyle = ink;
  context.fillRect(12, 12, 488, 4); context.fillRect(12, 240, 488, 4);
  context.textAlign = "center"; context.textBaseline = "middle";
  context.font = 'bold 76px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(title, 256, plate ? 157 : 100);
  context.font = '40px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(subtitle, 256, plate ? 66 : 187);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
}


/** Contrast for lettering painted directly on the independently colored box. */
export function getCargoLabelInk(background: string) {
  const color = new THREE.Color(background);
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722 > 0.179 ? "#263b43" : "#fff8e6";
}

export function applyDeliveryAppearance(group: THREE.Group, delivery = { color: DEFAULT_CARGO_COLOR, title: "小云闪送", subtitle: "外卖配送" }, cargoColor?: string) {
  const kit = group.getObjectByName("scooter-delivery-kit");
  if (!kit) return;
  const color = cargoColor ?? delivery.color;
  const materials = new Set<THREE.MeshStandardMaterial>();
  kit.traverse(object => {
    if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial) materials.add(material);
    }
  });
  for (const material of materials) {
    if (material.userData.cargoColor) material.color.set(color);
    if (material.userData.deliveryBrand) {
      const key = `${delivery.title}/${delivery.subtitle}/${color}`;
      if (material.userData.brandKey === key) continue;
      const replacement = createLabelMaterial(delivery.title, delivery.subtitle, color, getCargoLabelInk(color));
      material.map?.dispose(); material.map = replacement.map; replacement.dispose();
      material.userData.brandKey = key; material.needsUpdate = true;
    }
  }
}
