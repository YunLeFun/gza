import * as THREE from "three";
import { DEFAULT_PASSENGER_RIDER_PALETTE, type ScooterSkinPalette } from "../game/skins";
import { RIDER_LAYOUT } from "../config/render/rider";
import { createRiderHelmet } from "./riderHelmet";
import { solveLimb } from "./riderRig";
import { batchStaticModel } from "./staticBatch";
import type { CoopWeapon } from "@yunlefun/dayun-kicker-coop";
import { createHouseholdWeaponModels } from "./householdWeaponModel";

/** Local seat coordinates: +Y is up, -Z is forward, origin is the cushion top. */
export const PASSENGER_LAYOUT = {
  shoulderX: 0.28,
  shoulderY: 0.5,
  shoulderZ: -0.255,
  hipX: 0.18,
  hipY: 0.07,
  footX: 0.32,
  soleY: -0.57,
  footZ: -0.12,
  eyeY: 0.82,
} as const;

/** The seated prototype keeps its feet planted; turn the vehicle for wider coverage. */
export const PASSENGER_AIM_LIMITS = {
  yaw: THREE.MathUtils.degToRad(85),
  pitch: THREE.MathUtils.degToRad(40),
} as const;

export interface PassengerPose {
  aimYaw: number;
  aimPitch: number;
  reloading: boolean;
  weapon?: CoopWeapon;
  attack?: number;
}

export interface PassengerRig {
  group: THREE.Group;
  /** The origin is the barrel tip; transformed local -Z is the actual shot direction. */
  muzzle: THREE.Object3D;
  /** Barrel position at the requested aim, independent of the reload gesture. */
  aimOrigin: THREE.Object3D;
  readonly animated: boolean;
  update: (pose: PassengerPose, dt: number) => void;
  applyPalette: (palette: ScooterSkinPalette) => void;
  dispose: () => void;
}

