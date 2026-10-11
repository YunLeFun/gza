import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SCOOTER_LAYOUT } from "../config/render/rider";

const UP = new THREE.Vector3(0, 0, 1);
const CABLE_SEGMENTS = 16;
const CABLE_SIDES = 8;
const CABLE_RADIUS = 0.006;

/** Clamped lever housings and flexible hoses share actual attachment points. */
export function createScooterBrakes(
  group: THREE.Group, handlebar: THREE.Group, steering: THREE.Group,
  metal: THREE.Material, housing: THREE.Material, rubber: THREE.Material,
) {
  const brakes = ([-1, 1] as const).map(side => {
    const name = side < 0 ? "left" : "right";
    const x = side * (SCOOTER_LAYOUT.gripX - SCOOTER_LAYOUT.gripLength / 2 - 0.035);
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 8, 16), housing);
    clamp.name = `${name}-brake-clamp`;
    clamp.rotation.y = Math.PI / 2;
    clamp.position.set(x, SCOOTER_LAYOUT.gripY, SCOOTER_LAYOUT.gripZ);
    handlebar.add(clamp);

    const mount = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.05, 0.12, 2, 0.012), housing);
    mount.name = `${name}-brake-mount`;
    mount.position.set(x, SCOOTER_LAYOUT.gripY - 0.023, SCOOTER_LAYOUT.gripZ - 0.047);
    handlebar.add(mount);
    const pivot = new THREE.Group();
    pivot.name = `${name}-brake-pivot`;
    pivot.position.set(x, SCOOTER_LAYOUT.gripY - 0.045, SCOOTER_LAYOUT.gripZ - 0.095);
    handlebar.add(pivot);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.036, 12), metal);
    pin.name = `${name}-brake-pin`;
    pivot.add(pin);
    const leverCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(),
      new THREE.Vector3(side * 0.1, -0.008, -0.04), new THREE.Vector3(side * 0.22, -0.015, -0.068));
    const lever = new THREE.Mesh(new THREE.TubeGeometry(leverCurve, 12, 0.01, 8, false), metal);
    lever.name = `${name}-brake-lever`;
    pivot.add(lever);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 6), metal);
    tip.name = `${name}-brake-tip`;
    tip.position.copy(leverCurve.v2);
    pivot.add(tip);

    const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.036, 10), metal);
    outlet.name = `${name}-brake-outlet`;
    outlet.position.set(0, -0.035, -0.012);
    mount.add(outlet);
    const start = mount.position.clone().add(outlet.position).add(new THREE.Vector3(0, -0.018, 0));
    const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), rubber);
    inlet.name = `${name}-brake-inlet`;
    inlet.rotation.x = Math.PI / 2;
    inlet.position.set(side * 0.125, -0.7, -0.681).sub(steering.position);
    steering.add(inlet);
    const end = inlet.position.clone().add(new THREE.Vector3(0, 0, 0.009));
    const curve = new THREE.CubicBezierCurve3(start.clone(), start.clone(), end.clone(), end.clone());
    // Filled before rendering; reuse its vertex buffers for every subsequent pose.
    curve.v1.add(new THREE.Vector3(0, -0.12, 0.02));
    curve.v2.add(new THREE.Vector3(side * 0.07, 0.14, 0.09));
    const geometry = new THREE.TubeGeometry(curve, CABLE_SEGMENTS, CABLE_RADIUS, CABLE_SIDES, false);
    (geometry.getAttribute("position") as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    (geometry.getAttribute("normal") as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const cable = new THREE.Mesh(geometry, rubber);
    cable.name = `${name}-brake-cable`;
    group.add(cable);
    return { side, pivot, lever, tip, mount, outlet, inlet, start, end, curve, cable };
  });
  const start = new THREE.Vector3(), end = new THREE.Vector3();
  const center = new THREE.Vector3(), tangent = new THREE.Vector3();
  const normal = new THREE.Vector3(), binormal = new THREE.Vector3(), radial = new THREE.Vector3();
  let initialized = false;
  let pressure = 0;

  const update = (braking: boolean, dt: number) => {
    pressure = THREE.MathUtils.damp(pressure, braking ? 1 : 0, 18, Math.max(0, dt));
    for (const brake of brakes) {
      brake.pivot.rotation.y = -brake.side * pressure * 0.26;
      start.copy(brake.start).applyQuaternion(handlebar.quaternion).add(handlebar.position);
      end.copy(brake.end).applyQuaternion(steering.quaternion).add(steering.position);
      const curve = brake.curve;
      if (initialized && start.distanceToSquared(curve.v0) + end.distanceToSquared(curve.v3) < 1e-12) continue;
      curve.v0.copy(start);
      curve.v1.copy(start).add(new THREE.Vector3(brake.side * 0.015, -0.13, 0.025));
      curve.v2.copy(end).add(new THREE.Vector3(brake.side * 0.07, 0.15, 0.1));
      curve.v3.copy(end);
      const geometry = brake.cable.geometry;
      const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
      for (let i = 0; i <= CABLE_SEGMENTS; i++) {
        curve.getPoint(i / CABLE_SEGMENTS, center);
        curve.getTangent(i / CABLE_SEGMENTS, tangent);
        normal.crossVectors(tangent, UP).normalize();
        binormal.crossVectors(tangent, normal).normalize();
        for (let j = 0; j <= CABLE_SIDES; j++) {
          const angle = j / CABLE_SIDES * Math.PI * 2;
          radial.copy(normal).multiplyScalar(-Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));
          const index = i * (CABLE_SIDES + 1) + j;
          normals.setXYZ(index, radial.x, radial.y, radial.z);
          positions.setXYZ(index, center.x + radial.x * CABLE_RADIUS,
            center.y + radial.y * CABLE_RADIUS, center.z + radial.z * CABLE_RADIUS);
        }
      }
      positions.needsUpdate = true;
      normals.needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    initialized = true;
    return pressure;
  };
  update(false, 0);
  return { brakes, update };
}
