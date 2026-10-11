import { DISTRICT_PLACES, RIVERSIDE_PLACES, getLiyuanLayout } from "./places";
import { PAZHOU_PLACES } from "./pazhouPlaces";
import type { LiyingBuildingExtract } from "./liyingSite";
import { riverAccesses } from "./waterTravel";
import { getMcdonaldsLayout } from "./mcdonaldsSite";
import type { InterchangeExtract } from "./interchanges";
import { ninebotSite, NINEBOT_NAME } from "./ninebotSite";
import { createPolygonTest } from "./polygonIndex";
import { roadWidth } from "./roadWidth";
import type { DistrictInfillExtract } from "./districtInfill";
import { getChenClanLayout, type ChenClanExtract } from "./chenClanSite";

export { roadWidth } from "./roadWidth";

export interface Point { x: number; z: number; height?: number }
export interface DistrictRoad {
  id: number; name: string; kind: string; lanes: number; oneWay: number; rideable: boolean; nodes: number[];
  width?: number; layer?: number; bridge?: boolean; tunnel?: boolean; crossing?: boolean;
  access?: string; bicycle?: string;
  heights?: number[]; interchange?: string;
}
export interface DistrictBuilding { id: number; name: string; type: string; height: number | null; levels?: number; outline: number[][] }
export interface DistrictSite { id: number; name: string; type: string; outline: number[][] }
export interface DistrictWater { id: number; outline: number[][]; holes: number[][][] }
export interface DistrictBridge { id: string; name: string; kind: "beam" | "arch"; paths: number[][][] }
export interface DistrictExtension {
  origin: number[]; bbox: number[]; nodes: number[][]; roads: DistrictRoad[]; buildings: DistrictBuilding[];
  kind?: "riverside" | "pazhou"; replaceRoadIds?: number[];
  waters: DistrictWater[]; bridges: DistrictBridge[]; sites?: DistrictSite[];
  source: { attribution: string; license: string; url: string; roadsTimestamp: string; riverTimestamp: string };
}
export interface DistrictMap {
  name: string; origin: number[]; bbox: number[];
  source: { timestamp: string; attribution: string; license: string; url: string };
  nodes: number[][]; roads: DistrictRoad[]; buildings: DistrictBuilding[]; campus: number[][];
  sites?: DistrictSite[]; waters?: DistrictWater[]; bridges?: DistrictBridge[]; riversideSource?: DistrictExtension["source"]; pazhouSource?: DistrictExtension["source"];
  liyingSource?: LiyingBuildingExtract["source"];
  infillSource?: DistrictInfillExtract["source"];
  chenClanSource?: ChenClanExtract["source"];
  groundCutouts?: number[][][]; interchangesSource?: InterchangeExtract["source"];
  interchangeEntries?: Destination[];
  expansionSource?: { buildingIds: number[]; snapshotAt: string; license: string; attribution: string; url: string;
    sourceSha256: string; excludedFeatures: number; radius: number; center: number[]; legacyBounds: number[] };
}
export interface RoadEdge { a: number; b: number; road: DistrictRoad; length: number; width: number }
export interface RoadSnap extends Point { edge: RoadEdge; t: number; distance: number }
export interface Route { points: Point[]; roads: string[]; length: number }
export interface Destination extends Point { id: string; name: string }

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function projectCoordinate(origin: readonly number[], lon: number, lat: number): Point {
  return { x: (lon - origin[0]!) * 111320 * Math.cos(origin[1]! * Math.PI / 180), z: (origin[1]! - lat) * 111320 };
}
export function inPolygon(point: Point, polygon: readonly number[][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!;
    if ((a[1]! > point.z) !== (b[1]! > point.z)
      && point.x < (b[0]! - a[0]!) * (point.z - a[1]!) / (b[1]! - a[1]!) + a[0]!) inside = !inside;
  }
  return inside;
}

export function inWater(point: Point, map: Pick<DistrictMap, "waters">) {
  return (map.waters ?? []).some(w => inPolygon(point, w.outline) && !w.holes.some(h => inPolygon(point, h)));
}

/** Repeated planning queries share an index over the immutable source water. */
export function createWaterTest(map: Pick<DistrictMap, "waters">) {
  const waters = (map.waters ?? []).map(w => ({ outline: createPolygonTest(w.outline), holes: w.holes.map(createPolygonTest) }));
  return (point: Point) => waters.some(w => w.outline(point) && !w.holes.some(h => h(point)));
}

