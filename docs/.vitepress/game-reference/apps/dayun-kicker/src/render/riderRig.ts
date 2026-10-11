import * as THREE from "three";

import { createRiderHelmet } from "./riderHelmet";
import { RIDER_LAYOUT } from "../config/render/rider";
import { getScooterSkin } from "../game/skins";

export const RIDER_PROPORTIONS = RIDER_LAYOUT;
export function shoulderAnchor(side: number) {
  return new THREE.Vector3(side * RIDER_LAYOUT.shoulderX, RIDER_LAYOUT.shoulderY, RIDER_LAYOUT.shoulderZ);
}
// Attach below the pelvis rather than inside the jacket. The finite-width
// thigh otherwise cuts into the torso while folding and extending a kick.
export function hipAnchor(side: number) { return new THREE.Vector3(side * 0.34, -0.65, 0.22); }

/** Open the bend during preparation, before the lifted ankle can align the pole. */
export function riderLegPole(side: number, hip: THREE.Vector3, progress = 0, brace = 0) {
  const blend = Math.min(
    THREE.MathUtils.smoothstep(progress, 0, 0.18),
    1 - THREE.MathUtils.smoothstep(progress, 0.82, 1),
  );
  return hip.clone().add(new THREE.Vector3(
    side * THREE.MathUtils.lerp(0, 0.8, blend),
    THREE.MathUtils.lerp(-0.2, -0.4, blend) - brace * 0.055,
    THREE.MathUtils.lerp(-0.75, -0.45, blend),
  ));
}

/** Fixed-length two-bone chain, with an explicit bend pole to prevent flips. */
export function solveLimb(root: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3, upper: number, lower: number) {
  const axis = target.clone().sub(root);
  const distance = THREE.MathUtils.clamp(axis.length(), Math.abs(upper - lower) + 0.001, upper + lower - 0.001);
  if (axis.lengthSq() < 1e-10) axis.set(0, -1, 0);
  axis.normalize();
  const end = root.clone().addScaledVector(axis, distance);
  const bend = pole.clone().sub(root);
  bend.addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() < 1e-10) bend.set(1, 0, 0).addScaledVector(axis, -axis.x);
  if (bend.lengthSq() < 1e-10) bend.set(0, 0, 1);
  bend.normalize();
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const joint = root.clone().addScaledVector(axis, along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
  return { joint, end };
}

export function createRiderBody(jacket: THREE.Material, pants: THREE.Material, skin: THREE.Material, trim: THREE.Material) {
  const body = new THREE.Group();
  body.name = "toy-rider-body";
  const defaults = getScooterSkin("stock").palette.rider;
  const torsoMaterial = new THREE.MeshStandardMaterial({ color: defaults.torso ?? defaults.jacket, roughness: 0.65 });
  torsoMaterial.userData.riderTorso = true;
  const helmetShell = torsoMaterial.clone();
  helmetShell.color.set(defaults.helmet ?? defaults.jacket);
  helmetShell.userData.riderTorso = false;
  helmetShell.userData.riderHelmet = true;
  const faceInk = new THREE.MeshStandardMaterial({ color: "#292720", roughness: 0.9 });
  const reflector = new THREE.MeshStandardMaterial({ color: defaults.trim, roughness: 0.55 });
  reflector.userData.riderTrim = true;
  const box = (name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name; mesh.position.set(...position); body.add(mesh); return mesh;
  };
  const torso = box("rider-torso", [0.59, 0.5, 0.34], [0, -0.27, 0.22], torsoMaterial);
  // A subtle waist taper keeps the block silhouette readable in the riding pose.
  const positions = torso.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const taper = THREE.MathUtils.lerp(0.85, 1, (positions.getY(i) + 0.25) / 0.5);
    positions.setX(i, positions.getX(i) * taper);
  }
  torso.geometry.computeVertexNormals();
  box("jacket-zipper", [0.025, 0.43, 0.018], [0, -0.27, 0.041], jacket);
  // Layer the reflector outside the zipper instead of sharing its front/back faces.
  box("jacket-reflector", [0.49, 0.033, 0.018], [0, -0.36, 0.037], reflector);
  box("jacket-back-reflector", [0.49, 0.033, 0.018], [0, -0.36, 0.399], reflector);
  box("delivery-badge", [0.1, 0.07, 0.022], [-0.18, -0.18, 0.04], jacket);
  box("rider-pelvis", [0.51, 0.18, 0.32], [0, -0.56, 0.22], pants);
  box("rider-belt", [0.53, 0.045, 0.35], [0, -0.46, 0.22], trim);
  box("rider-head", [0.37, 0.32, 0.36], [0, 0.23, 0.22], skin);
  box("rider-neck", [0.14, 0.12, 0.14], [0, 0.035, 0.22], skin);
  const helmet = createRiderHelmet(helmetShell, jacket, reflector);
  helmet.userData.skinPart = true;
  body.add(helmet);
  // The corners meet the mouth's edges without duplicating its front/back surface.
  box("rider-smile", [0.058, 0.012, 0.008], [0, 0.157, 0.036], faceInk);
  for (const side of [-1, 1]) box(`rider-smile-corner-${side}`, [0.012, 0.019, 0.008], [side * 0.035, 0.165, 0.036], faceInk);
  for (const side of [-1, 1]) {
    box(`rider-eye-${side}`, [0.027, 0.034, 0.012], [side * 0.066, 0.257, 0.035], faceInk);
    box(`rider-brow-${side}`, [0.044, 0.009, 0.015], [side * 0.066, 0.302, 0.035], faceInk);
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.19, 0.19), jacket);
    joint.name = `rider-shoulder-${side}`; joint.position.copy(shoulderAnchor(side)); body.add(joint);
  }
  // The exterior shares the rig, but head/chest geometry would occlude the
  // dashboard from the separate first-person lens. Arms and legs stay visible.
  body.traverse(object => { object.layers.set(2); });
  return body;
}
