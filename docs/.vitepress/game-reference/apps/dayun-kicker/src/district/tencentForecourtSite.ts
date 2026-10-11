import type { DistrictMap, Point } from "./map";
import { pazhouGroundLayout } from "./pazhouGround";
import { PAZHOU_BUILDINGS } from "./pazhouPlaces";
import { footprintFrame } from "./tencentArchitecture";

export interface ForecourtSolid extends Point { y: number; width: number; height: number; depth: number; yaw: number }

/** OSM anchors and clipped paving constrain this photo-proportioned landscape.
 * Dimensions and levels are appearance estimates, indexed in the reference doc.
 */
export function tencentForecourtLayout(map: DistrictMap) {
  const building = map.buildings.find(b => b.id === PAZHOU_BUILDINGS.tencentSouth);
  if (!building) return null;
  const frame = footprintFrame(building), front = frame.depth / 2;
  const c = Math.cos(frame.yaw), s = Math.sin(frame.yaw);
  const world = (x: number, z: number) => ({ x: frame.center.x + x * c + z * s, z: frame.center.z - x * s + z * c });
  const local = (p: Point) => { const x = p.x - frame.center.x, z = p.z - frame.center.z; return { x: x * c - z * s, z: x * s + z * c }; };
  const beds = pazhouGroundLayout(map).planters.filter(p => p.buildingId === building.id);
  // Keep the central escalator approach open; the side terrace has a gentle
  // south ramp and two 15 cm intermediate treads on its inner edge.
  const terrace = { x: -frame.width / 2 + 19, z: front + 12, width: 7, depth: 14, height: .45 };
  const ramp = { x: terrace.x, z: terrace.z + terrace.depth / 2 + 4, width: terrace.width, depth: 8, height: terrace.height };
  const steps = [0, 1].map(i => ({ x: terrace.x + terrace.width / 2 + .45 + i * .9, z: terrace.z,
    width: .9, depth: 8, height: .3 - i * .15 }));
  const rails = [
    { x: terrace.x - terrace.width / 2 - .08, z: terrace.z, width: .12, depth: terrace.depth, floor: terrace.height },
    { x: terrace.x, z: terrace.z - terrace.depth / 2 + .06, width: terrace.width, depth: .12, floor: terrace.height },
  ];
  const seats = beds.flatMap(bed => [-1, 1].map(side => ({ ...local(bed), x: local(bed).x + side * (bed.width / 2 + .42),
    width: .64, depth: bed.depth - 2, height: .46 })));
  const screen = { x: -frame.width / 2 + 3, z: front + 31, width: 2.4, depth: .3, height: 3.4 };
  const solid = (p: { x: number; z: number; width: number; depth: number }, height: number, y = height / 2): ForecourtSolid =>
    ({ ...world(p.x, p.z), width: p.width, depth: p.depth, height, y, yaw: frame.yaw });
  const solids = [...rails.map(p => solid(p, 1, p.floor + .5)), ...seats.map(p => solid(p, p.height)), solid(screen, screen.height)];
  const inside = (p: Point, r: { x: number; z: number; width: number; depth: number }) =>
    Math.abs(p.x - r.x) <= r.width / 2 && Math.abs(p.z - r.z) <= r.depth / 2;
  function heightAt(p: Point): number | null {
    const q = local(p);
    if (inside(q, terrace)) return terrace.height;
    if (inside(q, ramp)) return ramp.height * (ramp.z + ramp.depth / 2 - q.z) / ramp.depth;
    return steps.find(step => inside(q, step))?.height ?? null;
  }
  const eye = { ...world(0, front + 5.5), y: 1.8 };
  // The angle is repeatable for comparisons, not a claimed calibrated camera.
  const target = { ...world(-45, front + 190), y: 48 };
  return { frame, front, beds, terrace, ramp, steps, rails, seats, screen, solids, world, local, heightAt, eye, target,
    reserve(p: Point) { const q = local(p); return Math.abs(q.x) < frame.width / 2 + 3 && q.z > front && q.z < front + 40; },
  };
}
