import type { DistrictMap, Point } from "./map";

export const MCDONALDS_BUILDING_ID = 475115790;

/** Entrance art uses the mapped west wall. Door/counter dimensions are a game
 * reconstruction; the original footprint and closed storefront collision stay intact. */
export function getMcdonaldsLayout(map: DistrictMap) {
  const building = map.buildings?.find(b => b.id === MCDONALDS_BUILDING_ID);
  if (!building) return null;
  const edges = building.outline.map((a, i) => {
    const b = building.outline[(i + 1) % building.outline.length]!;
    return { i, a, b, length: Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) };
  }).filter(e => e.length > 18).sort((a, b) => (a.a[0]! + a.b[0]!) - (b.a[0]! + b.b[0]!));
  const edge = edges[0]; if (!edge) return null;
  const south = edge.a[1]! > edge.b[1]! ? edge.a : edge.b, north = south === edge.a ? edge.b : edge.a;
  const tangent = { x: (south[0]! - north[0]!) / edge.length, z: (south[1]! - north[1]!) / edge.length };
  const normal = { x: -tangent.z, z: tangent.x };
  const width = 16.8, center = { x: south[0]! - tangent.x * 11.1, z: south[1]! - tangent.z * 11.1 };
  const point = (along: number, outward = 0): Point => ({ x: center.x + tangent.x * along + normal.x * outward,
    z: center.z + tangent.z * along + normal.z * outward });
  const doorAlong = 3.7, doorWidth = 2.6, door = point(doorAlong, 0.045), pickup = point(doorAlong, 1.6);
  const apron = [point(-width / 2 - 0.4, 0.02), point(width / 2 + 0.4, 0.02),
    point(width / 2 + 0.4, 2.4), point(-width / 2 - 0.4, 2.4)].map(p => [p.x, p.z]);
  return { building, edge, width, center, tangent, normal, yaw: -Math.atan2(tangent.z, tangent.x), point,
    door, doorAlong, doorWidth, pickup, apron };
}
export type McdonaldsLayout = NonNullable<ReturnType<typeof getMcdonaldsLayout>>;
