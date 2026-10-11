import { inPolygon, type DistrictBuilding, type DistrictMap, type Point } from "./map";
import { vipshopLayout } from "./vipshopLayout";

/** Hand-authored art observations, separate from the ODbL road/footprint extract.
 * Consumer-map positions were converted from BD09 to WGS84 and cross-checked
 * against streets. Park planting and facade details are approximate, not survey data.
 */
export const DISTRICT_PLACES = [
  { id: "mcdonalds", name: "麦当劳 · 艺苑路创意园", lon: 113.318376, lat: 23.100782, building: 475115790 },
  { id: "liyuan", name: "丽园雅庭", lon: 113.3200595, lat: 23.1001597, building: 1075555248 },
  { id: "tit-garden", name: "TIT 入口小花园", lon: 113.31886, lat: 23.10029 },
  { id: "chigang-park", name: "赤岗塔公园", lon: 113.31786, lat: 23.10372, building: 1336813586 },
  { id: "pagoda", name: "赤岗塔", lon: 113.317341, lat: 23.104342, building: 1336813586 },
  { id: "art-museum", name: "广州艺术博物院", lon: 113.32075, lat: 23.10320, building: 847909993 },
] as const;

/** Bridge symbols mark the structures; navigation targets stay on the south bank. */
export const RIVERSIDE_PLACES = [
  { id: "haixin-bridge", name: "海心桥", lon: 113.31362, lat: 23.11081, viewLon: 113.3127, viewLat: 23.1094 },
  { id: "guangzhou-bridge", name: "广州大桥", lon: 113.31013, lat: 23.11192, viewLon: 113.31088, viewLat: 23.10942 },
] as const;

export interface ParkPath { points: number[][]; width: number; surface: "brick" | "stone" }
export interface DistrictPark {
  id: string; name: string; outline: number[][]; lawns: number[][][]; paths: ParkPath[];
}

export interface LandmarkBarrier extends Point { width: number; depth: number; height: number; yaw?: number; destructibleId?: string; destructibleKind?: "sign" | "signal"; name?: string }
export const PARK_SIGNS = [{ id: "tit-garden", x: -91, z: -93, row: 4 }, { id: "chigang-park", x: -181, z: -470, row: 2 }] as const;

export const LIYUAN_BUILDING_ID = 1075555248;
export type LiyuanBlockId = "A" | "B" | "C" | "D" | "E";
export interface LiyuanBlock extends Point { id: LiyuanBlockId; width: number; depth: number; outline: number[][] }
const liyuanBlocks: ReadonlyArray<readonly [LiyuanBlockId, number, number, number, number]> = [
  ["A", 142, -83, 22, 18], ["B", 141, -108, 22, 17], ["C", 113, -108, 24, 17],
  ["D", 85, -108, 22, 17], ["E", 85, -83, 22, 18],
];
const artOffset = (map: DistrictMap): Point => ({ x: (113.3196 - map.origin[0]!) * 111320 * Math.cos(map.origin[1]! * Math.PI / 180), z: (map.origin[1]! - 23.0995) * 111320 });

/** User-supplied: 17 floors, A–E, central C, northwest D, odd-floor A/B and D/E
 * corridors, basement parking and a circular garden with an open centre.
 * North-up assignment and dimensions are an art reconstruction, not survey data.
 * The original OSM compound boundary remains untouched in the map extract.
 */
