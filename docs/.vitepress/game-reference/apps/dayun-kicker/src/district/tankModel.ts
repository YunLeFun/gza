import * as THREE from "three";
import type { RideState } from "./ride";
import type { VehiclePose } from "./vehicle";

/** Original procedural model. Shared primitives keep the easter egg asset-free. */
export function createTankModel() {
  const root = new THREE.Group(); root.name = "district-panzer";
  const turret = new THREE.Group(); turret.position.y = 1.55; root.add(turret);
  const box = new THREE.BoxGeometry(), cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const paint = new THREE.MeshStandardMaterial({ color: 0x566648, roughness: .74, metalness: .35 });
  const lightPaint = new THREE.MeshStandardMaterial({ color: 0x788061, roughness: .8, metalness: .25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252c29, roughness: .88, metalness: .4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x66716b, roughness: .72, metalness: .65 });
  const lamps = new THREE.MeshStandardMaterial({ color: 0xffefb9, emissive: 0xfad88e, emissiveIntensity: .5 });
  type Part = { x: number; y: number; z: number; w: number; h: number; d: number; rx?: number; rz?: number };
  const dummy = new THREE.Object3D();
  function batch(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, parts: Part[]) {
    const mesh = new THREE.InstancedMesh(geometry, material, parts.length);
    parts.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx ?? 0, 0, p.rz ?? 0); dummy.scale.set(p.w, p.h, p.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  batch(root, box, paint, [
    { x: 0, y: .93, z: 0, w: 2.35, h: .62, d: 4.5 },
    { x: 0, y: 1.28, z: .15, w: 2.1, h: .25, d: 3.85 },
    { x: 0, y: 1.1, z: -2.05, w: 2.2, h: .24, d: .65, rx: -.4 },
    ...[-1, 1].map(side => ({ x: side * 1.16, y: 1.14, z: 0, w: .48, h: .12, d: 5.2 })),
  ]);
  batch(root, box, dark, [
    ...[-1, 1].map(side => ({ x: side * 1.1, y: .63, z: 0, w: .54, h: .64, d: 4.35 })),
    ...Array.from({ length: 9 }, (_, i) => ({ x: -.75 + i * .19, y: 1.44, z: 1.52, w: .09, h: .025, d: .55 })),
    { x: 0, y: 1.52, z: -1.8, w: .6, h: .09, d: .22 },
  ]);
  const wheels: Part[] = [];
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) wheels.push({ x: side * 1.13, y: .58, z: -2.04 + i * .68, w: .4, h: .52, d: .4, rz: Math.PI / 2 });
  batch(root, cylinder, lightPaint, wheels);
  batch(root, cylinder, steel, wheels.map(p => ({ ...p, x: Math.sign(p.x) * 1.39, w: .18, h: .02, d: .18 })));
  batch(root, box, lamps, [-1, 1].map(side => ({ x: side * .92, y: 1.22, z: -2.3, w: .22, h: .16, d: .05 })));
  batch(turret, cylinder, dark, [{ x: 0, y: -.07, z: .1, w: .82, h: .16, d: .82 }]);
  batch(turret, box, paint, [{ x: 0, y: .24, z: .14, w: 1.65, h: .55, d: 1.9 }, { x: 0, y: .22, z: -.85, w: 1.3, h: .58, d: .35, rx: -.22 }]);
  batch(turret, cylinder, lightPaint, [{ x: .35, y: .6, z: .25, w: .33, h: .1, d: .33 }]);
  const gun = new THREE.Group(); gun.position.set(0, .25, -.85); turret.add(gun);
  batch(gun, cylinder, paint, [{ x: 0, y: 0, z: -1.22, w: .13, h: 2.55, d: .13, rx: Math.PI / 2 }]);
  batch(gun, box, dark, [{ x: 0, y: 0, z: -2.55, w: .35, h: .29, d: .43 }]);
  batch(turret, box, dark, [{ x: -.35, y: .58, z: -.3, w: .24, h: .15, d: .4 }]);
  const antenna = new THREE.Mesh(cylinder, dark); antenna.position.set(-.63, 2.15, .85); antenna.scale.set(.018, .65, .018); root.add(antenna);
  const tracks = new THREE.InstancedMesh(box, dark, 104); tracks.castShadow = true; root.add(tracks);
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#d6d8b9"; ctx.font = "bold 38px monospace"; ctx.textAlign = "center"; ctx.fillText("PANZER", 128, 50); ctx.font = "22px monospace"; ctx.fillText("86 · FREE RIDE", 128, 91);
  const labelTexture = new THREE.CanvasTexture(canvas); labelTexture.colorSpace = THREE.SRGBColorSpace;
  const labelMaterial = new THREE.MeshStandardMaterial({ map: labelTexture, transparent: true, roughness: 1, depthWrite: false });
  const labelGeometry = new THREE.PlaneGeometry(1.25, .62);
  for (const side of [-1, 1]) { const label = new THREE.Mesh(labelGeometry, labelMaterial); label.position.set(side * .833, .27, .2); label.rotation.y = side * Math.PI / 2; turret.add(label); }
  const rearLabel = new THREE.Mesh(labelGeometry, labelMaterial); rearLabel.position.set(0, .25, 1.097); turret.add(rearLabel);
  const shadowGeometry = new THREE.CircleGeometry(1, 24), shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x142017, transparent: true, opacity: .2, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.scale.set(2.05, 3.15, 1);
  function update(pose: VehiclePose & { pitch?: number }, altitude: number, motion: Pick<RideState, "distance" | "elapsed">, turretYaw = 0, elevation = 0, recoil = 0) {
    root.position.set(pose.x, pose.height + altitude, pose.z); root.rotation.order = "YXZ"; root.rotation.set(pose.pitch ?? 0, pose.yaw, 0);
    turret.rotation.y = turretYaw; gun.rotation.x = elevation; gun.position.z = -.85 + recoil * .18;
    const phase = motion.distance * .32 + pose.yaw * .75;
    for (let i = 0; i < 104; i++) {
      const side = i < 52 ? -1 : 1, t = ((i % 52) / 52 + phase * side / 52) % 1;
      const a = t * Math.PI * 2;
      dummy.position.set(side * 1.13, .59 + Math.sin(a) * .48, Math.cos(a) * 2.3);
      dummy.rotation.set(Math.atan2(-.48 * Math.cos(a), 2.3 * Math.sin(a)), 0, 0); dummy.scale.set(.54, .11, .27); dummy.updateMatrix(); tracks.setMatrixAt(i, dummy.matrix);
    }
    tracks.instanceMatrix.needsUpdate = true;
    shadow.position.set(pose.x, pose.height + .025, pose.z); shadow.rotation.z = -pose.yaw;
    shadowMaterial.opacity = .22 * (1 - Math.min(1, altitude / 25));
  }
  return { root, shadow, update, dispose() {
    root.traverse(o => { if (o instanceof THREE.InstancedMesh) o.dispose(); });
    for (const g of [box, cylinder, labelGeometry, shadowGeometry]) g.dispose();
    for (const m of [paint, lightPaint, dark, steel, lamps, labelMaterial, shadowMaterial]) m.dispose();
    labelTexture.dispose(); root.removeFromParent(); shadow.removeFromParent();
  } };
}
