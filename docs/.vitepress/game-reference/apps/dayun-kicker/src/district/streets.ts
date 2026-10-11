import { inDetailedDistrict } from "./expansionDetail";
import { createWaterTest, inPolygon, inWater, projectCoordinate, type DistrictMap, type Point, type RoadEdge, type RoadNetwork } from "./map";
import { districtBuildingOutlines, districtParks, getLiyuanLayout, LIYUAN_BUILDING_ID } from "./places";
import { segmentDistance } from "./segmentDistance";
import { getTitSiteLayout, getTitWestEntranceLayout } from "./titSite";
import { cantonTowerSite } from "./cantonTowerSite";
import { titWestStreetFurniture } from "./titWestStreetLayout";
import { liyingFurniture } from "./liyingSite";
import { riverAccesses } from "./waterTravel";
import { getMcdonaldsLayout } from "./mcdonaldsSite";
import { chigangJunctionLayout } from "./chigangSite";
import { tencentJunctionLayout } from "./tencentJunctionSite";
import { tencentForecourtLayout } from "./tencentForecourtSite";
import type { TreeKind } from "../render/lowPolyTrees";
import { createBusStops, busStopReservations } from "./busStops";

export interface StreetSite extends Point { yaw: number; kind: "tree" | "lamp" | "bench"; radius: number; campus: boolean; garden?: boolean; treeKind?: TreeKind; treeScale?: number; lampStyle?: "swept" }
export interface StreetCurb extends Point { yaw: number; length: number }
export interface StreetLayout { sites: StreetSite[]; curbs: StreetCurb[] }
/** Build-only provenance; the runtime entities and their stable order stay unchanged. */
export interface StreetLayoutReferences {
  site(site: StreetSite, edge: RoadEdge, along: number, offset: number): void;
  curb(curb: StreetCurb, edge: RoadEdge, along: number, offset: number): void;
}

/** Shared by placement and lossless restoration of build-time road references. */
export function streetPointAt(network: RoadNetwork, edge: RoadEdge, along: number, offset: number): Point {
  const a = network.nodes.get(edge.a)!, b = network.nodes.get(edge.b)!;
  return { x: a.x + (b.x - a.x) * along / edge.length + (b.z - a.z) / edge.length * offset,
    z: a.z + (b.z - a.z) * along / edge.length - (b.x - a.x) / edge.length * offset };
}
export function streetEdgeYaw(network: RoadNetwork, edge: RoadEdge): number {
  const a = network.nodes.get(edge.a)!, b = network.nodes.get(edge.b)!;
  return -Math.atan2(b.z - a.z, b.x - a.x);
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}

function prepareSegment(a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  return { a, b, dx, dz, denominator: dx * dx + dz * dz || 1,
    left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: Math.min(a.z, b.z), bottom: Math.max(a.z, b.z) };
}
function preparedSegmentDistance(p: Point, segment: ReturnType<typeof prepareSegment>) {
  const { a, dx, dz, denominator } = segment;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / denominator));
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
function fartherThanBounds(p: Point, bounds: { left: number; right: number; top: number; bottom: number }, distance: number) {
  // Keep a conservative guard around floating-point projections.
  return Math.max(bounds.left - p.x, p.x - bounds.right, 0) > distance + 1e-9
    || Math.max(bounds.top - p.z, p.z - bounds.bottom, 0) > distance + 1e-9;
}

/** Exact radius checks over nearby cells, instead of all previous placements. */
function placementIndex() {
  const cells = new Map<string, Point[]>(), size = 8;
  return {
    add(p: Point) { const key = `${Math.floor(p.x / size)},${Math.floor(p.z / size)}`; const list = cells.get(key) ?? []; list.push(p); cells.set(key, list); },
    near(p: Point, radius: number) {
      for (let x = Math.floor((p.x - radius) / size); x <= Math.floor((p.x + radius) / size); x++)
        for (let z = Math.floor((p.z - radius) / size); z <= Math.floor((p.z + radius) / size); z++)
          if (cells.get(`${x},${z}`)?.some(q => Math.hypot(q.x - p.x, q.z - p.z) < radius)) return true;
      return false;
    },
  };
}