/** Keep the original district intact; both extracts use the same metre origin. */
export function extendDistrictMap(base: DistrictMap, extension: DistrictExtension): DistrictMap {
  if (base.origin.some((v, i) => v !== extension.origin[i])) throw new Error("扩展地图坐标原点不一致");
  const nodes = new Map([...extension.nodes, ...base.nodes].map(n => [n[0], n]));
  const buildings = new Map([...extension.buildings, ...base.buildings].map(b => [b.id, b]));
  const seen = new Set<string>();
  const replaced = new Set(extension.replaceRoadIds ?? []);
  const roads = [...base.roads.filter(r => !replaced.has(r.id)), ...extension.roads].filter(r => {
    const key = `${r.id}:${r.nodes.join(",")}`; if (seen.has(key)) return false; seen.add(key); return true;
  });
  const bridges = new Map([...(base.bridges ?? []), ...extension.bridges].map(b => [b.id, b]));
  return { ...base, bbox: [Math.min(base.bbox[0]!, extension.bbox[0]!), Math.min(base.bbox[1]!, extension.bbox[1]!),
    Math.max(base.bbox[2]!, extension.bbox[2]!), Math.max(base.bbox[3]!, extension.bbox[3]!)],
  nodes: [...nodes.values()], roads, buildings: [...buildings.values()],
  waters: extension.waters, bridges: [...bridges.values()],
  sites: [...new Map([...(base.sites ?? []), ...(extension.sites ?? [])].map(site => [site.id, site])).values()],
  ...(extension.kind === "pazhou" ? { pazhouSource: extension.source } : { riversideSource: extension.source }) };
}

