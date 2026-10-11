import { segmentDistance } from "./segmentDistance";
export { segmentDistance } from "./segmentDistance";
import { createDestinations, distance, inPolygon, type DistrictMap, type DistrictRoad, type Point, type RoadNetwork } from "./map";
import { districtParks, getLiyuanLayout, LIYUAN_BUILDING_ID } from "./places";
import { pazhouGroundLayout } from "./pazhouGround";
import { getTitSiteLayout, getTitWestEntranceLayout, TIT_WEST_ROAD_ID } from "./titSite";
import { cantonTowerSite } from "./cantonTowerSite";
import { liyingForecourts } from "./liyingSite";
import { getMcdonaldsLayout } from "./mcdonaldsSite";
import { chigangJunctionLayout } from "./chigangSite";
import { jianghaiSiteLayout } from "./jianghaiSite";
import { tencentJunctionLayout } from "./tencentJunctionSite";

export type RideSurface = "asphalt" | "brick" | "stone" | "grass";
export interface PavedCourt { outline: number[][]; surface?: "asphalt" | "brick" | "stone" }
export interface GroundStroke {
  a: Point; b: Point; width: number; surface: Exclude<RideSurface, "grass">; sidewalk?: number;
  road?: Pick<DistrictRoad, "id" | "kind" | "lanes" | "oneWay" | "bridge" | "tunnel" | "layer" | "heights">;
  roadDistance?: number;
}
export interface GroundRoadMark { a: Point; b: Point; color: "white" | "yellow"; width: number; dash: number[]; dashOffset: number }
export type GroundRoadExclusion = number[][] | { outline: number[][]; holes: number[][][] };
const pedestrianKinds = new Set(["footway", "path", "pedestrian"]);
const markedRoadKinds = new Set(["primary", "secondary", "tertiary", "residential", "unclassified", "trunk", "motorway", "primary_link", "secondary_link", "tertiary_link", "trunk_link", "motorway_link"]);
const groundRoad = (road: GroundStroke["road"]) => road && !road.layer && !road.heights && !road.bridge && !road.tunnel;

/** Plan paint once in metres, keeping junctions and authored paving clear.
 * Unknown lane counts use the conservative three-metre road-width estimate;
 * authored paths have no road metadata and never receive vehicle markings. */
