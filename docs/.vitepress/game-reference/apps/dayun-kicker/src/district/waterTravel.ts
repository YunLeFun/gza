import { createRoadNetwork, distance, inPolygon, inWater, projectCoordinate, roadWidth, type DistrictMap, type Point } from "./map";
import { districtBridgeDecks, sampleBridgeDeck } from "./bridgeDecks";
import { getTitSiteLayout } from "./titSite";
import { tencentForecourtLayout } from "./tencentForecourtSite";

export const RIVER_WATER_Y = -1.6;
export const RIVER_RIDE_Y = RIVER_WATER_Y - 0.15;
export type WaterKind = "pool" | "river" | null;
export interface RiverAccess {
  id: string; name: string; shore: Point; land: Point; end: Point; normal: Point; width: number;
}
function projection(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (length * length || 1)));
  const point = { x: a.x + dx * t, z: a.z + dz * t };
  return { ...point, distance: distance(p, point), length, dx, dz };
}

/** Two clearly marked game access ramps; these are not surveyed facilities. */
export function riverAccesses(map: DistrictMap): RiverAccess[] {
  const decks = districtBridgeDecks(map), accesses: RiverAccess[] = [];
  const anchors = [
    { id: "haixin-water-entry", name: "珠江 · 海心桥下水坡道", bridge: "haixin-bridge", lon: 113.3127, lat: 23.1094 },
    { id: "guangzhou-water-entry", name: "珠江 · 广州大桥下水坡道", bridge: "guangzhou-bridge", lon: 113.31088, lat: 23.10942 },
  ];
  for (const anchor of anchors) {
    if (!map.bridges?.some(b => b.id === anchor.bridge)) continue;
    const target = projectCoordinate(map.origin, anchor.lon, anchor.lat), candidates: (RiverAccess & { score: number })[] = [];
    for (const water of map.waters ?? []) for (const ring of [water.outline, ...water.holes]) for (let i = 0; i < ring.length; i++) {
      const a = { x: ring[i]![0]!, z: ring[i]![1]! }, b = { x: ring[(i + 1) % ring.length]![0]!, z: ring[(i + 1) % ring.length]![1]! };
      const p = projection(target, a, b); if (p.length < 10 || p.distance > 180) continue;
      // Keep a full-width ramp away from corners in the shoreline.
      const along = Math.max(5, Math.min(p.length - 5, ((p.x - a.x) * p.dx + (p.z - a.z) * p.dz) / p.length));
      const shore = { x: a.x + p.dx / p.length * along, z: a.z + p.dz / p.length * along };
      let normal = { x: p.dz / p.length, z: -p.dx / p.length };
      if (!inWater({ x: shore.x + normal.x, z: shore.z + normal.z }, map)) normal = { x: -normal.x, z: -normal.z };
      const land = { x: shore.x - normal.x * 3, z: shore.z - normal.z * 3 }, end = { x: shore.x + normal.x * 8, z: shore.z + normal.z * 8 };
      if (inWater(land, map) || !inWater(end, map) || sampleBridgeDeck(decks, shore) || accesses.some(e => distance(e.shore, shore) < 40)) continue;
      if (map.buildings.some(building => [land, shore, end].some(point => inPolygon(point, building.outline)
        || building.outline.some((v, n) => projection(point, { x: v[0]!, z: v[1]! }, { x: building.outline[(n + 1) % building.outline.length]![0]!, z: building.outline[(n + 1) % building.outline.length]![1]! }).distance < 4)))) continue;
      candidates.push({ id: anchor.id, name: anchor.name, shore, normal, land, end, width: 6, score: distance(shore, target) });
    }
    const best = candidates.sort((a, b) => a.score - b.score)[0]; if (best) accesses.push(best);
  }
  return accesses;
}

