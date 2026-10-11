import type { TrackSample } from "./track";
import { CIRCUIT_LENGTH as LENGTH, TRACK_SAMPLE_STEP as STEP } from "../config/gameplay/track";

// North is -Z. Street layout observed on AMap, compressed into a playable loop:
// Yuejiang West Road → Canton Tower Road → Yizhou Road → Yiyuan Road.
const KNOTS = [
  [-135, -185], [-30, -185], [90, -183], [165, -178], [194, -125],
  [174, -40], [148, 95], [130, 170], [42, 188], [-52, 162],
  [-135, 120], [-168, 48], [-168, -78], [-164, -156],
] as const;
let layout: ReturnType<typeof buildLayout> | undefined;

/** Periodic cubic B-spline: continuous position, tangent and curvature at corners. */
function buildLayout() {
  const dense: { x: number; z: number; distance: number }[] = [];
  let perimeter = 0;
  for (let i = 0; i <= KNOTS.length * 128; i++) {
    const segment = Math.floor(i / 128), t = i % 128 / 128;
    const weights = [(1 - t) ** 3, 3 * t ** 3 - 6 * t ** 2 + 4,
      -3 * t ** 3 + 3 * t ** 2 + 3 * t + 1, t ** 3];
    let x = 0, z = 0;
    weights.forEach((weight, j) => {
      const knot = KNOTS[(segment + j - 1 + KNOTS.length) % KNOTS.length]!;
      x += knot[0] * weight / 6; z += knot[1] * weight / 6;
    });
    const previous = dense.at(-1);
    if (previous) perimeter += Math.hypot(x - previous.x, z - previous.z);
    dense.push({ x, z, distance: perimeter });
  }
  const scale = LENGTH / perimeter, origin = dense[0]!;
  const place = (x: number, z: number) => ({ x: (x - origin.x) * scale, z: (z - origin.z) * scale });
  let cursor = 0;
  const points: TrackSample[] = Array.from({ length: LENGTH / STEP }, (_, index) => {
    const distance = index * STEP / scale;
    while (dense[cursor + 1]!.distance < distance) cursor++;
    const a = dense[cursor]!, b = dense[cursor + 1]!;
    const t = (distance - a.distance) / (b.distance - a.distance);
    return { ...place(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t), heading: 0, curvature: 0, bend: -1 };
  });
  const count = points.length;
  points.forEach((point, index) => {
    const a = points[(index + count - 1) % count]!, b = points[(index + 1) % count]!;
    let heading = Math.atan2(b.x - a.x, a.z - b.z);
    if (index) {
      const previous = points[index - 1]!.heading;
      heading += Math.round((previous - heading) / (2 * Math.PI)) * 2 * Math.PI;
    }
    point.heading = heading;
  });
  points.forEach((point, index) => {
    const before = index ? points[index - 1]!.heading : points[count - 1]!.heading - Math.PI * 2;
    const after = index < count - 1 ? points[index + 1]!.heading : points[0]!.heading + Math.PI * 2;
    point.curvature = (after - before) / (STEP * 2);
    point.bend = Math.abs(point.curvature) > 0.0015 ? Math.floor(index / 100) : -1;
  });
  points.push({ ...points[0]!, heading: points[0]!.heading + Math.PI * 2 });
  return { points, place, riverZ: place(0, -220).z, tower: place(80, -160) };
}

export function getCantonLayout() { return layout ??= buildLayout(); }
