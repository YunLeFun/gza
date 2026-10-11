import { distance, type DistrictMap, type Point } from "./map";

export const NINEBOT_BUILDING_ID = 1299934778;
export const NINEBOT_NAME = "7号电动车 · 新港中路店";
/** AMap B0JDOUFOL3: 432 compound, block 4 shop 101, by 幸福社区 west gate.
 * Baidu identifies the same phone/shop at 赤岗路2号. Placement is an art
 * alignment on the mapped west-side shop row, not a surveyed entrance. */
export function ninebotSite(map: DistrictMap) {
  const building = map.buildings.find(b => b.id === NINEBOT_BUILDING_ID);
  if (!building || !map.roads.some(r => r.name === "赤岗路")) return null;
  const edgeIndex = 2, a = building.outline[edgeIndex]!, b = building.outline[(edgeIndex + 1) % building.outline.length]!;
  const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
  const tangent = { x: (b[0]! - a[0]!) / length, z: (b[1]! - a[1]!) / length };
  const normal = { x: -tangent.z, z: tangent.x }, yaw = Math.atan2(normal.x, normal.z);
  const front = { x: (a[0]! + b[0]!) / 2, z: (a[1]! + b[1]!) / 2 }, width = 7.8, depth = 8.4, doorAlong = 1.5, doorWidth = 2.5;
  const point = (along: number, outward: number): Point => ({ x: front.x + tangent.x * along + normal.x * outward, z: front.z + tangent.z * along + normal.z * outward });
  const local = (p: Point) => ({ along: (p.x - front.x) * tangent.x + (p.z - front.z) * tangent.z, outward: (p.x - front.x) * normal.x + (p.z - front.z) * normal.z });
  const door = point(doorAlong, 0), approach = point(doorAlong, 3), entry = point(doorAlong, -1.5), exit = point(doorAlong, 1.5);
  const inside = (p: Point) => { const q = local(p); return Math.abs(q.along) < width / 2 && q.outward < -.2 && q.outward > -depth && Math.abs(p.height ?? 0) < .65; };
  const nearby = (p: Point) => distance(p, door) < 6 && Math.abs(p.height ?? 0) < .65;
  // Wall panels match the visible glass; only the open doorway is traversable.
  const glassSpans = [[-width / 2, doorAlong - doorWidth / 2], [doorAlong + doorWidth / 2, width / 2]] as const;
  const blockers = [
    { along: 0, outward: -depth, width, depth: .15 },
    { along: -width / 2, outward: -depth / 2, width: .15, depth },
    { along: width / 2, outward: -depth / 2, width: .15, depth },
    ...glassSpans.filter(([a, b]) => b > a).map(([a, b]) => ({ along: (a + b) / 2, outward: 0, width: b - a, depth: .1 })),
  ].map(b => ({ ...point(b.along, b.outward), width: b.width, depth: b.depth, height: 3.4, yaw }));
  return { building, edgeIndex, length, yaw, normal, tangent, front, width, depth, doorAlong, doorWidth, point, local, door, approach, entry, exit, inside, nearby, glassSpans, blockers };
}
export type NinebotSite = NonNullable<ReturnType<typeof ninebotSite>>;