export function planGroundRoadMarkings(strokes: readonly GroundStroke[], network: RoadNetwork, excluded: readonly GroundRoadExclusion[] = []): GroundRoadMark[] {
  const incident = new Map<number, typeof network.edges>();
  for (const edge of network.edges) if (groundRoad(edge.road)) for (const id of [edge.a, edge.b]) {
    const list = incident.get(id) ?? []; list.push(edge); incident.set(id, list);
  }
  const junctions: (Point & { radius: number })[] = [];
  for (const [id, edges] of incident) {
    if (edges.length < 3) continue;
    const center = network.nodes.get(id)!, directions: Point[] = [];
    for (const edge of edges) {
      const other = network.nodes.get(edge.a === id ? edge.b : edge.a)!, length = distance(center, other);
      if (length < .01) continue;
      const direction = { x: (other.x - center.x) / length, z: (other.z - center.z) / length };
      if (!directions.some(p => p.x * direction.x + p.z * direction.z > .98)) directions.push(direction);
    }
    // Signal supports may move up to nine metres farther from the junction.
    // Their stop lines extend another six metres beyond the crossing radius.
    if (directions.length >= 3) junctions.push({ ...center, radius: Math.max(...edges.map(e => e.width)) / 2 + 19 });
  }
  const polygons = excluded.map(p => Array.isArray(p) ? { outline: p, holes: [] } : p).filter(p => p.outline.length >= 3).map(({ outline: points, holes }) => ({ points, holes,
    left: Math.min(...points.map(p => p[0]!)), right: Math.max(...points.map(p => p[0]!)),
    top: Math.min(...points.map(p => p[1]!)), bottom: Math.max(...points.map(p => p[1]!)),
  }));
  const marks: GroundRoadMark[] = [];
  for (const stroke of strokes) {
    if (stroke.surface !== "asphalt" || !groundRoad(stroke.road) || !markedRoadKinds.has(stroke.road!.kind) || stroke.width < 6) continue;
    const { road } = stroke, dx = stroke.b.x - stroke.a.x, dz = stroke.b.z - stroke.a.z, length = Math.hypot(dx, dz);
    if (length < .1) continue;
    const reported = road!.lanes, lanes = Math.min(8, Math.floor(stroke.width / 2.4), Number.isInteger(reported) && reported > 0 ? reported : Math.floor(stroke.width / 3));
    if (lanes < 2) continue;
    const lines: { offset: number; color: GroundRoadMark["color"]; dash: number[] }[] = [];
    if (road!.oneWay === 1 || road!.oneWay === -1) {
      for (let lane = 1; lane < lanes; lane++) lines.push({ offset: (lane / lanes - .5) * stroke.width, color: "white", dash: [4, 5] });
    } else {
      if (lanes >= 4) for (const side of [-1, 1]) lines.push({ offset: side * .16, color: "yellow", dash: [] });
      else lines.push({ offset: 0, color: "yellow", dash: [4, 5] });
      if (lanes % 2 === 0) for (let lane = 1; lane < lanes / 2; lane++) for (const side of [-1, 1])
        lines.push({ offset: side * lane / lanes * stroke.width, color: "white", dash: [4, 5] });
    }
    for (const line of lines) {
      const a = { x: stroke.a.x + dz / length * line.offset, z: stroke.a.z - dx / length * line.offset };
      const b = { x: stroke.b.x + dz / length * line.offset, z: stroke.b.z - dx / length * line.offset };
      const at = (t: number) => ({ x: a.x + dx * t, z: a.z + dz * t });
      const cuts: [number, number][] = [];
      for (const junction of junctions) {
        const t = ((junction.x - a.x) * dx + (junction.z - a.z) * dz) / (length * length), p = at(t);
        const squared = (junction.radius + .2) ** 2 - (p.x - junction.x) ** 2 - (p.z - junction.z) ** 2;
        if (squared <= 0) continue;
        const half = Math.sqrt(squared) / length; if (t + half > 0 && t - half < 1) cuts.push([Math.max(0, t - half), Math.min(1, t + half)]);
      }
      for (const polygon of polygons) {
        if (Math.max(a.x, b.x) < polygon.left - .2 || Math.min(a.x, b.x) > polygon.right + .2 || Math.max(a.z, b.z) < polygon.top - .2 || Math.min(a.z, b.z) > polygon.bottom + .2) continue;
        const breaks = [0, 1];
        // Island boundaries also split the line: a river excludes its outer
        // interior, while the land inside each hole remains eligible for paint.
        for (const ring of [polygon.points, ...polygon.holes]) for (let i = 0; i < ring.length; i++) {
          const p = ring[i]!, q = ring[(i + 1) % ring.length]!, ex = q[0]! - p[0]!, ez = q[1]! - p[1]!;
          const denominator = dx * ez - dz * ex;
          const px = p[0]! - a.x, pz = p[1]! - a.z;
          if (Math.abs(denominator) < 1e-8) {
            if (Math.abs(px * dz - pz * dx) / length > .2) continue;
            const t = (px * dx + pz * dz) / (length * length), u = ((q[0]! - a.x) * dx + (q[1]! - a.z) * dz) / (length * length);
            const left = Math.min(t, u) - .2 / length, right = Math.max(t, u) + .2 / length;
            if (right > 0 && left < 1) cuts.push([Math.max(0, left), Math.min(1, right)]);
            continue;
          }
          const t = (px * ez - pz * ex) / denominator, u = (px * dz - pz * dx) / denominator;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) breaks.push(t);
        }
        breaks.sort((a, b) => a - b);
        for (let i = 1; i < breaks.length; i++) {
          const midpoint = at((breaks[i - 1]! + breaks[i]!) / 2);
          if (inPolygon(midpoint, polygon.points) && !polygon.holes.some(hole => inPolygon(midpoint, hole)))
            cuts.push([Math.max(0, breaks[i - 1]! - .2 / length), Math.min(1, breaks[i]! + .2 / length)]);
        }
      }
      cuts.sort((a, b) => a[0] - b[0]);
      let start = 0;
      const add = (end: number) => {
        if ((end - start) * length < .4) return;
        marks.push({ a: at(start), b: at(end), color: line.color, width: .2, dash: line.dash,
          dashOffset: (stroke.roadDistance ?? 0) + start * length });
      };
      for (const [left, right] of cuts) { if (left > start) add(left); start = Math.max(start, right); }
      if (start < 1) add(1);
    }
  }
  return marks;
}

