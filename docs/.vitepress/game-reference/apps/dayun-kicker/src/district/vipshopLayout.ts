import type { DistrictBuilding, DistrictMap } from "./map";
import { PAZHOU_BUILDINGS as ID } from "./pazhouPlaces";

type XY = readonly [number, number];
/** Manually traced raster references, in the F21–24 drawing's 1600 px frame.
 * F01 was overlaid using the two lift cores; its residual is about 3 m after
 * registration. This is a relative layout, NOT survey coordinates or CAD.
 * The two mapped tower centres anchor a similarity transform (no shear).
 */
export const VIPSHOP_PLAN_TRACE = {
  westAnchor: [446, 401], southAnchor: [1007, 747],
  // Ground occupied glass, excluding the outer colonnades/public forecourts.
  ground: [[ID.vipshopWest, [396, 314, 671, 537]],
    [ID.vipshopPodium, [806, 314, 1029, 537]], [ID.vipshopSouth, [902, 624, 1078, 822]]],
} as const;

const center = (b: DistrictBuilding): XY => [
  (Math.min(...b.outline.map(p => p[0]!)) + Math.max(...b.outline.map(p => p[0]!))) / 2,
  (Math.min(...b.outline.map(p => p[1]!)) + Math.max(...b.outline.map(p => p[1]!))) / 2,
];
const cache = new WeakMap<DistrictMap, ReturnType<typeof layout>>();
function layout(map: DistrictMap) {
  const west = map.buildings.find(b => b.id === ID.vipshopWest), south = map.buildings.find(b => b.id === ID.vipshopSouth);
  if (!west || !south || !map.buildings.some(b => b.id === ID.vipshopPodium)) return null;
  const a = center(west), b = center(south), p = VIPSHOP_PLAN_TRACE.westAnchor, q = VIPSHOP_PLAN_TRACE.southAnchor;
  const dx = q[0] - p[0], dz = q[1] - p[1], ux = b[0] - a[0], uz = b[1] - a[1], length2 = dx * dx + dz * dz;
  const c = (dx * ux + dz * uz) / length2, s = (dx * uz - dz * ux) / length2;
  const transform = { x: a[0], z: a[1], c, s };
  const polygon = (bounds: readonly number[]) => vipshopPlanPolygon(transform, bounds);
  return { ground: new Map(VIPSHOP_PLAN_TRACE.ground.map(([id, bounds]): [number, number[][]] => [id, polygon(bounds)])), transform };
}

export function vipshopPlanPolygon(transform: { x: number; z: number; c: number; s: number }, [l, t, r, b]: readonly number[]) {
  const point = (x: number, z: number) => {
    const dx = x - VIPSHOP_PLAN_TRACE.westAnchor[0], dz = z - VIPSHOP_PLAN_TRACE.westAnchor[1];
    return [transform.x + transform.c * dx - transform.s * dz, transform.z + transform.s * dx + transform.c * dz];
  };
  return [point(l!, t!), point(r!, t!), point(r!, b!), point(l!, b!)];
}

export function vipshopLayout(map: DistrictMap) {
  if (!cache.has(map)) cache.set(map, layout(map));
  return cache.get(map)!;
}
