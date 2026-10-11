import type { DistrictBuilding, DistrictMap, DistrictRoad, DistrictSite, DistrictWater } from "./map";

export interface DistrictInfillExtract {
  origin: number[]; bbox: number[]; nodes: number[][]; roads: DistrictRoad[];
  buildings: DistrictBuilding[]; sites: DistrictSite[]; waters: DistrictWater[];
  source: {
    attribution: string; license: string; url: string; retrievedAt: string;
    inputs: { file: string; url: string; sha256: string; retrievedAt: string }[];
    elements: { type: string; id: number; version: number; timestamp: string }[];
  };
}

/** Fill the loaded rectangle before applying authored bridge/interchange adapters. */
export function withDistrictInfill(map: DistrictMap, extract: DistrictInfillExtract): DistrictMap {
  if (map.origin.some((value, index) => value !== extract.origin[index])) throw new Error("街区补全地图坐标原点不一致");
  const nodes = new Map([...extract.nodes, ...map.nodes].map(node => [node[0], node]));
  const buildings = new Map([...extract.buildings, ...map.buildings].map(building => [building.id, building]));
  const sites = new Map([...extract.sites, ...(map.sites ?? [])].map(site => [site.id, site]));
  const key = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(",");
  const edges = new Set(map.roads.flatMap(road => road.nodes.slice(1).map((id, i) => key(road.nodes[i]!, id))));
  const roads = [...map.roads];
  for (const road of extract.roads) {
    let run: number[] = [], heights: number[] = [];
    const flush = () => { if (run.length > 1) roads.push({ ...road, nodes: run, ...(road.heights ? { heights } : {}) }); run = []; heights = []; };
    for (let i = 1; i < road.nodes.length; i++) {
      const a = road.nodes[i - 1]!, b = road.nodes[i]!, edge = key(a, b);
      if (edges.has(edge)) { flush(); continue; }
      if (!run.length) { run.push(a); if (road.heights) heights.push(road.heights[i - 1]!); }
      run.push(b); if (road.heights) heights.push(road.heights[i]!); edges.add(edge);
    }
    flush();
  }
  return { ...map, nodes: [...nodes.values()], roads, buildings: [...buildings.values()], sites: [...sites.values()],
    bbox: map.bbox.map((value, i) => i < 2 ? Math.min(value, extract.bbox[i]!) : Math.max(value, extract.bbox[i]!)),
    waters: extract.waters, infillSource: extract.source };
}