/** The first 270 metres of the real entrance-to-north route, not a new road. */
export function titFinishArea(map: DistrictMap, network: RoadNetwork) {
  const destinations = createDestinations(map, network), route = network.route(destinations[0]!, destinations[1]!);
  const points: Point[] = [destinations[0]!]; let remaining = 270;
  for (const p of route?.points.slice(1) ?? []) {
    const a = points.at(-1)!, length = distance(a, p);
    if (length < 0.001) continue;
    const t = Math.min(1, remaining / length);
    points.push({ x: a.x + (p.x - a.x) * t, z: a.z + (p.z - a.z) * t });
    remaining -= length; if (remaining <= 0) break;
  }
  const near = (p: Point, margin = 65) => points.slice(1).some((b, i) => segmentDistance(p, points[i]!, b) <= margin);
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  return { points, near, bounds: [Math.min(...xs) - 66, Math.min(...zs) - 66, Math.max(...xs) + 66, Math.max(...zs) + 26] as const };
}

/** Paving is an art interpretation; OSM road centres and footprints remain intact. */
export function createDistrictSurfaces(map: DistrictMap, network: RoadNetwork) {
  const focus = titFinishArea(map, network);
  const titSite = getTitSiteLayout(map);
  const titEntrance = getTitWestEntranceLayout(map);
  const towerSite = cantonTowerSite(map);
  const restaurant = getMcdonaldsLayout(map);
  const pazhou = pazhouGroundLayout(map), parks = [...districtParks(map), ...pazhou.parks];
  const tencent = tencentJunctionLayout(map);
  if (tencent) parks.push({ id: "tencent-junction-island", name: "腾讯西侧路口草坪岛", outline: tencent.island, lawns: [tencent.island], paths: [] });
  const liyuan = map.buildings.some(b => b.id === LIYUAN_BUILDING_ID) ? getLiyuanLayout(map) : null;
  // Only ground planting participates here. No automatic trees or benches are
  // placed in the user's deliberately open circular garden centre.
  if (liyuan) parks.push({ id: "liyuan-garden", name: "丽园雅庭圆形花园", outline: liyuan.garden.outline, lawns: liyuan.garden.lawns, paths: [] });
  const courts: PavedCourt[] = [
    ...(map.sites ?? []).filter(site => [520935699, 520935700].includes(site.id)).map(site => ({ outline: site.outline, surface: "stone" as const })),
    { outline: [[-111, -74], [-31.5, -74], [-31.5, -99], [-111, -99]] },
    { outline: [[-112, -131], [-57, -131], [-57, -174], [-112, -174]] },
    { outline: [[54, -416], [185, -416], [185, -400], [54, -400]], surface: "stone" },
    { outline: [[100, -97], [129, -97], [129, -65], [100, -65]], surface: "stone" },
    ...(liyuan ? [{ outline: liyuan.courtyard, surface: "stone" as const }] : []),
    ...(titSite ? [{ outline: titSite.plaza.outline, surface: "stone" as const }] : []),
    ...(titEntrance ? [{ outline: titEntrance.apron, surface: "stone" as const }] : []),
    ...pazhou.courts,
    ...(tencent ? [{ outline: tencent.pavement, surface: "asphalt" as const }] : []),
    ...(chigangJunctionLayout(map)?.pavement.map(outline => ({ outline, surface: "stone" as const })) ?? []),
    ...(jianghaiSiteLayout(map)?.pavement.map(outline => ({ outline, surface: "stone" as const })) ?? []),
    ...liyingForecourts(map),
    ...(restaurant ? [{ outline: restaurant.apron, surface: "stone" as const }] : []),
    ...(towerSite ? [{ outline: towerSite.outline, surface: "stone" as const }] : []),
  ];
  const roadDistances = new Map<number, number>();
  const strokes: GroundStroke[] = network.edges.filter(edge => !edge.road.layer && !edge.road.heights).map(edge => {
    const a = network.nodes.get(edge.a)!, b = network.nodes.get(edge.b)!;
    const middle = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const campus = inPolygon(middle, map.campus);
    const roadDistance = roadDistances.get(edge.road.id) ?? 0; roadDistances.set(edge.road.id, roadDistance + edge.length);
    const brick = campus && edge.road.id !== TIT_WEST_ROAD_ID && edge.width <= 4.8 && !focus.near(middle, 2);
    const pedestrian = !campus && pedestrianKinds.has(edge.road.kind);
    return { a, b, width: edge.width, surface: brick ? "brick" : pedestrian ? "stone" : "asphalt", ...(pedestrian ? { sidewalk: 0 } : {}), road: edge.road, roadDistance };
  });
  for (const park of parks) for (const path of park.paths) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1]!, b = path.points[i]!;
    strokes.push({ a: { x: a[0]!, z: a[1]! }, b: { x: b[0]!, z: b[1]! }, width: path.width, surface: path.surface, sidewalk: 0 });
  }
  // Authored forecourt links stopped just outside the old automatic sidewalk.
  // Join their rounded caps to the footway's actual edge after removing that
  // buffer, so a hospital entrance does not acquire a narrow grass seam.
  for (const link of pazhou.strokes) {
    let endpoint = link.b, nearest = Infinity;
    const length = distance(link.a, link.b);
    for (const path of strokes) {
      if (!path.road || !pedestrianKinds.has(path.road.kind) || path.surface !== "stone") continue;
      const dx = path.b.x - path.a.x, dz = path.b.z - path.a.z;
      const t = Math.max(0, Math.min(1, ((link.b.x - path.a.x) * dx + (link.b.z - path.a.z) * dz) / (dx * dx + dz * dz || 1)));
      const target = { x: path.a.x + dx * t, z: path.a.z + dz * t }, d = distance(link.b, target), gap = d - (path.width + link.width) / 2;
      if (d >= nearest || gap <= 0 || gap > .75 || length < .01
        || ((target.x - link.b.x) * (link.b.x - link.a.x) + (target.z - link.b.z) * (link.b.z - link.a.z)) / (d * length) < .95) continue;
      // A small overlap keeps the circular cap joined across the entrance width.
      nearest = d; endpoint = { x: link.b.x + (target.x - link.b.x) * (gap + .2) / d, z: link.b.z + (target.z - link.b.z) * (gap + .2) / d };
    }
    strokes.push({ ...link, b: endpoint });
  }
  for (const path of titSite?.paths ?? []) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1]!, b = path.points[i]!;
    strokes.push({ a: { x: a[0]!, z: a[1]! }, b: { x: b[0]!, z: b[1]! }, width: path.width, surface: "stone", sidewalk: 0 });
  }
  const courtGrid = new Map<string, PavedCourt[]>();
  for (const court of courts) {
    const xs = court.outline.map(p => p[0]!), zs = court.outline.map(p => p[1]!);
    for (let x = Math.floor(Math.min(...xs) / 32); x <= Math.floor(Math.max(...xs) / 32); x++)
      for (let z = Math.floor(Math.min(...zs) / 32); z <= Math.floor(Math.max(...zs) / 32); z++) {
        const key = `${x},${z}`, bucket = courtGrid.get(key) ?? []; bucket.push(court); courtGrid.set(key, bucket);
      }
  }
  // A metre-space index keeps the fixed-step query cheap. Draw order and query
  // priority agree at junctions: asphalt > brick > pavement > grass.
  const grid = new Map<string, GroundStroke[]>();
  for (const stroke of strokes) {
    const margin = stroke.width / 2 + (stroke.sidewalk ?? 1.6);
    for (let x = Math.floor((Math.min(stroke.a.x, stroke.b.x) - margin) / 32); x <= Math.floor((Math.max(stroke.a.x, stroke.b.x) + margin) / 32); x++) {
      for (let z = Math.floor((Math.min(stroke.a.z, stroke.b.z) - margin) / 32); z <= Math.floor((Math.max(stroke.a.z, stroke.b.z) + margin) / 32); z++) {
        const key = `${x},${z}`, bucket = grid.get(key) ?? []; bucket.push(stroke); grid.set(key, bucket);
      }
    }
  }
  function at(p: Point): RideSurface {
    let surface: RideSurface = "grass";
    const campus = inPolygon(p, map.campus);
    for (const court of courtGrid.get(`${Math.floor(p.x / 32)},${Math.floor(p.z / 32)}`) ?? []) if ((campus || court.surface) && inPolygon(p, court.outline)) surface = court.surface ?? "brick";
    if (parks.some(park => park.lawns.some(lawn => inPolygon(p, lawn)))) surface = "grass";
    for (const s of grid.get(`${Math.floor(p.x / 32)},${Math.floor(p.z / 32)}`) ?? []) {
      const d = segmentDistance(p, s.a, s.b);
      if (d <= s.width / 2) {
        if (s.surface === "asphalt") return "asphalt";
        // Park stone paths participate in the same query as road paving.
        if (surface !== "brick") surface = s.surface;
      } else if (d <= s.width / 2 + (s.sidewalk ?? 1.6) && surface === "grass") surface = campus ? "brick" : "stone";
    }
    return surface;
  }
  const roadMarks = planGroundRoadMarkings(strokes, network, [map.campus, ...courts.map(c => c.outline), ...parks.map(p => p.outline),
    ...(map.waters ?? []), ...(map.groundCutouts ?? []), ...(titEntrance ? [titEntrance.reserved] : [])]);
  return { focus, strokes, courts, parks, pools: titSite?.pools ?? [], roadMarks, at, map };
}
export type DistrictSurfaces = ReturnType<typeof createDistrictSurfaces>;
