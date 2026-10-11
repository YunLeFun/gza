import type { DistrictMap, Point } from "./map";
import { roadWidth } from "./roadWidth";

export const CANTON_TOWER = { buildingId: 584204634, height: 600, bodyHeight: 454, waistHeight: 280,
  columns: 24, rings: 46, rotation: -Math.PI / 4, lobbyHeight: 0 } as const;
export const TOWER_FLOORS = [
  { id: 0, height: 0, label: "1F · 入塔大厅", detail: "步行返回广场" },
  { id: -1, height: -5.1, label: "B1 · 下沉广场", detail: "商铺游廊 · 地铁连接口" },
  { id: -2, height: -10.2, label: "B2 · 地下商业", detail: "地下连通层" },
  { id: 100, height: 100, label: "空中影院", detail: "候场区 · 影厅" },
  { id: 433, height: 433, label: "433 m · 星空观光", detail: "室内环形观景层" },
  { id: 450, height: 450, label: "450 m · 塔顶平台", detail: "摩天轮旁露天观景" },
  { id: 488, height: 488, label: "488 m · 摄影平台", detail: "天线桅杆旁俯瞰珠江" },
] as const;
export type TowerFloor = typeof TOWER_FLOORS[number]["id"];

/** Published envelope dimensions in metres. Public references are recorded in
 * docs/canton-tower-visit.md; plaza/interior details are photo-based reconstruction.
 */
export function towerSection(height: number) {
  const y = Math.max(0, Math.min(CANTON_TOWER.bodyHeight, height)), span = y < 280 ? 280 : 174;
  const radius = (waist: number, base: number, top: number) => {
    const end = y < 280 ? base : top;
    return Math.sqrt(waist * waist + (end * end - waist * waist) * ((y - 280) / span) ** 2);
  };
  const t = y / CANTON_TOWER.bodyHeight, twist = Math.PI * 0.75;
  const angle = Math.atan2(27.5 * Math.sin(twist) * t, 40 * (1 - t) + 27.5 * Math.cos(twist) * t);
  return { major: radius(13.75, 40, 27.5), minor: radius(10.325, 25, 20.5), angle };
}
export function towerFramePoint(height: number, spoke: number, inset = 1): { x: number; y: number; z: number } {
  const { major, minor, angle } = towerSection(height), theta = spoke / 24 * Math.PI * 2;
  const x = major * Math.cos(theta) * inset, z = minor * Math.sin(theta) * inset;
  return { x: x * Math.cos(angle) - z * Math.sin(angle), y: height, z: x * Math.sin(angle) + z * Math.cos(angle) };
}
export function towerLocalToWorld(center: Point, point: Point): Point {
  const c = Math.cos(CANTON_TOWER.rotation), s = Math.sin(CANTON_TOWER.rotation);
  return { x: center.x + point.x * c + point.z * s, z: center.z - point.x * s + point.z * c };
}
export function ellipseOutline(center: Point, rx: number, rz: number, count = 64) {
  return Array.from({ length: count }, (_, i) => [center.x + Math.cos(i / count * Math.PI * 2) * rx,
    center.z + Math.sin(i / count * Math.PI * 2) * rz]);
}
export function cantonTowerSite(map: DistrictMap) {
  const footprint = map.buildings.find(b => b.id === CANTON_TOWER.buildingId);
  if (!footprint) return null;
  const center = { x: footprint.outline.reduce((s, p) => s + p[0]!, 0) / footprint.outline.length,
    z: footprint.outline.reduce((s, p) => s + p[1]!, 0) / footprint.outline.length };
  const northCourt = { x: center.x + 4, z: center.z + 113, rx: 32, rz: 40 };
  const southCourt = { x: center.x - 2, z: center.z + 219, rx: 28, rz: 31 };
  return { center, entrance: { x: center.x, z: center.z + 36 }, parking: { x: center.x, z: center.z + 47 },
    outline: [[center.x - 112, center.z + 37], [center.x + 111, center.z + 37],
      [center.x + 81, center.z + 265], [center.x - 118, center.z + 265]],
    courts: [northCourt, southCourt], pool: { x: center.x, z: center.z + 169, rx: 25, rz: 16 },
    openings: [northCourt, southCourt].map(c => ellipseOutline(c, c.rx, c.rz)) };
}
export type CantonTowerSite = NonNullable<ReturnType<typeof cantonTowerSite>>;

