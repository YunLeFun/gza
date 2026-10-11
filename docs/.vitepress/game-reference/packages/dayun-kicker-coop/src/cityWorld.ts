import { GUANGZHOU_COOP_ORIGIN, GUANGZHOU_COOP_SPAWN_SEGMENT } from './guangzhouOrigin';
import { CITY_SCOOTER_PARKING_SITES } from './cityParking';
import { CITY_ROOM_CAPACITY, type CityBuilding, type CityMapExtract, type CityPoint, type CityRoad, type CityWater, type CityWorld, type CityWorldExtracts } from './cityTypes';

export const CITY_RULES = {
  minPlayers: 1, maxPlayers: CITY_ROOM_CAPACITY,
  tickRate: 60, movementSpeed: 4.8, sprintSpeed: 7.2, jumpSpeed: 5.8, gravity: 18, playerRadius: .35, zombieRadius: .4,
  eyeHeight: 1.6, health: 100, reviveHealth: 45, reviveRadius: 2.4, reviveMs: 3000,
  zombieHealth: 70, zombieDamage: 10, zombieAttackInterval: .8, zombieAttackRange: 1.15,
  walkerSpeed: 1.8, runnerSpeed: 3, maxZombies: 32, maxEvents: 64,
  inputTimeoutMs: 500, aimPitchLimit: Math.PI * .45, waveCounts: [12, 20, 28] as readonly number[],
  spawnInterval: .7, wavePauseMs: 3500, maxStepTicks: 600,
} as const;

export function citySegmentDistance(point: CityPoint, a: CityPoint, b: CityPoint) {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz);
}
function inPolygon(p: CityPoint, ring: readonly (readonly number[])[]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!;
    if ((a[1]! > p.z) !== (b[1]! > p.z) && p.x < (b[0]! - a[0]!) * (p.z - a[1]!) / (b[1]! - a[1]!) + a[0]!) result = !result;
  }
  return result;
}
type Polygon = readonly (readonly number[])[];
interface Bounds { minX: number; minZ: number; maxX: number; maxZ: number }
interface PolygonEdge extends Bounds { a: CityPoint; b: CityPoint }
interface PreparedPolygon extends Bounds { edges: PolygonEdge[]; scale: number }
// The world grid already assumes immutable map geometry. Cache the same source
// outlines, never rounded sample positions or collision results.
const polygons = new WeakMap<Polygon, PreparedPolygon>();
function preparePolygon(outline: Polygon): PreparedPolygon {
  const cached = polygons.get(outline); if (cached) return cached;
  const points = outline.map(p => ({ x: p[0]!, z: p[1]! }));
  const edges = points.map((a, i): PolygonEdge => {
    const b = points[(i + 1) % points.length]!;
    return { a, b, minX: Math.min(a.x, b.x), minZ: Math.min(a.z, b.z),
      maxX: Math.max(a.x, b.x), maxZ: Math.max(a.z, b.z) };
  });
  const bounds = { minX: Math.min(...edges.map(e => e.minX)), minZ: Math.min(...edges.map(e => e.minZ)),
    maxX: Math.max(...edges.map(e => e.maxX)), maxZ: Math.max(...edges.map(e => e.maxZ)) };
  const result = { ...bounds, edges,
    scale: Math.max(1, Math.abs(bounds.minX), Math.abs(bounds.minZ), Math.abs(bounds.maxX), Math.abs(bounds.maxZ)) };
  polygons.set(outline, result); return result;
}
function outsideBounds(p: CityPoint, bounds: Bounds, padding: number) {
  return p.x < bounds.minX - padding || p.x > bounds.maxX + padding
    || p.z < bounds.minZ - padding || p.z > bounds.maxZ + padding;
}
function polygonTouches(p: CityPoint, outline: Polygon, radius: number) {
  const polygon = preparePolygon(outline);
  // A conservative rounding allowance keeps this rejection broader than the
  // original distance comparison, including exact-radius and large-coordinate
  // contacts. NaN padding disables rejection and preserves the narrow phase.
  const padding = Math.max(0, radius) + Number.EPSILON * 16
    * Math.max(polygon.scale, Math.abs(p.x), Math.abs(p.z), Math.abs(radius));
  if (outsideBounds(p, polygon, padding)) return false;
  if (inPolygon(p, outline)) return true;
  for (const edge of polygon.edges) {
    if (!outsideBounds(p, edge, padding) && citySegmentDistance(p, edge.a, edge.b) <= radius) return true;
  }
  return false;
}
function roadWidth(road: CityMapExtract['roads'][number]) {
  if (road.width && road.width > 0) return Math.min(40, road.width);
  if (road.kind.endsWith('_link')) return Math.max(3.5, (road.lanes || 1) * 3);
  if (['footway', 'path', 'cycleway', 'pedestrian'].includes(road.kind)) return 2.8;
  if (road.kind === 'service') return 4.8;
  return Math.min(15, Math.max(6, (road.lanes || (road.kind === 'primary' ? 4 : 2)) * 3));
}
/** Reuses shipped OSM roads, sidewalk margins, building footprints and water holes. */
export function createCityWorld(extracts: CityWorldExtracts): CityWorld {
  const datasets = [extracts.kecun, extracts.riverside, extracts.pazhou];
  for (const map of datasets) if (map.origin.length !== 2 || map.origin.some((n, i) => n !== GUANGZHOU_COOP_ORIGIN[i]))
    throw new Error('广州城市合作地图坐标原点不一致');
  const nodes = new Map<number, CityPoint>(), buildings = new Map<number, CityBuilding>();
  for (const map of [...datasets].reverse()) {
    for (const [id, x, z] of map.nodes) if (id !== undefined && Number.isFinite(x) && Number.isFinite(z)) nodes.set(id, { x: x!, z: z! });
    for (const b of map.buildings) if (b.outline.length >= 3) buildings.set(b.id, { id: b.id, outline: b.outline, height: b.height ?? (b.levels ? b.levels * 3.4 : 12) });
  }
  let sourceRoads: CityMapExtract['roads'][number][] = [];
  for (const map of datasets) {
    const replaced = new Set(map.replaceRoadIds ?? []);
    sourceRoads = sourceRoads.filter(r => !replaced.has(r.id)).concat(map.roads);
  }
  return createCityWorldFromMap({ ...extracts.kecun,
    nodes: [...nodes].map(([id, point]) => [id, point.x, point.z]), roads: sourceRoads,
    buildings: [...buildings.values()], waters: extracts.pazhou.waters ?? extracts.riverside.waters ?? [],
  });
}

