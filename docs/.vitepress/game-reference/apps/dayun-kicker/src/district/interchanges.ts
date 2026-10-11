import type { DistrictMap, DistrictRoad } from "./map";

export interface InterchangeExtract {
  origin: number[]; bbox: number[]; nodes: number[][]; roads: DistrictRoad[]; cutouts: number[][][];
  source: { attribution: string; license: string; url: string; elevationPolicy: string; structureReference: string };
}

/** Replace only source way IDs; geometric crossings never become junctions. */
export function withInterchanges(map: DistrictMap, extract: InterchangeExtract): DistrictMap {
  if (map.interchangesSource) return map;
  if (map.origin.some((v, i) => v !== extract.origin[i])) throw new Error("立交地图坐标原点不一致");
  const ids = new Set(extract.roads.map(r => r.id));
  const nodes = [...new Map([...map.nodes, ...extract.nodes].map(n => [n[0], n])).values()];
  const roads = [...map.roads.filter(r => !ids.has(r.id)).map(r => ({ ...r, nodes: [...r.nodes] })), ...extract.roads];
  const interchangeEntries = [
    ["kecun-interchange-ring", "客村立交 · 环岛上桥", 440557543],
    ["kecun-interchange-overpass", "客村立交 · 上层跨线桥入口", 403889989],
  ].flatMap(([id, name, way]) => {
    const road = roads.find(r => r.id === way), node = road && nodes.find(n => n[0] === road.nodes[0]);
    return node ? [{ id: String(id), name: String(name), x: node[1]!, z: node[2]!, height: node[3] ?? 0 }] : [];
  });
  return { ...map, bbox: map.bbox.map((v, i) => i < 2 ? Math.min(v, extract.bbox[i]!) : Math.max(v, extract.bbox[i]!)), nodes, roads,
    groundCutouts: extract.cutouts, interchangesSource: extract.source, interchangeEntries };
}