/** Connect only the dry approach to navigation; river travel stays free-form. */
export function withWaterAccessRoutes(map: DistrictMap): DistrictMap {
  if (map.roads.some(r => r.id === -9_200_000)) return map;
  const entries = riverAccesses(map); if (!entries.length) return map;
  const network = createRoadNetwork(map, false), nodes = map.nodes.map(n => [...n]), roads = map.roads.map(r => ({ ...r, nodes: [...r.nodes] }));
  entries.forEach((entry, index) => {
    const snap = network.nearest(entry.land, true, true), nodeId = -9_300_000 - index * 2;
    if (snap.distance > 60) return;
    const junction = snap.t < 0.001 ? snap.edge.a : snap.t > 0.999 ? snap.edge.b : nodeId;
    if (junction === nodeId) {
      nodes.push([junction, snap.x, snap.z]);
      for (const road of roads) for (let n = road.nodes.length - 1; n > 0; n--)
        if (road.nodes[n - 1] === snap.edge.a && road.nodes[n] === snap.edge.b || road.nodes[n - 1] === snap.edge.b && road.nodes[n] === snap.edge.a) road.nodes.splice(n, 0, junction);
    }
    nodes.push([nodeId - 1, entry.land.x, entry.land.z]);
    roads.push({ id: -9_200_000 - index, name: "下水坡道入口", kind: "cycleway", lanes: 1, oneWay: 0, rideable: true, width: 3, nodes: [junction, nodeId - 1] });
  });
  return { ...map, nodes, roads };
}

/** Bridge surfaces win over water; islands and triangular pool corners stay dry. */
export function createWaterTravel(map: DistrictMap) {
  const forecourt = tencentForecourtLayout(map);
  const pools = getTitSiteLayout(map)?.pools ?? [], decks = districtBridgeDecks(map), accesses = riverAccesses(map);
  const nodes = new Map(map.nodes.map(([id, x, z]) => [id!, { x: x!, z: z! }]));
  const flatBridges = map.roads.filter(r => r.bridge && r.rideable && r.id > 0 && !r.heights).flatMap(road => road.nodes.slice(1).map((id, i) => ({
    a: nodes.get(road.nodes[i]!)!, b: nodes.get(id)!, width: roadWidth(road), name: road.name,
  })));
  const waterBounds = (map.waters ?? []).map(water => ({ water,
    left: Math.min(...water.outline.map(p => p[0]!)), right: Math.max(...water.outline.map(p => p[0]!)),
    top: Math.min(...water.outline.map(p => p[1]!)), bottom: Math.max(...water.outline.map(p => p[1]!)),
  }));
  function sample(p: Point, referenceHeight = Infinity): { height: number; waterKind: WaterKind; waterY: number; bridgeName?: string } {
    const deck = sampleBridgeDeck(decks, p, referenceHeight);
    if (deck) return { height: deck.height, waterKind: null, waterY: 0, bridgeName: deck.deck.name };
    // A ground rider keeps the flat canal crossing. A rider already in the
    // water can travel under it instead of jumping onto its deck.
    if (referenceHeight >= -0.65) for (const b of flatBridges) if (projection(p, b.a, b.b).distance <= b.width / 2) return { height: 0, waterKind: null, waterY: 0, bridgeName: b.name };
    const terraceHeight = forecourt?.heightAt(p);
    if (terraceHeight != null) return { height: terraceHeight, waterKind: null, waterY: 0 };
    for (const pool of pools) {
      const inside = inPolygon(p, pool.outline);
      const edge = Math.min(...pool.outline.map((a, i) => {
        const b = pool.outline[(i + 1) % pool.outline.length]!;
        return projection(p, { x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! }).distance;
      }));
      if (!inside && edge > 0.65) continue;
      const height = inside ? pool.rimHeight + (pool.bottomY - pool.rimHeight) * Math.min(1, edge / 0.8)
        : pool.rimHeight * Math.max(0, 1 - edge / 0.65);
      return { height, waterKind: inside ? "pool" : null, waterY: pool.waterY };
    }
    const wet = waterBounds.some(({ water, left, right, top, bottom }) => p.x >= left && p.x <= right && p.z >= top && p.z <= bottom
      && inPolygon(p, water.outline) && !water.holes.some(h => inPolygon(p, h)));
    if (!wet) return { height: 0, waterKind: null, waterY: 0 };
    for (const entry of accesses) {
      const dx = p.x - entry.shore.x, dz = p.z - entry.shore.z;
      const along = dx * entry.normal.x + dz * entry.normal.z, across = dx * entry.normal.z - dz * entry.normal.x;
      if (along >= -0.02 && along <= 8 && Math.abs(across) < entry.width / 2 + 0.12)
        return { height: RIVER_RIDE_Y * Math.max(0, along / 8), waterKind: "river", waterY: RIVER_WATER_Y };
    }
    return { height: RIVER_RIDE_Y, waterKind: "river", waterY: RIVER_WATER_Y };
  }
  return { sample, accesses };
}
