import type { DistrictMap, DistrictRoad, Point } from "./map";

/** User-supplied satellite observation (2026-10-07), separate from the OSM extract.
 * The pale square and its small triangular shallow pool are southwest of the
 * conference centre. Dimensions and planting are visual estimates, not surveys.
 * The large dark roof east of the square remains building 1494635891.
 */
export const TIT_CONFERENCE_BUILDING_ID = 1075536925;
export const TIT_WEST_ROAD_ID = -82000001;
const TIT_WEST_NODE_START = -82000100;
const LI_GANG_WAY_ID = 1458929947;
const NORTH_JUNCTION_ID = 4073352766;
const SOUTH_APPROACH_ID = 13380144983;
const SOUTH_BEND_ID = 13380144984;

export interface TitObservedRoad extends DistrictRoad {
  sourceObservation: { reference: "user-satellite-2026-10-07"; labelKind: "observed" | "descriptive"; sourceWayId?: number; sourceName?: string };
}
export interface TitSitePool {
  id: string; outline: number[][]; bottomY: number; waterY: number; rimHeight: number; rimWidth: number;
}
export interface TitSiteLayout {
  plaza: { outline: number[][] };
  pools: TitSitePool[];
  trees: Point[];
  paths: { points: number[][]; width: number }[];
  westRoad: Point[];
  westRoadWidth: number;
}
export interface TitEntranceSolid extends Point {
  width: number; height: number; depth: number; yaw: number;
}
export interface TitWestEntranceLayout {
  reference: "user-west-photo-2026-10-07";
  panels: (TitEntranceSolid & { color: string; pose: number })[];
  sign: TitEntranceSolid;
  bollards: TitEntranceSolid[];
  machines: TitEntranceSolid[];
  fixtures: TitEntranceSolid[];
  apron: number[][];
  reserved: number[][];
}
const westX = 21.5;
// The southern join lies ON the mapped diagonal. Inserting a shared node keeps
// both the road shape and routing continuous instead of making a near-miss T.
const joinT = (westX + 2.29) / (51.7 + 2.29);
const westSouthZ = -1.75 + (-37.51 + 1.75) * joinT;
const offsetFor = (map: DistrictMap) => ({
  x: (113.3196 - map.origin[0]!) * 111320 * Math.cos(map.origin[1]! * Math.PI / 180),
  z: (map.origin[1]! - 23.0995) * 111320,
});

/** The user's west-side street photograph: rainbow figure cutouts north of
 * the Yiyuan Road entrance, with a tall directory and open parking barriers.
 * Poses and dimensions are an art reconstruction, not measured street furniture.
 */
export function getTitWestEntranceLayout(map: DistrictMap): TitWestEntranceLayout | null {
  if (!map.buildings.some(b => b.id === TIT_CONFERENCE_BUILDING_ID)) return null;
  const offset = offsetFor(map);
  const solid = (x: number, z: number, width: number, height: number, depth: number, yaw = 0): TitEntranceSolid =>
    ({ x: x + offset.x, z: z + offset.z, width, height, depth, yaw });
  return {
    reference: "user-west-photo-2026-10-07",
    panels: ["#da3150", "#ff7924", "#f1cd21", "#73c82c", "#13a4a7", "#2598d1", "#a85baf"]
      .map((color, pose) => ({ ...solid(-122.5, -102.5 - pose * 4.7, 2.65, 4.5, .18, -Math.PI / 4), color, pose })),
    // The photographed lettering faces the south approach along Yiyuan Road,
    // rather than facing west across the carriageway. Local +Z is south.
    sign: solid(-122.8, -84.3, 1.7, 7.1, .32),
    bollards: [-94.1, -86].flatMap(z => [-124, -119.5].map(x => solid(x, z, .16, .95, .16))),
    machines: [-94, -85.5].map(z => solid(-121.5, z, .52, 1.15, .65)),
    fixtures: [solid(-120.25, -94, .18, 3.8, .18), solid(-122.1, -83.2, .11, 3.3, .11)],
    apron: [[-126, -133], [-118, -133], [-118, -96], [-114, -96], [-114, -82], [-129, -82], [-129, -96], [-126, -96]]
      .map(([x, z]) => [x! + offset.x, z! + offset.z]),
    reserved: [[-126, -82], [-118, -82], [-118, -133], [-126, -133]].map(([x, z]) => [x! + offset.x, z! + offset.z]),
  };
}

/** Raised arms are above rider height; only the visible bases, directory and
 * equipment occupy the flat physics layer. Keep the original entrance open.
 */
export function titWestEntranceSolids(map: DistrictMap): TitEntranceSolid[] {
  const site = getTitWestEntranceLayout(map);
  if (!site) return [];
  return [site.sign, ...site.bollards, ...site.machines, ...site.fixtures,
    ...site.panels.map(p => ({ ...p, width: 3, height: .48, depth: 1.55 }))];
}

