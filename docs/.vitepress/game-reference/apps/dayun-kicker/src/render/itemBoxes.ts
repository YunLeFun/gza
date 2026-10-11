import * as THREE from "three";
import { ITEM_KINDS, itemAtLane, itemRowDistance } from "../game/items";
import { raceDistance } from "../game/raceCourse";
import { LANES } from "../config/gameplay/track";
import { type GameState } from "../game/types";

export function createItemBoxes(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 128);
  context.strokeStyle = "#142028";
  context.lineWidth = 8;
  context.strokeRect(6, 6, 116, 116);
  context.fillStyle = "#142028";
  context.font = "bold 90px sans-serif";
  context.textAlign = "center";
  context.fillText("?", 64, 99);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  const colors = [0xf3bb43, 0x60d8c6, 0xf08455, 0xa1b2ff];
  const boxes = ITEM_KINDS.map((_, index) => {
    const material = new THREE.MeshStandardMaterial({ color: colors[index], map: texture,
      roughness: 0.45, metalness: 0.15, emissive: colors[index], emissiveIntensity: 0.22 });
    const mesh = new THREE.InstancedMesh(geometry, material, 2);
    mesh.name = `item-boxes-${ITEM_KINDS[index]}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });
  const pose = new THREE.Object3D();
  return {
    update(state: GameState) {
      const active = state.variant === "items" && (state.mode === "playing" || state.mode === "paused");
      boxes.forEach(mesh => { mesh.visible = active; mesh.count = 0; });
      if (!active) return;
      for (let row = state.items.nextRow; row < state.items.nextRow + 2; row++) {
        const distance = itemRowDistance(row);
        if (distance >= raceDistance(state.trackId)) continue;
        const z = state.player.z - (distance - state.player.distance);
        for (let lane = 0; lane < LANES.length; lane++) {
          const mesh = boxes[ITEM_KINDS.indexOf(itemAtLane(row, lane, state.trackSeed))];
          pose.position.set(LANES[lane], 1.25 + Math.sin(state.elapsed * 2.5 + lane) * 0.12, z);
          pose.rotation.set(0.12, state.elapsed * 0.7 + lane, 0.12);
          pose.updateMatrix();
          mesh.setMatrixAt(mesh.count++, pose.matrix);
        }
      }
      boxes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); });
    },
    dispose() {
      boxes.forEach(mesh => { scene.remove(mesh); mesh.dispose(); mesh.material.dispose(); });
      geometry.dispose();
      texture.dispose();
    },
  };
}
