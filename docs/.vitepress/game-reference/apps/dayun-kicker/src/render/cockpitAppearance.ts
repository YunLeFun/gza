import * as THREE from "three";
import type { ScooterSkinPalette } from "../game/skins";
import type { ScooterSeating } from "../config/render/rider";
import type { Cockpit } from "./cockpitModel";
import { applyDeliveryAppearance, setScooterBodySeating } from "./scooterBody";

/** Apply the game appearance without importing simulation or input handling. */
export function applyCockpitSkin(cockpit: Cockpit, palette: ScooterSkinPalette) {
  applyDeliveryAppearance(cockpit.group, palette.delivery, palette.cargoColor);
  cockpit.accessories.apply(palette);
  cockpit.skinMaterials.rubber.color.set(palette.rubber);
  cockpit.skinMaterials.graphite.color.set(palette.graphite);
  cockpit.skinMaterials.shell.color.set(palette.shell);
  cockpit.skinMaterials.accent.color.set(palette.accent);
  cockpit.skinMaterials.accent.emissive.set(palette.emissive);
  applyRiderMaterialColor(cockpit.skinMaterials.riderJacket, palette.rider.jacket, 0.16);
  applyRiderMaterialColor(cockpit.skinMaterials.riderCuff, palette.rider.cuff, 0.12);
  applyRiderMaterialColor(cockpit.skinMaterials.riderPants, palette.rider.pants, 0.1);
  applyRiderMaterialColor(cockpit.skinMaterials.riderFootwear, palette.rider.footwear, 0.06);
  cockpit.skinMaterials.riderTrim.color.set(palette.rider.trim ?? palette.accent);
  cockpit.skinMaterials.riderTrim.emissive.set(palette.rider.trimEmissive ?? palette.emissive);
}

/** Appearance changes respect the selected seat kit, including async outfits. */
export function setCockpitSeating(cockpit: Cockpit, seating: ScooterSeating) {
  setScooterBodySeating(cockpit.group.getObjectByName("scooter-exterior") as THREE.Group, seating);
  cockpit.accessories.setCargoVisibility(seating === "single");
}

function applyRiderMaterialColor(
  material: THREE.MeshStandardMaterial,
  color: THREE.ColorRepresentation,
  emissiveScale: number,
) {
  material.color.set(color);
  material.emissive.set(color).multiplyScalar(emissiveScale);
}