/** Check the whole road width, including intersecting paths, and building edges. */
export function streetClearance(map: DistrictMap, network: RoadNetwork, p: Point) {
  if (inWater(p, map)) return -1;
  let clearance = Infinity;
  for (const edge of network.edges) {
    clearance = Math.min(clearance, distanceToSegment(p, network.nodes.get(edge.a)!, network.nodes.get(edge.b)!) - edge.width / 2);
  }
  for (const building of map.buildings) for (const outline of districtBuildingOutlines(building, map)) {
    if (inPolygon(p, outline)) return -1;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!, b = outline[(i + 1) % outline.length]!;
      clearance = Math.min(clearance, distanceToSegment(p, { x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! }));
    }
  }
  return clearance;
}

/** Index roads and footprints once. Placement thresholds below 12 m are exact;
 * distant shapes cannot affect the local decision. An optional nonnegative
 * threshold can stop at the first failing boundary; without it, retain the
 * original exact local distance. Water is checked by callers. */
export function createLocalStreetClearance(map: DistrictMap, network: RoadNetwork) {
  const grid = new Map<string, { roadWidth: number; segments: ReturnType<typeof prepareSegment>[]; left: number; right: number; top: number; bottom: number }[]>();
  const add = (points: Point[], roadWidth: number) => {
    const margin = 12 + roadWidth / 2, xs = points.map(p => p.x), zs = points.map(p => p.z);
    const shape = { roadWidth, left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...zs), bottom: Math.max(...zs),
      segments: roadWidth ? [prepareSegment(points[0]!, points[1]!)] : points.map((a, i) => prepareSegment(a, points[(i + points.length - 1) % points.length]!)) };
    for (let x = Math.floor((shape.left - margin) / 60); x <= Math.floor((shape.right + margin) / 60); x++) {
      for (let z = Math.floor((shape.top - margin) / 60); z <= Math.floor((shape.bottom + margin) / 60); z++) {
        const key = `${x},${z}`, bucket = grid.get(key) ?? []; bucket.push(shape); grid.set(key, bucket);
      }
    }
  };
  network.edges.forEach(edge => add([network.nodes.get(edge.a)!, network.nodes.get(edge.b)!], edge.width));
  map.buildings.forEach(b => add(b.outline.map(([x, z]) => ({ x: x!, z: z! })), 0));
  return (p: Point, threshold?: number) => {
    const cutoff = threshold !== undefined && threshold >= 0 ? threshold : -Infinity;
    let clearance = Infinity;
    for (const shape of grid.get(`${Math.floor(p.x / 60)},${Math.floor(p.z / 60)}`) ?? []) {
      if (shape.roadWidth) {
        if (fartherThanBounds(p, shape, clearance + shape.roadWidth / 2)) continue;
        clearance = Math.min(clearance, preparedSegmentDistance(p, shape.segments[0]!) - shape.roadWidth / 2);
        if (clearance < cutoff) return clearance;
      }
      else {
        // Even concave footprints and their courtyards retain their exact boundary.
        let inside = false;
        const possibleInside = p.x >= shape.left && p.x <= shape.right && p.z >= shape.top && p.z <= shape.bottom;
        if (!possibleInside && fartherThanBounds(p, shape, clearance)) continue;
        for (const segment of shape.segments) {
          const { a, b } = segment;
          if (possibleInside && (a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
          clearance = Math.min(clearance, preparedSegmentDistance(p, segment));
          if (clearance < cutoff) return clearance;
        }
        if (inside) return -1;
      }
    }
    return clearance;
  };
}

/** Deterministic decoration outside real roads; shared by rendering and collision. */
export function planDistrictStreets(map: DistrictMap, network: RoadNetwork, references?: StreetLayoutReferences): StreetLayout {
  const sites: StreetSite[] = [], curbs: StreetCurb[] = [];
  const titSite = getTitSiteLayout(map);
  const titEntrance = getTitWestEntranceLayout(map);
  const towerSite = cantonTowerSite(map);
  const parks = districtParks(map), streetDistance = createLocalStreetClearance(map, network), waterAt = createWaterTest(map);
  const busReservations = busStopReservations(createBusStops(map, network)).map(b => {
    const c = Math.cos(b.yaw ?? 0), s = Math.sin(b.yaw ?? 0), ac = Math.abs(c), as = Math.abs(s);
    return { ...b, c, s, halfX: ac * b.width / 2 + as * b.depth / 2, halfZ: as * b.width / 2 + ac * b.depth / 2, expansion: ac + as };
  });
  const stationDistance = (p: Point, threshold = -Infinity) => {
    let clearance = Infinity;
    for (const b of busReservations) {
      const dx = p.x - b.x, dz = p.z - b.z;
      if (threshold >= 0 && (Math.abs(dx) > b.halfX + b.expansion * threshold + 1e-9
        || Math.abs(dz) > b.halfZ + b.expansion * threshold + 1e-9)) continue;
      clearance = Math.min(clearance, Math.max(Math.abs(dx * b.c - dz * b.s) - b.width / 2, Math.abs(dx * b.s + dz * b.c) - b.depth / 2));
      if (clearance < threshold) return clearance;
    }
    return clearance;
  };
  const gardenSegments = parks.flatMap(park => park.paths.flatMap(path => path.points.slice(1).map((b, i) => {
    const a = path.points[i]!; return { a: { x: a[0]!, z: a[1]! }, b: { x: b[0]!, z: b[1]! }, radius: path.width / 2 };
  })));
  const restaurant = getMcdonaldsLayout(map);
  if (restaurant) gardenSegments.push({ a: network.nearest(restaurant.pickup), b: restaurant.door, radius: 2.1 });
  for (const entry of riverAccesses(map)) gardenSegments.push({ a: entry.land, b: entry.end, radius: entry.width / 2 + 1 });
  for (const path of titSite?.paths ?? []) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1]!, b = path.points[i]!;
    gardenSegments.push({ a: { x: a[0]!, z: a[1]! }, b: { x: b[0]!, z: b[1]! }, radius: path.width / 2 });
  }
  if (map.buildings.some(b => b.id === LIYUAN_BUILDING_ID)) {
    const { gate, garage, garden } = getLiyuanLayout(map);
    // An automatic service-road bench must not block the named entrance or
    // garage forecourt. Use this clearance for both furniture and curb breaks.
    gardenSegments.push({ a: { x: gate.x, z: gate.z + 12 }, b: garden, radius: 2.5 },
      { a: { x: garage.x, z: garage.approach.z + 5 }, b: garage, radius: garage.width / 2 + 0.4 },
      { a: garden, b: garden, radius: garden.openRadius });
  }
  const preparedGardenSegments = gardenSegments.map(s => ({ ...prepareSegment(s.a, s.b), radius: s.radius }));
  const gardenDistance = (p: Point, threshold = -Infinity) => {
    let nearest = Infinity;
    for (const s of preparedGardenSegments) {
      if (threshold >= 0 && fartherThanBounds(p, s, threshold + s.radius)) continue;
      nearest = Math.min(nearest, preparedSegmentDistance(p, s) - s.radius);
      if (nearest < threshold) return nearest;
    }
    return nearest;
  };
  const poolDistance = (p: Point, threshold = -Infinity) => {
    let clearance = Infinity;
    for (const pool of titSite?.pools ?? []) {
      if (inPolygon(p, pool.outline)) return -1;
      for (let i = 0; i < pool.outline.length; i++) {
        const a = pool.outline[i]!, b = pool.outline[(i + 1) % pool.outline.length]!;
        clearance = Math.min(clearance, segmentDistance(p, { x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! }) - pool.rimWidth / 2);
        if (clearance < threshold) return clearance;
      }
    }
    return clearance;
  };
  const entranceSegments = (titEntrance?.reserved ?? []).map((a, i, points) => {
    const b = points[(i + 1) % points.length]!;
    return prepareSegment({ x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! });
  });
  const entranceDistance = (p: Point, threshold = -Infinity) => {
    if (!titEntrance) return Infinity;
    if (inPolygon(p, titEntrance.reserved)) return -1;
    let clearance = Infinity;
    for (const segment of entranceSegments) {
      clearance = Math.min(clearance, preparedSegmentDistance(p, segment));
      if (clearance < threshold) return clearance;
    }
    return clearance;
  };
  // Placement only compares clearance with a radius. Once any boundary fails
  // that threshold, the remaining distances cannot change the decision.
  const clearanceMeasures = [streetDistance, gardenDistance, poolDistance, entranceDistance, stationDistance];
  const clearance = (p: Point, threshold: number) => {
    if (waterAt(p) || titSite && inPolygon(p, titSite.plaza.outline) || towerSite && inPolygon(p, towerSite.outline)) return -1;
    let value = Infinity;
    for (const measure of clearanceMeasures) {
      value = Math.min(value, measure(p, threshold)); if (value < threshold) return value;
    }
    return value;
  };
  const nw = projectCoordinate(map.origin, map.bbox[0]!, map.bbox[3]!), se = projectCoordinate(map.origin, map.bbox[2]!, map.bbox[1]!);
  const inside = (p: Point, margin: number) => p.x > nw.x + margin && p.x < se.x - margin && p.z > nw.z + margin && p.z < se.z - margin;
  const at = (edge: RoadEdge, s: number, offset: number) => streetPointAt(network, edge, s, offset);
  const occupied = placementIndex(), curbIndex = placementIndex();
  for (const site of [...titWestStreetFurniture(map), ...liyingFurniture(map)]) {
    if (clearance(site, site.radius + .2) < site.radius + .2 || occupied.near(site, site.kind === "tree" ? 5 : 2)) continue;
    sites.push(site); occupied.add(site);
  }
  if (map.buildings.some(b => b.id === LIYUAN_BUILDING_ID)) {
    const { garden, exit, blocks } = getLiyuanLayout(map);
    for (const p of exit.palms) {
      // The source's single compound footprint contains its planted setbacks.
      // Check actual block walls and roads for this photo-authored tree row.
      if (blocks.some(b => p.x > b.x - b.width / 2 - .8 && p.x < b.x + b.width / 2 + .8 && p.z > b.z - b.depth / 2 - .8 && p.z < b.z + b.depth / 2 + .8)
        || network.edges.some(edge => segmentDistance(p, network.nodes.get(edge.a)!, network.nodes.get(edge.b)!) < edge.width / 2 + .6)
        || gardenDistance(p) < .6 || occupied.near(p, 3)) continue;
      sites.push({ ...p, kind: "tree", yaw: 0, radius: .42 * p.scale, campus: false, treeKind: "royal-palm", treeScale: p.scale }); occupied.add(p);
    }
    for (let quadrant = 0; quadrant < 4; quadrant++) for (const [i, a] of [0.42, 0.97].entries()) {
      const angle = quadrant * Math.PI / 2 + a, radius = (garden.openRadius + garden.radius) / 2 + 0.3;
      const p = { x: garden.x + Math.cos(angle) * radius, z: garden.z + Math.sin(angle) * radius };
      if (gardenDistance(p) < 1.1 || !garden.lawns.some(lawn => inPolygon(p, lawn))) continue;
      sites.push({ ...p, kind: "tree", yaw: 0, radius: 0.35, campus: false, garden: true, treeKind: i === 0 ? "palm" : "broadleaf" }); occupied.add(p);
    }
  }
  // The satellite reference identifies these green strips as tree rows. Place
  // them before generic decoration so random lamps cannot displace the rows.
  for (const p of titSite?.trees ?? []) {
    if (Math.min(streetDistance(p), gardenDistance(p), poolDistance(p)) < 1.3 || occupied.near(p, 5)) continue;
    sites.push({ ...p, yaw: 0, kind: "tree", radius: 1.1, campus: true }); occupied.add(p);
  }
  for (const edge of network.edges) {
    if (edge.width < 4.8 || edge.length < 8 || edge.road.bridge || edge.road.tunnel || edge.road.heights || edge.road.kind.endsWith("_link")) continue;
    const a = network.nodes.get(edge.a)!, b = network.nodes.get(edge.b)!;
    if (!inDetailedDistrict(map, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 })) continue;
    const yaw = streetEdgeYaw(network, edge);
    const add = (kind: StreetSite["kind"], s: number, offset: number, radius: number, gap: number) => {
      if (s < 5 || s > edge.length - 5) return;
      const p = at(edge, s, offset);
      if (!inside(p, radius) || clearance(p, radius + .2) < radius + 0.2 || occupied.near(p, gap)) return;
      const site = { ...p, yaw, kind, radius, campus: inPolygon(p, map.campus) };
      sites.push(site); references?.site(site, edge, s, offset); occupied.add(p);
    };
    for (const side of [-1, 1]) {
      for (let s = 2; s < edge.length - 2; s += 6) {
        const length = Math.min(5.9, edge.length - 2 - s), offset = side * (edge.width / 2 + 0.34);
        if (length < 1) continue;
        if ([0, 0.25, 0.5, 0.75, 1].every(t => inside(at(edge, s + length * t, offset), 0.22) && clearance(at(edge, s + length * t, offset), .22) > 0.22)) {
          const p = at(edge, s + length / 2, offset);
          if (!curbIndex.near(p, 3)) {
            const curb = { ...p, yaw, length };
            curbs.push(curb); references?.curb(curb, edge, s + length / 2, offset); curbIndex.add(p);
          }
        }
      }
      for (let s = 12; s < edge.length - 5; s += 30) {
        add("tree", s, side * (edge.width / 2 + 2.2), 1.1, 10);
        add("lamp", s + 10, side * (edge.width / 2 + 1.1), 0.3, 7);
        if (edge.road.kind === "service") add("bench", s + 20, side * (edge.width / 2 + 2.3), 1.2, 6);
      }
    }
  }
  // Park furniture uses the same list for the renderer and Rapier. Keep trunks
  // and benches clear of every original road, footprint and new garden path.
  for (const park of parks) {
    const xs = park.outline.map(p => p[0]!), zs = park.outline.map(p => p[1]!);
    const pathClearance = (p: Point) => Math.min(...park.paths.flatMap(path => path.points.slice(1).map((b, i) => {
      const a = path.points[i]!; return segmentDistance(p, { x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! }) - path.width / 2;
    })));
    const step = park.id === "tit-garden" ? 12 : 17;
    for (let x = Math.min(...xs) + 6; x < Math.max(...xs) - 4; x += step) for (let z = Math.min(...zs) + 6; z < Math.max(...zs) - 4; z += step) {
      const p = { x, z };
      if (!inPolygon(p, park.outline) || clearance(p, 1.6) < 1.6 || pathClearance(p) < 2.1 || occupied.near(p, 7)) continue;
      sites.push({ ...p, kind: "tree", yaw: 0, radius: 1.1, campus: true }); occupied.add(p);
    }
    if (park.id === "tit-garden") for (const p of [{ x: -91, z: -82.5 }, { x: -50, z: -84 }]) {
      if (clearance(p, 1.6) > 1.6 && !occupied.near(p, 5)) {
        sites.push({ ...p, kind: "tree", yaw: 0, radius: 1.1, campus: true }); occupied.add(p);
      }
    }
    for (const path of park.paths) for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1]!, b = path.points[i]!, length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
      const yaw = -Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!);
      for (let s = 10; s < length - 8; s += 32) {
        const offset = path.width / 2 + 1.6, p = { x: a[0]! + (b[0]! - a[0]!) * s / length + (b[1]! - a[1]!) / length * offset,
          z: a[1]! + (b[1]! - a[1]!) * s / length - (b[0]! - a[0]!) / length * offset };
        if (!inPolygon(p, park.outline) || clearance(p, 1.5) < 1.5 || pathClearance(p) < 1.3 || occupied.near(p, 4)) continue;
        sites.push({ ...p, kind: "bench", yaw, radius: 1.2, campus: true }); occupied.add(p);
      }
    }
  }
  const junction = chigangJunctionLayout(map);
  const clear = (p: Point, radius: number) => !junction?.solids.some(s => {
    const dx = p.x - s.x, dz = p.z - s.z;
    const x = Math.cos(s.yaw) * dx - Math.sin(s.yaw) * dz, z = Math.sin(s.yaw) * dx + Math.cos(s.yaw) * dz;
    return Math.hypot(Math.max(0, Math.abs(x) - s.width / 2), Math.max(0, Math.abs(z) - s.depth / 2)) < radius + .35;
  });
  // Keep automatic trees and lamps out of the authored stairs and bridge slab.
  const tencent = tencentJunctionLayout(map);
  const forecourt = tencentForecourtLayout(map);
  return { sites: sites.filter(s => !tencent?.reserve(s) && !forecourt?.reserve(s) && clear(s, s.kind === "tree" ? 1.6 : s.radius)), curbs: curbs.filter(s => !tencent?.reserve(s) && !forecourt?.reserve(s) && clear(s, .3)) };
}
