import type { DistrictBuilding, DistrictMap, DistrictRoad, Point } from "./map";

export const CHEN_CLAN_BUILDING_IDS = Array.from({ length: 9 }, (_, i) => -8_810_000 - i);
export interface ChenClanExtract {
  origin: number[]; bbox: number[]; nodes: number[][]; roads: DistrictRoad[]; buildings: DistrictBuilding[];
  compound: number[][]; plaza: number[][];
  source: { attribution: string; license: string; url: string; capturedAt: string; sourceSha256: string };
}
export interface ChenClanLayout { center: Point; yaw: number; gate: Point; halls: DistrictBuilding[]; compound: number[][] }

/** Three parallel axes and three successive halls, leaving six open courtyards.
 * The enclosing museum polygon is a site, never a solid collision building.
 */
export function chenClanLayout(outline: number[][]): ChenClanLayout {
  const center = { x: outline.reduce((s, p) => s + p[0]!, 0) / outline.length,
    z: outline.reduce((s, p) => s + p[1]!, 0) / outline.length };
  const a = outline[3]!, b = outline[2]!, yaw = Math.atan2(-(b[1]! - a[1]!), b[0]! - a[0]!);
  const point = (x: number, z: number) => ({ x: center.x + Math.cos(yaw) * x + Math.sin(yaw) * z,
    z: center.z - Math.sin(yaw) * x + Math.cos(yaw) * z });
  const halls = CHEN_CLAN_BUILDING_IDS.map((id, i): DistrictBuilding => {
    const x = (i % 3 - 1) * 27, z = (1 - Math.floor(i / 3)) * 31;
    return { id, name: i === 1 ? "陈氏书院 · 南门" : i === 4 ? "聚贤堂" : "陈家祠 · 厢厅", type: "temple",
      height: i === 4 ? 14.5 : 8, outline: [[-11, -6], [11, -6], [11, 6], [-11, 6]].map(([dx, dz]) => {
        const p = point(x + dx!, z + dz!); return [p.x, p.z];
      }) };
  });
  return { center, yaw, halls, compound: outline, gate: point(0, 45) };
}
export function getChenClanLayout(map: DistrictMap) {
  const site = map.sites?.find(site => site.id === 520935699);
  return site ? chenClanLayout(site.outline) : null;
}

export function withChenClan(map: DistrictMap, extract: ChenClanExtract): DistrictMap {
  if (extract.origin.length !== 2 || extract.origin.some((v, i) => v !== map.origin[i])) throw new Error("陈家祠地图坐标原点不一致");
  const site = chenClanLayout(extract.compound);
  const nodes = new Map([...extract.nodes, ...map.nodes].map(node => [node[0]!, node]));
  const roads = [...map.roads], seen = new Set(roads.flatMap(r => r.nodes.slice(1).map((id, i) => [r.nodes[i]!, id].sort((a, b) => a - b).join(","))));
  for (const road of extract.roads) {
    let run: number[] = [];
    const flush = () => { if (run.length > 1) roads.push({ ...road, nodes: run }); run = []; };
    for (let i = 1; i < road.nodes.length; i++) {
      const a = road.nodes[i - 1]!, b = road.nodes[i]!, key = [a, b].sort((x, y) => x - y).join(",");
      if (seen.has(key)) { flush(); continue; }
      if (!run.length) run.push(a); run.push(b); seen.add(key);
    }
    flush();
  }
  // A short authored public approach links the south gate to a mapped path.
  const accessibleIds = new Set(extract.roads.filter(r => r.rideable).flatMap(r => r.nodes));
  const pathNode = extract.nodes.filter(n => accessibleIds.has(n[0]!))
    .sort((a, b) => Math.hypot(a[1]! - site.gate.x, a[2]! - site.gate.z) - Math.hypot(b[1]! - site.gate.x, b[2]! - site.gate.z))[0];
  if (!pathNode) throw new Error("陈家祠缺少公共入口道路");
  nodes.set(-8_820_000, [-8_820_000, site.gate.x, site.gate.z]);
  roads.push({ id: -8_820_000, name: "陈家祠南门 · 恩龙里", kind: "pedestrian", width: 6, lanes: 0, oneWay: 0,
    rideable: true, nodes: [pathNode[0]!, -8_820_000] });
  const buildings = new Map([...extract.buildings, ...map.buildings, ...site.halls].map(b => [b.id, b]));
  return { ...map, nodes: [...nodes.values()], roads, buildings: [...buildings.values()],
    bbox: [Math.min(map.bbox[0]!, extract.bbox[0]!), Math.min(map.bbox[1]!, extract.bbox[1]!), Math.max(map.bbox[2]!, extract.bbox[2]!), Math.max(map.bbox[3]!, extract.bbox[3]!)],
    sites: [...(map.sites ?? []).filter(s => ![520935699, 520935700].includes(s.id)),
      { id: 520935699, name: "陈家祠 · 陈氏书院", type: "heritage", outline: extract.compound },
      { id: 520935700, name: "陈家祠广场", type: "square", outline: extract.plaza }], chenClanSource: extract.source };
}
