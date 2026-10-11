import * as THREE from "three";
import type { ScooterSkinPalette } from "../game/skins";
import type { createSkinAccessoryModel } from "./skinAccessoryModel";

/** Default rides need only the base model; outfit details load once on first equip. */
export function createSkinAccessories(root: THREE.Group, rider: THREE.Group, steering: THREE.Group) {
  const helmet = rider.getObjectByName("rider-helmet")!;
  const cargo = root.getObjectByName("scooter-delivery-kit")!;
  const riderMaterials = new Set<THREE.MeshStandardMaterial>();
  rider.traverse(object => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial
      && (object.material.userData.riderTorso || object.material.userData.riderHelmet || object.material.userData.riderTrim)) riderMaterials.add(object.material);
  });
  let model: ReturnType<typeof createSkinAccessoryModel> | undefined;
  let pending: Promise<void> | undefined;
  let selected: ScooterSkinPalette;
  let cargoVisible = true;
  return {
    get animated() { return model?.animated ?? false; },
    get ready() { return pending ?? Promise.resolve(); },
    setCargoVisibility(visible: boolean) {
      cargoVisible = visible;
      cargo.visible = visible && selected?.theme !== "guihuo";
      model?.setCargoVisibility(visible);
    },
    setHelmetVisibility(visible: boolean) { helmet.visible = visible; model?.setHelmetVisibility(visible); },
    apply(palette: ScooterSkinPalette) {
      selected = palette;
      helmet.visible = palette.theme !== "guihuo";
      cargo.visible = cargoVisible && palette.theme !== "guihuo";
      for (const material of riderMaterials) {
        const color = material.userData.riderTrim ? palette.rider.trim ?? palette.accent
          : material.userData.riderTorso ? palette.rider.torso : palette.rider.helmet;
        material.color.set(color ?? palette.delivery?.color ?? palette.rider.jacket);
      }
      if (model) { model.apply(palette); model.setHelmetVisibility(helmet.visible); model.setCargoVisibility(cargoVisible); }
      else if (palette.theme && !pending) {
        pending = import("./skinAccessoryModel").then(({ createSkinAccessoryModel }) => {
          model = createSkinAccessoryModel(root, steering);
          // The player may switch outfits while the shared module is downloading.
          model.apply(selected);
          model.setHelmetVisibility(helmet.visible);
          model.setCargoVisibility(cargoVisible);
        });
        void pending.catch(error => { pending = undefined; console.error("Unable to load rider outfit details", error); });
      }
    },
    update(elapsed: number, musicPulse: number) { model?.update(elapsed, musicPulse); },
  };
}