export function getTitSiteLayout(map: DistrictMap): TitSiteLayout | null {
  if (!map.buildings.some(b => b.id === TIT_CONFERENCE_BUILDING_ID)) return null;
  const offset = offsetFor(map);
  const point = (x: number, z: number): Point => ({ x: x + offset.x, z: z + offset.z });
  const outline = (points: number[][]) => points.map(([x, z]) => [x! + offset.x, z! + offset.z]);
  const westRoad = [[-14.47, -154.27], [westX, -154.27], [westX, -96], [24, -48], [westX, westSouthZ]]
    .map(([x, z]) => point(x!, z!));
  const westRoadWidth = 4.2;
  const paths = [
    { points: outline([[-100, -40], [-42, -40], [-36, -31], [-36, 41], [-41, 45], [-100, 45], [-100, -40]]), width: 2.8 },
    { points: outline([[-115.69, 36.11], [-100, 36.11], [-36, 36.11], [-3.53, 36.11]]), width: 3.2 },
  ];
  // The north passage has only about 7.5 m between mapped buildings. Trees go
  // on both sides of the wider southern stretch, never into that narrow gap.
  const trees = [
    ...[-80, -64, -48, -32].flatMap(z => [point(14, z), point(31.5, z)]),
    ...[-38, -20, -2, 16, 40].map(z => point(-108.5, z)),
    ...[-39, -18, 5, 26, 44].map(z => point(-26, z)),
  ];
  return {
    plaza: { outline: outline([[-104, -44], [-38, -44], [-32, -35], [-32, 43], [-39, 49], [-104, 49]]) },
    pools: [{ id: "tit-south-triangle-pool", outline: outline([[-68, 10], [-44, 22], [-52, -3]]),
      bottomY: -.2, waterY: -.035, rimHeight: .16, rimWidth: .36 }],
    trees, paths, westRoad, westRoadWidth,
  };
}

/** Add only user-observed site detail in memory. Source arrays/footprints stay
 * untouched; the original OSM way ID is retained on both pieces of the street.
 * Its southern approach gets the screenshot's 丽岗街 label; the residential loop does
 * not inherit that name. Synthetic observations have negative IDs.
 */
export function withTitSiteObservations(map: DistrictMap): DistrictMap {
  const layout = getTitSiteLayout(map);
  if (!layout || map.roads.some(r => r.id === TIT_WEST_ROAD_ID)) return map;
  const original = map.roads.find(r => r.id === LI_GANG_WAY_ID
    && r.nodes.some((id, index) => id === SOUTH_APPROACH_ID && r.nodes[index + 1] === SOUTH_BEND_ID));
  const present = new Set(map.nodes.map(n => n[0]));
  if (!original || ![NORTH_JUNCTION_ID, SOUTH_APPROACH_ID, SOUTH_BEND_ID].every(id => present.has(id))) return map;
  const southIndex = original.nodes.indexOf(SOUTH_APPROACH_ID);
  const originalNodes = new Map(map.nodes.map(n => [n[0]!, n]));
  const southA = originalNodes.get(SOUTH_APPROACH_ID)!, southB = originalNodes.get(SOUTH_BEND_ID)!;
  // Use the actual supplied map endpoints, preserving centimetre precision even
  // after an origin reprojection instead of introducing a second projection.
  const join: Point = { x: southA[1]! + (southB[1]! - southA[1]!) * joinT,
    z: southA[2]! + (southB[2]! - southA[2]!) * joinT };
  const addedNodes = layout.westRoad.slice(1).map((p, i) => {
    const chosen = i === layout.westRoad.length - 2 ? join : p;
    return [TIT_WEST_NODE_START - i, chosen.x, chosen.z];
  });
  const joinId = addedNodes.at(-1)![0]!;
  const west: TitObservedRoad = { id: TIT_WEST_ROAD_ID, name: "丽园西侧路", kind: "service", lanes: 0,
    oneWay: 0, rideable: true, width: layout.westRoadWidth,
    nodes: [NORTH_JUNCTION_ID, ...addedNodes.map(n => n[0]!)],
    sourceObservation: { reference: "user-satellite-2026-10-07", labelKind: "descriptive" } };
  const roads = map.roads.flatMap(road => road !== original ? [road] : [
    { ...road, name: "丽岗街", nodes: [...road.nodes.slice(0, southIndex + 1), joinId],
      sourceObservation: { reference: "user-satellite-2026-10-07", labelKind: "observed", sourceWayId: road.id, sourceName: road.name } } satisfies TitObservedRoad,
    { ...road, nodes: [joinId, ...road.nodes.slice(southIndex + 1)] },
  ]);
  return { ...map, nodes: [...map.nodes, ...addedNodes], roads: [...roads, west] };
}