/** Project combat collision from the assembled city used by the district renderer.
 * The authority consumes plain map geometry; it never builds a second scene.
 */
export function createCityWorldFromMap(map: CityMapExtract): CityWorld {
  if (map.origin.length !== 2 || map.origin.some((n, i) => n !== GUANGZHOU_COOP_ORIGIN[i]))
    throw new Error('广州城市合作地图坐标原点不一致');
  const nodes = new Map<number, CityPoint>();
  for (const [id, x, z] of map.nodes) if (id !== undefined && Number.isFinite(x) && Number.isFinite(z)) nodes.set(id, { x: x!, z: z! });
  const buildings = map.buildings.filter(building => building.outline.length >= 3).map(building => ({
    id: building.id, outline: building.outline, height: building.height ?? (building.levels ? building.levels * 3.4 : 12),
  }));
  const roads: CityRoad[] = [], seen = new Set<string>();
  for (const road of map.roads) {
    const key = `${road.id}:${road.nodes.join(',')}`;
    if (seen.has(key) || !road.rideable || road.tunnel || (road.layer ?? 0) !== 0
      || road.heights?.some(y => Math.abs(y) > .3)) continue;
    seen.add(key);
    for (let i = 1; i < road.nodes.length; i++) {
      const a = nodes.get(road.nodes[i - 1]!), b = nodes.get(road.nodes[i]!);
      if (a && b && Math.hypot(a.x - b.x, a.z - b.z) > .05) roads.push({ a, b, width: roadWidth(road), bridge: !!road.crossing, roadId: road.id });
    }
  }
  if (!roads.length) throw new Error('广州城市地图缺少可步行地面道路');
  const [first, second] = GUANGZHOU_COOP_SPAWN_SEGMENT;
  const world: CityWorld = {
    id: 'guangzhou-city-coop-v1', roads, buildings, waters: map.waters ?? [],
    bounds: { minX: Math.min(...roads.flatMap(r => [r.a.x, r.b.x])) - 24,
      maxX: Math.max(...roads.flatMap(r => [r.a.x, r.b.x])) + 24,
      minZ: Math.min(...roads.flatMap(r => [r.a.z, r.b.z])) - 24,
      maxZ: Math.max(...roads.flatMap(r => [r.a.z, r.b.z])) + 24 },
    spawn: { x: first[0], z: first[1], yaw: Math.atan2(first[0] - second[0], first[1] - second[1]) },
    scooterParking: CITY_SCOOTER_PARKING_SITES,
  };
  if (!isCityWalkable(world, world.spawn)) throw new Error('城市合作出生点不在有效地面道路上');
  return world;
}