export function getLiyuanLayout(map: DistrictMap) {
  const offset = artOffset(map), point = (x: number, z: number) => ({ x: x + offset.x, z: z + offset.z });
  const rectangle = (x: number, z: number, width: number, depth: number) => [
    [x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2],
    [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2],
  ];
  const blocks: LiyuanBlock[] = liyuanBlocks.map(([id, x, z, width, depth]) => {
    const p = point(x, z); return { id, ...p, width, depth, outline: rectangle(p.x, p.z, width, depth) };
  });
  const floors = Array.from({ length: 17 }, (_, i) => ({ number: i + 1, bottom: 3.2 + i * 2.8, windowY: 4.55 + i * 2.8 }));
  const pairs = [{ pair: "DE", north: "D", south: "E" }, { pair: "AB", north: "B", south: "A" }] as const;
  const corridors = pairs.flatMap(({ pair, north: northId, south: southId }) => {
    const northBlock = blocks.find(b => b.id === northId)!, southBlock = blocks.find(b => b.id === southId)!;
    const north = northBlock.z + northBlock.depth / 2, south = southBlock.z - southBlock.depth / 2;
    // A/B centres differ by one metre; this shared span still lands fully inside
    // both facades instead of pretending the two block centres are aligned.
    return floors.filter(f => f.number % 2 === 1).map(f => ({ pair, floor: f.number, y: f.bottom,
      x: (northBlock.x + southBlock.x) / 2, z: (north + south) / 2, width: 4.2, depth: south - north }));
  });
  const garden = { ...point(114, -85), radius: 8.3, openRadius: 4.5 };
  const lawns = Array.from({ length: 4 }, (_, quadrant) => {
    const arc = (radius: number, reverse = false) => Array.from({ length: 9 }, (_, i) => {
      const angle = quadrant * Math.PI / 2 + 0.15 + (reverse ? 8 - i : i) / 8 * (Math.PI / 2 - 0.3);
      return [garden.x + Math.cos(angle) * radius, garden.z + Math.sin(angle) * radius];
    });
    return [...arc(garden.radius), ...arc(garden.openRadius, true)];
  });
  const gate = { ...point(114, -71), width: 25, height: 4.4 };
  const garage = { ...point(85, -73.88), width: 6.4, height: 2.75, approach: point(85, -66), navigableUnderground: false as const };
  const d = blocks.find(block => block.id === "D")!;
  // The user identifies the photo as D-201. The second-floor height and look
  // toward the garden are a reference pose, not a surveyed unit orientation.
  const photoView = { id: "d201", name: "D 栋 201 阳台参考视角", position: { x: d.x + 7.5, y: floors[1]!.windowY + 0.84, z: d.z + d.depth / 2 + 1.05 },
    target: { x: garden.x, y: 4.5, z: garden.z } };
  // The eight user night photographs establish these uses and silhouettes.
  // Positions follow the existing art layout; dimensions are photo estimates.
  const activitySpaces = blocks.filter(b => ["B", "C", "D"].includes(b.id)).map(b => ({
    block: b.id, name: b.id === "C" ? "居民活动空间" : b.id === "D" ? "棋牌室" : "乒乓球室",
    x: b.x, z: b.z + b.depth / 2 + 1.25, width: b.width - 3, depth: 2.5, height: 3.05,
  }));
  const e = blocks.find(b => b.id === "E")!;
  const parcelShop = { x: e.x + e.width / 2 + 1.15, z: e.z + 4, width: 2.3, depth: 5.2, height: 2.85 };
  const colonnade = { ...garden, radius: 8, start: -1.2, sweep: 2.4,
    columns: [-1.2, -.72, -.24, .24, .72, 1.2].map(a => ({ x: garden.x + Math.cos(a) * 8, z: garden.z + Math.sin(a) * 8 })) };
  const exit = {
    booth: { ...point(105.5, -70.2), width: 2.6, depth: 2.5, height: 2.8 },
    machine: { ...point(110, -70.5), width: .55, depth: .7, height: 1.15 },
    charging: { ...point(123, -69), width: 14, depth: 2.5, height: 2.6 },
    palms: [-108, -95, -82, -68].map((z, i) => ({ ...point(72.8 + i % 2 * .2, z), scale: 1 + i % 2 * .08 })),
  };
  return { buildingId: LIYUAN_BUILDING_ID, blocks, floors, floorHeight: 2.8, roofHeight: 50.8, corridors, gate, garage,
    photoView, activitySpaces, parcelShop, colonnade, exit,
    garden: { ...garden, lawns, outline: rectangle(garden.x, garden.z, garden.radius * 2 + 3, garden.radius * 2 + 3) },
    courtyard: rectangle(113.5 + offset.x, -92 + offset.z, 87, 58) };
}

/** Render and flat collision use individual blocks, leaving the courtyard and
 * the ground below elevated connections open. Vipshop's F01 occupied blocks
 * replace the upper-floor L footprint for collision and walkable-space queries.
 */
export function districtBuildingOutlines(building: DistrictBuilding, map: DistrictMap): number[][][] {
  if (building.id === LIYUAN_BUILDING_ID) return getLiyuanLayout(map).blocks.map(block => block.outline);
  if ([846152825, 846152826, 846152827].includes(building.id)) {
    const ground = vipshopLayout(map)?.ground.get(building.id); if (ground) return [ground];
  }
  return [building.outline];
}