/** Photo-authored plaza furniture shares one metre-space layout with collision. */
export function cantonTowerPlazaFurniture(site: CantonTowerSite, map?: Pick<DistrictMap, "roads" | "nodes">) {
  const furniture: { kind: "bench" | "wall"; x: number; z: number; width: number; depth: number; height: number; yaw: number; side: number }[] = [];
  for (const side of [-1, 1]) {
    for (let band = 0; band < 4; band++) furniture.push({ kind: "bench",
      x: site.center.x + side * (59 + (band % 2) * 4), z: site.center.z + 62 + band * 47,
      width: 5.6, depth: .7, height: .555, yaw: 0, side });
    for (let i = 0; i < 26; i++) furniture.push({ kind: "wall",
      x: site.center.x + side * 48 + Math.sin(i / 25 * Math.PI * 2) * 4, z: site.center.z + 57 + i * 7.6,
      width: .36, depth: 7.62, height: .6, yaw: Math.cos(i / 25 * Math.PI * 2) * .1, side });
  }
  if (!map) return furniture;
  const nodes = new Map(map.nodes.map(([id, x, z]) => [id!, { x: x!, z: z! }]));
  const corridors = map.roads.filter(r => r.rideable && !r.layer && !r.heights && !r.bridge && !r.tunnel).flatMap(road =>
    road.nodes.slice(1).flatMap((id, i) => {
      const a = nodes.get(road.nodes[i]!)!, b = nodes.get(id)!;
      if (!a || !b || Math.min(a.x, b.x) > site.center.x + 120 || Math.max(a.x, b.x) < site.center.x - 125
        || Math.min(a.z, b.z) > site.center.z + 275 || Math.max(a.z, b.z) < site.center.z + 35) return [];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      return length > .01 ? [{ a, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length, length, width: roadWidth(road) }] : [];
    }));
  // The approximate ribbons must leave the mapped public paths open. Clip the
  // wall itself as well as its collider, including the rider's capsule margin.
  return furniture.flatMap(solid => {
    if (solid.kind === "bench") return [solid];
    const dx = Math.sin(solid.yaw) * solid.depth, dz = Math.cos(solid.yaw) * solid.depth;
    const a = { x: solid.x - dx / 2, z: solid.z - dz / 2 }, cuts: [number, number][] = [];
    for (const road of corridors) {
      const sx = a.x - road.a.x, sz = a.z - road.a.z;
      const start = [sx * road.dx + sz * road.dz, sz * road.dx - sx * road.dz];
      const delta = [dx * road.dx + dz * road.dz, dz * road.dx - dx * road.dz];
      const margin = road.width / 2 + solid.width / 2 + .4;
      let lo = 0, hi = 1;
      for (let axis = 0; axis < 2; axis++) {
        const low = -margin, high = axis ? margin : road.length + margin;
        if (Math.abs(delta[axis]!) < 1e-8) {
          if (start[axis]! < low || start[axis]! > high) { hi = -1; break; }
        } else {
          const t = (low - start[axis]!) / delta[axis]!, u = (high - start[axis]!) / delta[axis]!;
          lo = Math.max(lo, Math.min(t, u)); hi = Math.min(hi, Math.max(t, u));
        }
      }
      if (lo < hi) cuts.push([lo, hi]);
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const pieces: typeof furniture = []; let start = 0;
    const add = (end: number) => {
      if ((end - start) * solid.depth < .4) return;
      pieces.push({ ...solid, x: a.x + dx * (start + end) / 2, z: a.z + dz * (start + end) / 2, depth: (end - start) * solid.depth });
    };
    for (const [left, right] of cuts) { if (left > start) add(left); start = Math.max(start, right); }
    if (start < 1) add(1);
    return pieces;
  });
}
