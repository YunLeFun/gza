import { SCOOTER_LIGHT_LEVEL, HEADLAMP_INTENSITY } from "../config/render/environment";

import * as THREE from "three";
import type { EnvironmentTheme } from "../game/types";
import { SCOOTER_LAYOUT } from "../config/render/rider";

export function getScooterLightLevel(theme: EnvironmentTheme) {
  return SCOOTER_LIGHT_LEVEL[theme];
}

/** One soft, unshadowed light; no additional shadow map or bloom pass. */
export function createScooterHeadlamp() {
  const light = new THREE.SpotLight("#fff1d6", 0, 44, 0.55, 0.85, 2);
  light.name = "scooter-headlamp";
  return light;
}

export function aimScooterHeadlamp(light: THREE.SpotLight, x: number, z: number, steering: number) {
  const forwardX = -Math.sin(steering), forwardZ = -Math.cos(steering);
  const reach = SCOOTER_LAYOUT.gripZ - SCOOTER_LAYOUT.headlightZ;
  light.position.set(x + forwardX * reach, SCOOTER_LAYOUT.rideHeight + SCOOTER_LAYOUT.headlightY,
    z + SCOOTER_LAYOUT.gripZ + forwardZ * reach);
  light.target.position.set(light.position.x + forwardX * 9, 0, light.position.z + forwardZ * 9);
}

/** Lens glow, rear running/brake light and the showroom beam share one state. */
export function createScooterLighting(
  head: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  tail: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
) {
  const headlamp = createScooterHeadlamp();
  headlamp.name = "scooter-preview-headlamp";
  // The game's road beam lives in world space; this one follows the full-size
  // exterior for inspection without lighting either of the gameplay passes.
  headlamp.layers.set(2);
  headlamp.position.copy(head.position).add(new THREE.Vector3(0, 0, -0.02));
  headlamp.target.position.copy(headlamp.position).add(new THREE.Vector3(0,
    -(SCOOTER_LAYOUT.rideHeight + SCOOTER_LAYOUT.headlightY), -9));
  head.parent!.add(headlamp, headlamp.target);
  head.material.color.set("#fff4d9");
  head.material.emissive.set("#ffdf9c");

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.7)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const halo = (lamp: THREE.Mesh, name: string, color: string, front: boolean) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.2),
      new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false }));
    mesh.name = name;
    mesh.position.set(0, 0, front ? -0.026 : 0.026);
    mesh.rotation.y = front ? Math.PI : 0;
    mesh.layers.set(2);
    lamp.add(mesh);
    return mesh;
  };
  const frontGlow = halo(head, "headlight-glow", "#ffe8b4", true);
  const rearGlow = halo(tail, "brake-light-glow", "#ff3325", false);
  const update = (level: number, braking: number) => {
    const brightness = THREE.MathUtils.clamp(level, 0, 1);
    const pressure = THREE.MathUtils.clamp(braking, 0, 1);
    head.material.emissiveIntensity = 0.06 + brightness * 2.8;
    tail.material.emissiveIntensity = 0.08 + brightness * 0.65 + pressure * 3.5;
    headlamp.intensity = brightness * HEADLAMP_INTENSITY;
    headlamp.visible = brightness > 0;
    frontGlow.visible = brightness > 0;
    frontGlow.material.opacity = brightness * 0.6;
    rearGlow.visible = brightness > 0 || pressure > 0.01;
    rearGlow.material.opacity = brightness * 0.12 + pressure * 0.65;
  };
  update(0, 0);
  return { headlamp, update };
}