/** Independent occupant: contains neither vehicle, camera nor gameplay state. */
export function createPassengerRig(): PassengerRig {
  const group = new THREE.Group(); group.name = "scooter-passenger";
  const aimPivot = new THREE.Group(); aimPivot.name = "passenger-aim-pivot";
  aimPivot.position.y = 0.14; group.add(aimPivot);
  const upper = new THREE.Group(); upper.name = "passenger-upper-body";
  upper.position.y = -0.14; aimPivot.add(upper);
  const lower = new THREE.Group(); lower.name = "passenger-seated-legs"; group.add(lower);
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const defaults = DEFAULT_PASSENGER_RIDER_PALETTE;
  const torsoMaterial = material(defaults.torso ?? defaults.jacket), jacket = material(defaults.jacket), cuff = material(defaults.cuff);
  const pants = material(defaults.pants), footwear = material(defaults.footwear), skin = material("#d39169");
  const trim = material(defaults.trim ?? defaults.jacket), helmetShell = material(defaults.helmet ?? defaults.jacket), ink = material("#292720");
  const gunPaint = material("#263037"), gunMetal = material("#69777b"), sole = material("#111516");
  const hairMaterial = material("#ffc52e");
  for (const [name, paint] of Object.entries({ torso: torsoMaterial, jacket, cuff, pants, footwear, skin,
    trim, helmet: helmetShell, ink, gunPaint, gunMetal, sole, hair: hairMaterial })) paint.name = `passenger-${name}`;
  const box = (root: THREE.Group, name: string, size: [number, number, number], at: [number, number, number], paint: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), paint);
    mesh.name = name; mesh.position.set(...at); root.add(mesh); return mesh;
  };
  const anchor = (root: THREE.Group, name: string, at: THREE.Vector3) => {
    const node = new THREE.Object3D(); node.name = name; node.position.copy(at); root.add(node); return node;
  };
  const up = new THREE.Vector3(0, 1, 0);
  const orientSegment = (mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) => {
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, end.clone().sub(start).normalize());
  };

  // Keep the hidden pants top below the belt top, with the cushion contact at Y=0.
  // Two same-facing surfaces at Y=.14 would depth-fight even after batching.
  box(lower, "passenger-pelvis", [0.47, 0.13, 0.3], [0, 0.065, 0], pants);
  box(lower, "passenger-belt", [0.48, 0.035, 0.31], [0, 0.1225, 0], trim);
  box(upper, "passenger-torso", [0.5, 0.45, 0.3], [0, 0.365, 0], torsoMaterial);
  box(upper, "passenger-zipper", [0.018, 0.4, 0.012], [0, 0.365, -0.157], jacket);
  box(upper, "passenger-front-reflector", [0.4, 0.027, 0.014], [0, 0.32, -0.16], trim);
  box(upper, "passenger-back-reflector", [0.4, 0.027, 0.014], [0, 0.32, 0.158], trim);
  // Shoulder pads bridge the chest to exterior pivots without burying a sleeve in it.
  for (const side of [-1, 1]) {
    const pad = box(upper, `passenger-shoulder-pad-${side}`, [0.15, 0.155, 0.18], [side * 0.275, 0.5, -0.165], jacket);
    // Slanted front/back faces cannot coincide with the moving palms' Z faces.
    // A parallel offset alone could coincide again at another aim/reload angle.
    const positions = pad.geometry.getAttribute("position");
    for (let vertex = 0; vertex < positions.count; vertex++) {
      positions.setZ(vertex, positions.getZ(vertex) + positions.getX(vertex) * side * 0.1);
    }
    pad.geometry.computeVertexNormals();
  }
  box(upper, "passenger-neck", [0.12, 0.1, 0.12], [0, 0.625, 0], skin);
  box(upper, "passenger-head", [0.34, 0.28, 0.32], [0, 0.8, 0], skin);
  for (const side of [-1, 1]) box(upper, `passenger-eye-${side}`, [0.025, 0.028, 0.012], [side * 0.061, PASSENGER_LAYOUT.eyeY, -0.165], ink);
  anchor(upper, "passenger-eye", new THREE.Vector3(0, PASSENGER_LAYOUT.eyeY, -0.165));
  box(upper, "passenger-smile", [0.057, 0.012, 0.012], [0, 0.745, -0.165], ink);
  const helmet = createRiderHelmet(helmetShell, cuff, trim);
  helmet.name = "passenger-helmet"; helmet.position.set(0, 0.535, -0.22); helmet.userData.skinPart = true;
  upper.add(helmet);
  const hair = new THREE.Group(); hair.name = "passenger-hair"; hair.userData.skinPart = true;
  box(hair, "passenger-hair-top", [0.36, 0.06, 0.34], [0, 0.95, 0], hairMaterial);
  box(hair, "passenger-hair-fringe", [0.35, 0.06, 0.035], [0, 0.905, -0.15], hairMaterial);
  upper.add(hair);

  for (const side of [-1, 1]) {
    const hip = new THREE.Vector3(side * PASSENGER_LAYOUT.hipX, PASSENGER_LAYOUT.hipY, 0);
    const ankle = new THREE.Vector3(side * PASSENGER_LAYOUT.footX, -0.48, -0.04);
    const solved = solveLimb(hip, ankle, new THREE.Vector3(side * 0.62, -0.1, -0.6), RIDER_LAYOUT.thigh, RIDER_LAYOUT.shin);
    anchor(lower, `passenger-hip-${side}`, hip);
    anchor(lower, `passenger-knee-${side}`, solved.joint);
    anchor(lower, `passenger-ankle-${side}`, solved.end);
    const thigh = box(lower, `passenger-thigh-${side}`, [0.17, RIDER_LAYOUT.thigh, 0.17], [0, 0, 0], pants);
    const shin = box(lower, `passenger-shin-${side}`, [0.15, RIDER_LAYOUT.shin, 0.15], [0, 0, 0], pants);
    orientSegment(thigh, hip, solved.joint); orientSegment(shin, solved.joint, solved.end);
    box(lower, `passenger-shoe-${side}`, [0.2, 0.105, 0.32], [side * PASSENGER_LAYOUT.footX, -0.5025, PASSENGER_LAYOUT.footZ], footwear);
    box(lower, `passenger-sole-${side}`, [0.21, 0.015, 0.33], [side * PASSENGER_LAYOUT.footX, -0.5625, PASSENGER_LAYOUT.footZ], sole);
    anchor(lower, `passenger-foot-${side}`, new THREE.Vector3(side * PASSENGER_LAYOUT.footX, PASSENGER_LAYOUT.soleY, PASSENGER_LAYOUT.footZ));
  }

  const weapon = new THREE.Group(); weapon.name = "passenger-weapon";
  weapon.position.set(0.34, 0.56, -0.045); upper.add(weapon);
  const rifle = new THREE.Group(); rifle.name = "passenger-rifle"; rifle.userData.skinPart = true; weapon.add(rifle);
  box(rifle, "passenger-rifle-receiver", [0.075, 0.12, 0.3], [0, 0, -0.03], gunPaint);
  box(rifle, "passenger-rifle-stock", [0.09, 0.105, 0.22], [0, 0.015, 0.205], gunPaint);
  box(rifle, "passenger-rifle-barrel", [0.06, 0.055, 0.36], [0, 0.025, -0.36], gunMetal);
  box(rifle, "passenger-rifle-grip", [0.052, 0.12, 0.063], [0, -0.1, -0.075], gunPaint);
  box(rifle, "passenger-rifle-magazine", [0.047, 0.13, 0.145], [0, -0.1, -0.18], gunMetal);
  const household = createHouseholdWeaponModels(); Object.values(household).forEach(model => weapon.add(model));
  const muzzle = new THREE.Object3D(); muzzle.name = "passenger-muzzle";
  muzzle.position.set(0, 0.025, -0.565); weapon.add(muzzle);
  const aimReference = new THREE.Group(); aimReference.name = "passenger-aim-reference"; upper.add(aimReference);
  const aimOrigin = new THREE.Object3D(); aimOrigin.name = "passenger-aim-origin";
  aimOrigin.position.copy(muzzle.position); aimReference.add(aimOrigin);
  const rightGrip = new THREE.Vector3(0.01, -0.09, -0.08);
  const leftSupport = new THREE.Vector3(-0.025, 0.025, -0.22);
  const magazine = new THREE.Vector3(-0.02, -0.185, -0.29);
  anchor(weapon, "passenger-right-grip", rightGrip);
  anchor(weapon, "passenger-left-grip", leftSupport);

  // Four sleeve instances and two pairs of cuffs/hands need only three draws.
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const arms = new THREE.InstancedMesh(unit, jacket, 4); arms.name = "passenger-arms";
  const cuffs = new THREE.InstancedMesh(unit, cuff, 2); cuffs.name = "passenger-cuffs";
  const hands = new THREE.InstancedMesh(unit, skin, 2); hands.name = "passenger-hands";
  for (const mesh of [arms, cuffs, hands]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Tiny, bounded occupant geometry: avoid a stale instance bound after aiming.
    mesh.frustumCulled = false; upper.add(mesh);
  }
  const armAnchors = [-1, 1].map(side => ({
    side,
    shoulder: anchor(upper, `passenger-shoulder-${side}`, new THREE.Vector3(side * PASSENGER_LAYOUT.shoulderX, PASSENGER_LAYOUT.shoulderY, PASSENGER_LAYOUT.shoulderZ)),
    elbow: anchor(upper, `passenger-elbow-${side}`, new THREE.Vector3()),
    wrist: anchor(upper, `passenger-wrist-${side}`, new THREE.Vector3()),
  }));
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion(), axis = new THREE.Vector3(), wrist = new THREE.Vector3();
  const instance = (mesh: THREE.InstancedMesh, index: number, at: THREE.Vector3, rotation: THREE.Quaternion, x: number, y: number, z: number) => {
    scale.set(x, y, z); matrix.compose(at, rotation, scale); mesh.setMatrixAt(index, matrix);
  };
  const segmentInstance = (index: number, start: THREE.Vector3, end: THREE.Vector3, width: number, length: number) => {
    position.copy(start).add(end).multiplyScalar(0.5);
    axis.copy(end).sub(start).normalize(); quaternion.setFromUnitVectors(up, axis);
    instance(arms, index, position, quaternion, width, length, width);
  };
  let reloadBlend = 0, reloadElapsed = 0, disposed = false;

  function update(pose: PassengerPose, dt: number) {
    if (disposed) return;
    const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
    const aimYaw = Number.isFinite(pose.aimYaw) ? THREE.MathUtils.clamp(pose.aimYaw, -PASSENGER_AIM_LIMITS.yaw, PASSENGER_AIM_LIMITS.yaw) : 0;
    const aimPitch = Number.isFinite(pose.aimPitch) ? THREE.MathUtils.clamp(pose.aimPitch, -PASSENGER_AIM_LIMITS.pitch, PASSENGER_AIM_LIMITS.pitch) : 0;
    const selected = pose.weapon ?? "smg";
    rifle.visible = selected === "smg" || selected === "shotgun";
    for (const [type, model] of Object.entries(household)) model.visible = type === selected;
    reloadBlend = THREE.MathUtils.damp(reloadBlend, pose.reloading ? 1 : 0, 10, step);
    if (pose.reloading) reloadElapsed += step;
    else if (reloadBlend < 0.001) { reloadElapsed = 0; reloadBlend = 0; }
    // Lean around the waist when looking past the driver; the pelvis and feet stay seated.
    const turn = Math.min(1, Math.abs(aimYaw) / 0.7);
    const lean = turn * 0.36;
    aimPivot.position.z = turn * 0.13;
    aimPivot.rotation.set(lean, aimYaw, 0, "YXZ");
    weapon.position.z = -0.045 - lean * 0.35;
    weapon.rotation.set(aimPitch * (1 - reloadBlend) - reloadBlend * 0.35 - lean, 0, -reloadBlend * 0.12);
    if (selected === "feather-duster") weapon.rotation.y = Math.sin(THREE.MathUtils.clamp(pose.attack ?? 0, 0, 1) * Math.PI) * 0.8;
    aimReference.position.copy(weapon.position);
    aimReference.rotation.set(aimPitch - lean, 0, 0);
    weapon.updateMatrix();
    for (let i = 0; i < armAnchors.length; i++) {
      const arm = armAnchors[i]!;
      if (arm.side > 0) wrist.copy(rightGrip);
      else {
        wrist.copy(leftSupport).lerp(magazine, reloadBlend);
        wrist.y += Math.sin(reloadElapsed * 9) * 0.025 * reloadBlend;
      }
      wrist.applyMatrix4(weapon.matrix);
      // Separate the elbow bend planes so the support sleeve never crosses the chest.
      const pole = arm.shoulder.position.clone().add(arm.side < 0
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0.2, -0.4, 0));
      const solved = solveLimb(arm.shoulder.position, wrist, pole, RIDER_LAYOUT.upperArm, RIDER_LAYOUT.forearm);
      arm.elbow.position.copy(solved.joint); arm.wrist.position.copy(solved.end);
      segmentInstance(i * 2, arm.shoulder.position, solved.joint, 0.15, RIDER_LAYOUT.upperArm);
      segmentInstance(i * 2 + 1, solved.joint, solved.end, 0.125, RIDER_LAYOUT.forearm);
      // The cuff wraps outside the sleeve; equal widths would leave four
      // overlapping coplanar side faces that flicker when the camera moves.
      axis.copy(solved.end).sub(solved.joint).normalize();
      position.copy(solved.end).addScaledVector(axis, -0.025);
      instance(cuffs, i, position, quaternion, 0.13, 0.055, 0.13);
      instance(hands, i, solved.end, weapon.quaternion, 0.075, 0.09, 0.1);
    }
    for (const mesh of [arms, cuffs, hands]) mesh.instanceMatrix.needsUpdate = true;
  }

  // Preserve selectable helmet/hair boundaries and the independently moving weapon.
  batchStaticModel(helmet); batchStaticModel(hair); batchStaticModel(lower);
  batchStaticModel(upper, undefined, new Set([weapon])); batchStaticModel(rifle); batchStaticModel(weapon);
  hair.visible = false;
  group.traverse(object => {
    object.layers.set(2);
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  update({ aimYaw: 0, aimPitch: 0, reloading: false }, 0);

  return {
    group,
    muzzle,
    aimOrigin,
    get animated() { return !disposed && reloadBlend > 0; },
    update,
    applyPalette(palette) {
      if (disposed) return;
      torsoMaterial.color.set(palette.rider.torso ?? palette.delivery?.color ?? palette.rider.jacket);
      jacket.color.set(palette.rider.jacket); cuff.color.set(palette.rider.cuff);
      pants.color.set(palette.rider.pants); footwear.color.set(palette.rider.footwear);
      trim.color.set(palette.rider.trim ?? palette.accent);
      helmetShell.color.set(palette.rider.helmet ?? palette.delivery?.color ?? palette.rider.jacket);
      helmet.visible = palette.theme !== "guihuo"; hair.visible = !helmet.visible;
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent();
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      group.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        if (object instanceof THREE.InstancedMesh) object.dispose();
        geometries.add(object.geometry);
        for (const paint of Array.isArray(object.material) ? object.material : [object.material]) materials.add(paint);
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(paint => paint.dispose());
      group.clear();
    },
  };
}