/** World scene, navigation and map UI share these metre coordinates and node IDs. */
export function createRoadNetwork(map: DistrictMap, respectOneWay = true) {
  const restaurant = getMcdonaldsLayout(map);
  const scooterShop = ninebotSite(map);
  const nodes = new Map(map.nodes.map(([id, x, z, height]) => [id!, { x: x!, z: z!, ...(height === undefined ? {} : { height }) }]));
  const edges: RoadEdge[] = [], adjacency = new Map<number, { to: number; edge: RoadEdge }[]>();
  const connect = (a: number, b: number, edge: RoadEdge) => {
    const list = adjacency.get(a) ?? []; list.push({ to: b, edge }); adjacency.set(a, list);
  };
  for (const road of map.roads) for (let i = 1; i < road.nodes.length; i++) {
    const a = road.nodes[i - 1]!, b = road.nodes[i]!, length = distance(nodes.get(a)!, nodes.get(b)!);
    if (length < 0.05) continue;
    const edge = { a, b, road, length, width: roadWidth(road) }; edges.push(edge);
    if (!road.rideable) continue;
    if (!respectOneWay || road.oneWay !== -1) connect(a, b, edge);
    if (!respectOneWay || road.oneWay !== 1) connect(b, a, edge);
  }
  // Index exact segments once. Every query retains the same projection result
  // as a full scan, including points far outside the covered neighbourhood.
  const cellSize = 64, cells = new Map<string, RoadEdge[]>();
  for (const edge of edges) {
    const a = nodes.get(edge.a)!, b = nodes.get(edge.b)!;
    for (let x = Math.floor(Math.min(a.x, b.x) / cellSize); x <= Math.floor(Math.max(a.x, b.x) / cellSize); x++)
      for (let z = Math.floor(Math.min(a.z, b.z) / cellSize); z <= Math.floor(Math.max(a.z, b.z) / cellSize); z++) {
        const key = `${x},${z}`, list = cells.get(key) ?? []; list.push(edge); cells.set(key, list);
      }
  }
  function nearest(point: Point, rideable = true, groundOnly = false): RoadSnap {
    let best: RoadSnap | undefined, bestScore = Infinity;
    const seen = new Set<RoadEdge>();
    const consider = (edge: RoadEdge) => {
      if (rideable && !edge.road.rideable || groundOnly && (edge.road.heights
        ? Math.abs(nodes.get(edge.a)!.height ?? 0) > 0.65 || Math.abs(nodes.get(edge.b)!.height ?? 0) > 0.65 : edge.road.layer)) return;
      const a = nodes.get(edge.a)!, b = nodes.get(edge.b)!;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.z - a.z) * (b.z - a.z)) / edge.length ** 2));
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, d = Math.hypot(point.x - x, point.z - z);
      const height = (a.height ?? 0) + ((b.height ?? 0) - (a.height ?? 0)) * t;
      const score = Math.hypot(d, point.height === undefined ? 0 : (height - point.height) * 4);
      if (score < bestScore) { bestScore = score; best = { x, z, t, height, distance: d, edge }; }
    };
    for (let radius = cellSize; radius <= cellSize * 8; radius *= 2) {
      for (let x = Math.floor((point.x - radius) / cellSize); x <= Math.floor((point.x + radius) / cellSize); x++)
        for (let z = Math.floor((point.z - radius) / cellSize); z <= Math.floor((point.z + radius) / cellSize); z++)
          for (const edge of cells.get(`${x},${z}`) ?? []) if (!seen.has(edge)) { seen.add(edge); consider(edge); }
      if (best && bestScore < radius) return best;
    }
    // Rare map-edge clicks should remain exact without a huge empty-cell scan.
    for (const edge of edges) if (!seen.has(edge)) consider(edge);
    if (!best) throw new Error("街区缺少可骑行道路");
    return best;
  }
  function streetRoute(start: Point, target: Point): Route | null {
    const from = nearest(start), end = nearest(target), costs = new Map<number, number>();
    const previous = new Map<number, { from: number; edge: RoadEdge }>();
    const queue = new Set<number>();
    // Source and destination live on segments, not at arbitrary closest junctions.
    if (!respectOneWay || from.edge.road.oneWay !== 1) { costs.set(from.edge.a, from.t * from.edge.length); queue.add(from.edge.a); }
    if (!respectOneWay || from.edge.road.oneWay !== -1) { costs.set(from.edge.b, (1 - from.t) * from.edge.length); queue.add(from.edge.b); }
    const ends = new Map<number, number>();
    if (!respectOneWay || end.edge.road.oneWay !== -1) ends.set(end.edge.a, end.t * end.edge.length);
    if (!respectOneWay || end.edge.road.oneWay !== 1) ends.set(end.edge.b, (1 - end.t) * end.edge.length);
    let bestEnd: number | undefined, bestCost = Infinity;
    while (queue.size) {
      let current = -1, cheapest = Infinity;
      for (const id of queue) if (costs.get(id)! < cheapest) { current = id; cheapest = costs.get(id)!; }
      queue.delete(current);
      if (cheapest >= bestCost) continue;
      const tail = ends.get(current);
      if (tail !== undefined && cheapest + tail < bestCost) { bestCost = cheapest + tail; bestEnd = current; }
      for (const link of adjacency.get(current) ?? []) {
        const next = cheapest + link.edge.length;
        if (next < (costs.get(link.to) ?? Infinity)) {
          costs.set(link.to, next); previous.set(link.to, { from: current, edge: link.edge }); queue.add(link.to);
        }
      }
    }
    const same = from.edge === end.edge && (!respectOneWay || from.edge.road.oneWay === 0
      || from.edge.road.oneWay === 1 && end.t >= from.t || from.edge.road.oneWay === -1 && end.t <= from.t);
    if (same && Math.abs(end.t - from.t) * from.edge.length <= bestCost) {
      return { points: [from, end], roads: [from.edge.road.name], length: distance(from, end) };
    }
    if (bestEnd === undefined) return null;
    const path: number[] = [bestEnd], names = [end.edge.road.name];
    while (previous.has(path[0]!)) {
      const link = previous.get(path[0]!)!; path.unshift(link.from); names.unshift(link.edge.road.name);
    }
    return { points: [from, ...path.map(id => nodes.get(id)!), end], roads: [from.edge.road.name, ...names], length: bestCost };
  }
  function route(start: Point, target: Point): Route | null {
    const trip = streetRoute(start, target);
    if (!trip) return trip;
    if (scooterShop && distance(target, scooterShop.approach) < .05) {
      trip.length += distance(trip.points.at(-1)!, target); trip.points.push({ ...target }); trip.roads.push("7号门店前停车位");
    }
    if (!restaurant) return trip;
    // Only this shop apron adds a sidewalk approach. Retain the road graph and
    // one-way rules, including the route back after collection.
    if (inPolygon(start, restaurant.apron)) {
      trip.length += distance(start, trip.points[0]!); trip.points.unshift({ ...start }); trip.roads.unshift("麦当劳玻璃门前");
    }
    if (distance(target, restaurant.pickup) < 0.05) {
      trip.length += distance(trip.points.at(-1)!, target); trip.points.push({ ...target }); trip.roads.push("麦当劳玻璃门前");
    }
    return trip;
  }
  return { nodes, edges, adjacency, nearest, route };
}
export type RoadNetwork = ReturnType<typeof createRoadNetwork>;