export function landmarkBarriers(map: DistrictMap): LandmarkBarrier[] {
  const { gate, activitySpaces, colonnade, exit } = getLiyuanLayout(map);
  return [...(map.buildings.some(b => b.id === 1075555248)
    ? [...[-12, 12].map(dx => ({ x: gate.x + dx, z: gate.z, width: 0.9, depth: 0.85, height: gate.height })),
      ...activitySpaces.flatMap(p => [-.5, -1 / 6, 1 / 6, .5].map(t => ({ x: p.x + p.width * t, z: p.z + p.depth / 2 - .2, width: .45, depth: .45, height: p.height }))),
      ...activitySpaces.flatMap(p => [-1, 1].map(side => ({ x: p.x + side * p.width / 3, z: p.z - p.depth / 2 + .55, width: 1.8, depth: .52, height: 1.05 }))),
      ...colonnade.columns.map(p => ({ ...p, width: .64, depth: .64, height: 3.4 })),
      exit.booth, exit.machine,
      ...[[gate.x - 12, exit.booth.x - exit.booth.width / 2], [gate.x + 3.5, gate.x + 12]].map(([start, end]) => ({ x: (start! + end!) / 2, z: gate.z, width: end! - start!, depth: .08, height: 2.2 })),
      // Occupied parking stays on the left of the outward lane; the raised
      // barrier and canopy roofs are above the rider and do not block the road.
      { ...exit.charging, height: 1.2 },
    ] : []),
    ...PARK_SIGNS.flatMap(p => [-1.6, 1.6].map(offset => ({ x: p.x + offset, z: p.z, width: 0.12, depth: 0.12, height: 1.9 })))];
}

/** The named Kecun map uses this fixed metre origin. Reproject the art layout
 * when the map origin changes, so rendering, SVG and collision stay aligned.
 */
export function districtParks(map: DistrictMap): DistrictPark[] {
  const offset = artOffset(map);
  const polygon = (points: number[][]) => points.map(([x, z]) => [x! + offset.x, z! + offset.z]);
  const authored = [
    { id: "tit-garden", name: "TIT 入口小花园", outline: [[-106, -96], [-34, -96], [-34, -75], [-106, -75]],
      lawns: [[[-98, -86], [-83, -86], [-83, -79], [-98, -79]], [[-60, -94], [-40, -94], [-40, -81], [-60, -81]]],
      paths: [{ points: [[-114.7, -88], [-37, -88]], width: 3, surface: "brick" }, { points: [[-102, -94], [-102, -78], [-65, -78], [-65, -94]], width: 2.4, surface: "brick" }] },
    { id: "chigang-park", name: "赤岗塔公园", outline: [[-325, -605], [-177, -605], [-165, -450], [-311, -441], [-333, -494]],
      lawns: [[[-325, -605], [-177, -605], [-165, -450], [-311, -441], [-333, -494]]],
      paths: [{ points: [[-140, -472], [-182, -475], [-211, -505], [-220, -526], [-244, -528], [-247, -551], [-225, -556], [-213, -538], [-220, -526]], width: 3.6, surface: "stone" },
        { points: [[-182, -475], [-185, -581], [-302, -583], [-311, -480], [-278, -466], [-182, -475]], width: 3.2, surface: "stone" },
        { points: [[-302, -583], [-270, -559], [-247, -551]], width: 2.8, surface: "stone" }] },
  ].map(park => ({ ...park, outline: polygon(park.outline), lawns: park.lawns.map(polygon), paths: park.paths.map(path => ({ ...path, surface: path.surface as "brick" | "stone", points: polygon(path.points) })) }));
  const nodes = new Map(map.nodes.map(node => [node[0]!, node.slice(1, 3)]));
  const mapped = (map.sites ?? []).filter(site => site.type === "park").map(site => {
    const paths: ParkPath[] = [];
    for (const road of map.roads) {
      if (!road.rideable || !["footway", "path", "pedestrian", "cycleway"].includes(road.kind) || road.layer || road.heights) continue;
      for (let i = 1; i < road.nodes.length; i++) {
        const a = nodes.get(road.nodes[i - 1]!)!, b = nodes.get(road.nodes[i]!)!;
        if (![a, b].every(p => inPolygon({ x: p[0]!, z: p[1]! }, site.outline))) continue;
        paths.push({ points: [a, b], width: road.width ?? (road.kind === "pedestrian" ? 4.2 : 2.4), surface: "stone" });
      }
    }
    return { id: `osm-park-${site.id}`, name: site.name, outline: site.outline, lawns: [site.outline], paths };
  });
  return [...authored, ...mapped];
}
