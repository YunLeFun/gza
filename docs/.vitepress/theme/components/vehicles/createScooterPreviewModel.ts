import * as THREE from "three";
import { getScooterSkin, isScooterSkinId, type ScooterSkinId } from "../../../game-reference/apps/dayun-kicker/src/game/skins";
import { SCOOTER_LAYOUT } from "../../../game-reference/apps/dayun-kicker/src/config/render/rider";
import { createCockpit, placeLimbSegment, type Cockpit } from "../../../game-reference/apps/dayun-kicker/src/render/cockpitModel";
import { applyCockpitSkin } from "../../../game-reference/apps/dayun-kicker/src/render/cockpitAppearance";
import { hipAnchor, riderLegPole, solveLimb, RIDER_PROPORTIONS } from "../../../game-reference/apps/dayun-kicker/src/render/riderRig";

/** Set the same planted, full-size resting pose used by the game’s rider. */
function initializeWorldPose(cockpit: Cockpit) {
  cockpit.group.position.set(0, SCOOTER_LAYOUT.rideHeight, 0);
  cockpit.group.scale.setScalar(1);
  for (const [leg, side] of [[cockpit.leftLeg, -1], [cockpit.rightLeg, 1]] as const) {
    const hip = hipAnchor(side);
    const ankle = new THREE.Vector3(side * 0.235, -0.9, -0.32);
    const pole = riderLegPole(side, hip);
    const solved = solveLimb(hip, ankle, pole, RIDER_PROPORTIONS.thigh, RIDER_PROPORTIONS.shin);
    placeLimbSegment(leg.thigh, hip, solved.joint);
    placeLimbSegment(leg.shin, solved.joint, solved.end);
    leg.knee.position.copy(solved.joint);
    leg.shoe.position.copy(solved.end);
    leg.shoe.rotation.set(0, -side * 0.04, 0);
  }
}

/** Failed outfit imports have no viewer owner to release their base rig. */
function disposeUnreturnedModel(root: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    if (object instanceof THREE.InstancedMesh) object.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
  root.removeFromParent();
}

/**
 * Build an independently owned scooter from the actual game skin and rig.
 * Outfit imports finish before returning, so the viewer can dispose every
 * visible and hidden resource without any late attachment or shared texture.
 */
export async function createScooterPreviewModel(
  skinId: ScooterSkinId = "stock",
  includeRider = false,
): Promise<THREE.Group> {
  if (!isScooterSkinId(skinId)) throw new Error(`Unknown scooter skin: ${skinId}`);
  const cockpit = createCockpit(new THREE.PerspectiveCamera());
  applyCockpitSkin(cockpit, getScooterSkin(skinId).palette);
  try {
    await cockpit.accessories.ready;
  } catch (error) {
    disposeUnreturnedModel(cockpit.group);
    throw error;
  }
  initializeWorldPose(cockpit);
  cockpit.accessories.update(0, 0);
  cockpit.lights.update(0, 0);
  if (!includeRider) {
    for (const part of [cockpit.riderBody, cockpit.leftHand.group, cockpit.rightHand.group, cockpit.leftLeg.group, cockpit.rightLeg.group]) {
      part.visible = false;
    }
  }
  // The game separates exterior geometry and first-person sleeves by camera
  // layers. The catalogue shows the complete exterior with its own lighting.
  cockpit.group.traverse(object => {
    object.layers.set(0);
    if (object.userData.firstPersonOnly) object.visible = false;
  });
  cockpit.fillLight.visible = false;
  cockpit.rimLight.visible = false;
  cockpit.group.removeFromParent();
  cockpit.group.updateWorldMatrix(true, true);
  return cockpit.group;
}