const CELL = 32;
interface Index { roads: Map<string, CityRoad[]>; buildings: Map<string, CityBuilding[]>; waters: Map<string, CityWater[]> }
const indexes = new WeakMap<CityWorld, Index>();
const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
function indexBox<T>(grid: Map<string, T[]>, item: T, minX: number, minZ: number, maxX: number, maxZ: number) {
  for (let x = Math.floor(minX / CELL); x <= Math.floor(maxX / CELL); x++) for (let z = Math.floor(minZ / CELL); z <= Math.floor(maxZ / CELL); z++) {
    const k = `${x},${z}`, bucket = grid.get(k) ?? []; bucket.push(item); grid.set(k, bucket);
  }
}
function getIndex(world: CityWorld): Index {
  const existing = indexes.get(world); if (existing) return existing;
  const result: Index = { roads: new Map(), buildings: new Map(), waters: new Map() };
  for (const road of world.roads) { const pad = road.width / 2 + 2.5;
    indexBox(result.roads, road, Math.min(road.a.x, road.b.x) - pad, Math.min(road.a.z, road.b.z) - pad,
      Math.max(road.a.x, road.b.x) + pad, Math.max(road.a.z, road.b.z) + pad);
  }
  for (const b of world.buildings) indexBox(result.buildings, b,
    Math.min(...b.outline.map(p => p[0]!)) - 1, Math.min(...b.outline.map(p => p[1]!)) - 1,
    Math.max(...b.outline.map(p => p[0]!)) + 1, Math.max(...b.outline.map(p => p[1]!)) + 1);
  for (const w of world.waters) indexBox(result.waters, w,
    Math.min(...w.outline.map(p => p[0]!)) - 1, Math.min(...w.outline.map(p => p[1]!)) - 1,
    Math.max(...w.outline.map(p => p[0]!)) + 1, Math.max(...w.outline.map(p => p[1]!)) + 1);
  indexes.set(world, result); return result;
}
export function isCityWalkable(world: CityWorld, point: CityPoint, radius: number = CITY_RULES.playerRadius) {
  const { bounds } = world;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z) || point.x - radius < bounds.minX || point.x + radius > bounds.maxX
    || point.z - radius < bounds.minZ || point.z + radius > bounds.maxZ) return false;
  const index = getIndex(world), k = key(point.x, point.z);
  if (index.buildings.get(k)?.some(b => polygonTouches(point, b.outline, radius))) return false;
  const roads = index.roads.get(k);
  // Most samples are on dry land: one supporting road is enough. Only scan for
  // the narrower bridge deck when a water polygon actually blocks the point.
  if (!roads?.some(r => citySegmentDistance(point, r.a, r.b) <= r.width / 2 + 2 - radius)) return false;
  if (index.waters.get(k)?.some(w => polygonTouches(point, w.outline, radius) && !w.holes.some(h => inPolygon(point, h)))
    && !roads.some(r => r.bridge && citySegmentDistance(point, r.a, r.b) <= r.width / 2 - radius)) return false;
  return true;
}
/** Bounded identical movement for local prediction and authoritative collision. */
export function moveCityPlayer(world: CityWorld, position: CityPoint, moveX: number, moveZ: number, dt: number,
  speed: number = CITY_RULES.movementSpeed, radius: number = CITY_RULES.playerRadius): CityPoint {
  const length = Math.hypot(moveX, moveZ);
  if (!Number.isFinite(length) || !Number.isFinite(dt) || !Number.isFinite(speed) || !length || dt <= 0) return { x: position.x, z: position.z };
  const distance = Math.min(.25, dt) * Math.max(0, Math.min(12, speed)), steps = Math.max(1, Math.ceil(distance / .15));
  const dx = moveX / Math.max(1, length) * distance / steps, dz = moveZ / Math.max(1, length) * distance / steps;
  let p = { x: position.x, z: position.z };
  for (let i = 0; i < steps; i++) {
    const next = { x: p.x + dx, z: p.z + dz };
    if (isCityWalkable(world, next, radius)) p = next;
    else if (isCityWalkable(world, { x: p.x + dx, z: p.z }, radius)) p.x += dx;
    else if (isCityWalkable(world, { x: p.x, z: p.z + dz }, radius)) p.z += dz;
  }
  return p;
}
export function cityLineWalkable(world: CityWorld, a: CityPoint, b: CityPoint, radius: number = CITY_RULES.zombieRadius) {
  const count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .3);
  for (let i = 1; i <= count; i++) if (!isCityWalkable(world, { x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count }, radius)) return false;
  return true;
}
/** First real building intersection along the shot, including footprints and height. */
export function cityBuildingRayDistance(world: CityWorld, origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, range: number) {
  const index = getIndex(world), candidates = new Set<CityBuilding>();
  const end = { x: origin.x + direction.x * range, z: origin.z + direction.z * range };
  for (let x = Math.floor(Math.min(origin.x, end.x) / CELL); x <= Math.floor(Math.max(origin.x, end.x) / CELL); x++)
    for (let z = Math.floor(Math.min(origin.z, end.z) / CELL); z <= Math.floor(Math.max(origin.z, end.z) / CELL); z++)
      for (const b of index.buildings.get(`${x},${z}`) ?? []) candidates.add(b);
  let nearest = range;
  for (const b of candidates) {
    const distances: number[] = [];
    if (inPolygon(origin, b.outline)) distances.push(0);
    if (Math.abs(direction.y) > 1e-9) for (const height of [0, b.height]) {
      const t = (height - origin.y) / direction.y;
      if (t >= 0 && t <= range && inPolygon({ x: origin.x + direction.x * t, z: origin.z + direction.z * t }, b.outline)) distances.push(t);
    }
    for (let i = 0; i < b.outline.length; i++) {
      const a = b.outline[i]!, next = b.outline[(i + 1) % b.outline.length]!;
      const ex = next[0]! - a[0]!, ez = next[1]! - a[1]!, det = direction.x * ez - direction.z * ex;
      if (Math.abs(det) < 1e-9) continue;
      const px = a[0]! - origin.x, pz = a[1]! - origin.z;
      const t = (px * ez - pz * ex) / det, u = (px * direction.z - pz * direction.x) / det;
      if (t >= 0 && t <= range && u >= 0 && u <= 1) distances.push(t);
    }
    for (const t of distances) if (origin.y + direction.y * t >= 0 && origin.y + direction.y * t <= b.height) nearest = Math.min(nearest, t);
  }
  return nearest;
}
/** Local road candidates for zombie spawning without scanning the entire city every tick. */
export function cityNearbyRoads(world: CityWorld, point: CityPoint, distance = 40) {
  const index = getIndex(world), result = new Set<CityRoad>();
  for (let x = Math.floor((point.x - distance) / CELL); x <= Math.floor((point.x + distance) / CELL); x++)
    for (let z = Math.floor((point.z - distance) / CELL); z <= Math.floor((point.z + distance) / CELL); z++)
      for (const road of index.roads.get(`${x},${z}`) ?? []) result.add(road);
  return [...result];
}
