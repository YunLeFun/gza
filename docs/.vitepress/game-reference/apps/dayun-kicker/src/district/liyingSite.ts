import data from "../config/district/liyingReference.json";
import { inPolygon, projectCoordinate, type DistrictBuilding, type DistrictMap, type DistrictSite, type Point } from "./map";
import type { StreetSite } from "./streets";

export const LIYING_BUILDING_IDS = [543819178, 369922823, 543819176, 543831480] as const;
export interface LiyingBuildingExtract {
  origin: number[];
  source: { attribution: string; license: string; url: string; retrievedAt: string; sha256: string;
    elements: { id: number; version: number; timestamp: string }[] };
  buildings: DistrictBuilding[];
  entrances: { id: number; buildingId: number; point: number[] }[];
  sites: DistrictSite[];
}

/** Apply fresh mapped footprints to rendering, physics, street clearance and the
 * map together. The building-only extract cannot overwrite roads or river data.
 */
export function withLiyingBuildings(map: DistrictMap, extract: LiyingBuildingExtract = data): DistrictMap {
  const coordinate = (p: number[]) => {
    const lon = extract.origin[0]! + p[0]! / (111320 * Math.cos(extract.origin[1]! * Math.PI / 180));
    const lat = extract.origin[1]! - p[1]! / 111320;
    return { lon, lat };
  };
  const reproject = (p: number[]) => {
    const { lon, lat } = coordinate(p);
    const q = projectCoordinate(map.origin, lon, lat); return [q.x, q.z];
  };
  const buildings = new Map(map.buildings.map(b => [b.id, b]));
  for (const b of extract.buildings) buildings.set(b.id, { ...b, outline: b.outline.map(reproject) });
  const points = extract.buildings.flatMap(b => b.outline.map(coordinate));
  const bbox = [Math.min(map.bbox[0]!, ...points.map(p => p.lon)), Math.min(map.bbox[1]!, ...points.map(p => p.lat)),
    Math.max(map.bbox[2]!, ...points.map(p => p.lon)), Math.max(map.bbox[3]!, ...points.map(p => p.lat))];
  const sites = new Map((map.sites ?? []).map(site => [site.id, site]));
  for (const site of extract.sites) sites.set(site.id, { ...site, outline: site.outline.map(reproject) });
  return { ...map, bbox, buildings: [...buildings.values()], sites: [...sites.values()], liyingSource: extract.source };
}

export interface LiyingTower extends Point {
  width: number; depth: number; floors: number; height: number; style: "blue-core" | "rose-balconies" | "ochre-office";
}

/** Ground outlines and three tagged podium levels are OSM data. Upper massing,
 * setbacks and heights are photo-based art estimates, not additional OSM ways.
 * Keep those upper parts inside their mapped base; no invented ground footprints.
 */
export function liyingLayout(map: DistrictMap) {
  return LIYING_BUILDING_IDS.flatMap((id, index) => {
    const building = map.buildings.find(b => b.id === id);
    if (!building) return [];
    const xs = building.outline.map(p => p[0]!), zs = building.outline.map(p => p[1]!);
    const left = Math.min(...xs), right = Math.max(...xs), north = Math.min(...zs), south = Math.max(...zs);
    const podiumHeight = building.height ?? (building.levels ?? 3) * 4.8;
    const towers: LiyingTower[] = [];
    const tower = (fraction: number, width: number, floors: number, style: LiyingTower["style"]) => {
      const depth = Math.min(22, south - north - 6);
      towers.push({ x: left + (right - left) * fraction, z: (north + south) / 2 + .7, width,
        depth, floors, height: floors * (style === "ochre-office" ? 2.85 : 2.95), style });
    };
    if (index === 1) [22, 26, 24].forEach((floors, i) => tower(.15 + i * .35, 25, floors, "blue-core"));
    if (index === 2) tower(.8, 30, 26, "ochre-office");
    if (index === 3) [20, 22, 20].forEach((floors, i) => tower(.17 + i * .33, 25, floors, "rose-balconies"));
    return [{ id, zone: ["A", "B", "C", "D"][index]!, building, left, right, north, south, podiumHeight, towers }];
  });
}

/** Stone forecourt follows the mapped retail boundary. Roads retain priority
 * over this paving in both the material mask and the rider surface query.
 */
export function liyingForecourts(map: DistrictMap) {
  return (map.sites ?? []).filter(s => s.id === 15927569 && s.type === "retail")
    .map(site => ({ outline: site.outline, surface: "stone" as const }));
}

/** Mature trees and swept-arm lamps are visible in the street photographs.
 * Their spacing is an art estimate; the shared planner rejects any placement
 * touching a mapped road, building or existing fixture.
 */
export function liyingFurniture(map: DistrictMap): StreetSite[] {
  if (!map.liyingSource) return [];
  const courts = liyingForecourts(map), result: StreetSite[] = [];
  for (const zone of liyingLayout(map)) {
    for (let x = zone.left + 8; x < zone.right - 5; x += 16) {
      const p = { x, z: zone.north - 5.5 };
      if (courts.some(c => inPolygon(p, c.outline))) result.push({ ...p, kind: "tree", yaw: 0, radius: 1.1, campus: false, treeKind: "broadleaf", treeScale: 1.55 });
    }
    for (let x = zone.left + 15; x < zone.right - 5; x += 38) {
      const p = { x, z: zone.north - 3.5 };
      if (courts.some(c => inPolygon(p, c.outline))) result.push({ ...p, kind: "lamp", yaw: 0, radius: .3, campus: false, lampStyle: "swept" });
    }
  }
  return result;
}