export function createDestinations(map: DistrictMap, network: RoadNetwork): Destination[] {
  const scooterShop = ninebotSite(map);
  const restaurant = getMcdonaldsLayout(map);
  const destinations: Destination[] = [
    ["tit", "TIT 园区入口", 113.31848, 23.100074],
    ["tit-north", "TIT 北侧", 113.31978, 23.103113],
    ["kecun", "客村 · 新港中路", 113.316228, 23.098736],
    ...(map.liyingSource ? [["liying-mall", "丽影广场 · 新港中路", 113.316614, 23.098408], ["liying-huating", "丽影华庭 · 艺影街", 113.31529, 23.09816]] : []),
    ["yijing", "艺景路", 113.31655, 23.0966],
    ["chigang", "赤岗西路", 113.3245, 23.0973],
    ...(map.pazhouSource ? PAZHOU_PLACES.map(p => [p.id, p.name, p.lon, p.lat]) : []),
    ...DISTRICT_PLACES.map(p => [p.id, p.name, p.lon, p.lat]),
    ...(map.bridges?.length ? RIVERSIDE_PLACES.map(p => [p.id, `${p.name} · 南岸观景`, p.viewLon, p.viewLat]) : []),
  ].map(([id, name, lon, lat]) => {
    const p = id === "mcdonalds" && restaurant ? restaurant.pickup
      : network.nearest(id === "liyuan" ? getLiyuanLayout(map).gate : projectCoordinate(map.origin, Number(lon), Number(lat)), true, RIVERSIDE_PLACES.some(place => place.id === id));
    return { id: String(id), name: String(name), x: p.x, z: p.z };
  });
  const tower = map.buildings.find(b => b.id === 584204634);
  if (tower) {
    const point = { x: tower.outline.reduce((s, p) => s + p[0]!, 0) / tower.outline.length,
      z: tower.outline.reduce((s, p) => s + p[1]!, 0) / tower.outline.length + 47 };
    const snap = network.nearest(point);
    destinations.push({ id: "canton-tower", name: "广州塔 · 观光入口", x: snap.x, z: snap.z });
  }
  for (const bridge of map.bridges ?? []) {
    if (!map.roads.some(r => r.layer === 1 && r.name === bridge.name)) continue;
    const path = bridge.paths[0]!;
    // An arched plan can bend south of its actual landing. Only endpoints are exits.
    const ends = [path[0]!, path.at(-1)!];
    const north = [...ends].sort((a, b) => a[1]! - b[1]!)[0]!;
    destinations.push({ id: `${bridge.id}-north`, name: `${bridge.name} · 北岸出口`, x: north[0]!, z: north[1]! });
    const south = [...ends].sort((a, b) => b[1]! - a[1]!)[0]!;
    destinations.push({ id: `${bridge.id}-entry`, name: `${bridge.name} · 南岸上桥`, x: south[0]!, z: south[1]! });
  }
  for (const entry of riverAccesses(map)) {
    const snap = network.nearest(entry.land, true, true);
    destinations.push({ id: entry.id, name: entry.name, x: snap.x, z: snap.z });
  }
  for (const site of map.sites ?? []) {
    if (site.type !== "park" || ![29167398, 240896447, 372783183, 243319596, 372783163].includes(site.id)) continue;
    // Haixinsha's centre includes a separate raised pedestrian deck. Navigate
    // to the mapped public bridge landing, which belongs to the street graph.
    const point = site.id === 29167398 ? network.nodes.get(5110613816)! : { x: site.outline.reduce((sum, p) => sum + p[0]!, 0) / site.outline.length,
      z: site.outline.reduce((sum, p) => sum + p[1]!, 0) / site.outline.length };
    if (!point) continue;
    const snap = network.nearest(point, true, true);
    destinations.push({ id: `park-${site.id}`, name: site.name + (site.id === 29167398 ? " · 北侧入口" : ""), x: snap.x, z: snap.z });
  }
  destinations.push(...(map.interchangeEntries ?? []));
  const chenClan = getChenClanLayout(map);
  if (chenClan) {
    destinations.push({ id: "chen-clan", name: "陈家祠 · 陈氏书院南门", ...chenClan.gate });
    // Fictional collection points use connected public road positions near the gate.
    const approach = network.route(destinations.find(p => p.id === "tit")!, chenClan.gate);
    let metres = 0;
    const stops = [{ id: "chen-food-pickup", name: "祠堂周边 · 粮米集货点", distance: 220 },
      { id: "chen-tools-pickup", name: "祠堂周边 · 维修箱接应点", distance: 450 }];
    const points = [...(approach?.points ?? [])].reverse();
    for (let i = 1; i < points.length && stops.length; i++) {
      metres += distance(points[i - 1]!, points[i]!);
      while (stops.length && metres >= stops[0]!.distance) {
        const stop = stops.shift()!; destinations.push({ id: stop.id, name: stop.name, ...points[i]! });
      }
    }
  }
  if (scooterShop) destinations.push({ id: "ninebot", name: NINEBOT_NAME, ...scooterShop.approach, height: 0 });
  return destinations;
}
