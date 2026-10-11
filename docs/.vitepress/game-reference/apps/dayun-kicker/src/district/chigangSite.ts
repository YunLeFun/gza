import { projectCoordinate, type DistrictMap, type Point } from "./map";

/** OSM way 475116666, checked 2026-10-08. Only the horizontal alignment is
 * mapped; deck height, stair runs and street furniture are photo-based art.
 * Never join this elevated pedestrian structure to the carriageway node below.
 */
export const CHIGANG_FOOTBRIDGE = {
  wayId: 475116666,
  coordinates: [[113.3222145, 23.0990381], [113.3222706, 23.099038],
    [113.3222694, 23.0991433], [113.3221841, 23.0991432],
    [113.3221942, 23.0987162], [113.3222335, 23.0987175]],
  deckHeight: 5.85, width: 3.2, thickness: .55,
} as const;

export interface ChigangSolid extends Point {
  y: number; width: number; height: number; depth: number; yaw: number;
  finish: "concrete" | "stone" | "hedge" | "bollard";
}
const HOME_IDS = [1267493270, 1267493271, 1267493272, 1267493273,
  1267493274, 1267493275, 1267493276, 1267493277, 1267493278, 1287276331];

export function chigangJunctionLayout(map: DistrictMap) {
  // Also keeps reduced test maps and other cities free of Guangzhou-only art.
  if (!map.roads.some(r => r.id === 446633891)) return null;
  const local = (x: number, z: number): Point => {
    const offset = projectCoordinate(map.origin, 113.3196, 23.0995);
    return { x: offset.x + x, z: offset.z + z };
  };
  const path = CHIGANG_FOOTBRIDGE.coordinates.map(([lon, lat]) => projectCoordinate(map.origin, lon, lat));
  const north = path[3]!, south = path[4]!, deckHeight = CHIGANG_FOOTBRIDGE.deckHeight;
  const spans = [{ a: north, b: south }, { a: north, b: path[2]! }, { a: south, b: path[5]! }];
  // Stair positions are estimates along the pavement, kept clear of mapped
  // shops and slip lanes. OSM's ground/shared nodes do not establish elevations.
  const stairs = [
    { a: path[2]!, b: local(294, 39.71), width: 2.3 },
    { a: path[5]!, b: local(290, 87.11), width: 2.3 },
  ];
  const solids: ChigangSolid[] = [];
  function solid(p: Point, y: number, width: number, height: number, depth: number, finish: ChigangSolid["finish"], yaw = 0) {
    solids.push({ ...p, y, width, height, depth, finish, yaw });
  }
  for (const { a, b } of spans) {
    solid({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, deckHeight - CHIGANG_FOOTBRIDGE.thickness / 2,
      CHIGANG_FOOTBRIDGE.width, CHIGANG_FOOTBRIDGE.thickness, Math.hypot(b.x - a.x, b.z - a.z) + .1,
      "concrete", Math.atan2(b.x - a.x, b.z - a.z));
  }
  for (const p of [north, south]) solid(p, (deckHeight - .55) / 2, 1.05, deckHeight - .55, 1.05, "concrete");
  for (const run of stairs) {
    const length = Math.hypot(run.b.x - run.a.x, run.b.z - run.a.z), count = 32;
    const yaw = Math.atan2(run.b.x - run.a.x, run.b.z - run.a.z);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, top = deckHeight * (1 - i / count);
      solid({ x: run.a.x + (run.b.x - run.a.x) * t, z: run.a.z + (run.b.z - run.a.z) * t },
        top - .13, run.width, .26, length / count + .015, "concrete", yaw);
    }
  }
  // Southwest pavement, planting and stone bollards visible in the user's photo.
  const pavement = [[local(229.2, 84.5), local(238.5, 84.5), local(238.5, 102), local(231.2, 102)]].map(r => r.map(p => [p.x, p.z]));
  solid(local(233, 96.5), .25, 2.9, .5, 4.5, "stone");
  solid(local(233, 96.5), .83, 2.8, .72, 4.4, "hedge");
  for (const [x, z] of [[230.1, 85.1], [234.1, 85.1], [238, 85.1], [238, 90.1]]) solid(local(x!, z!), .43, .42, .86, .42, "bollard");
  const crossings = [
    { a: local(231.2, 64.5), b: local(231.2, 87.1), width: 2.5 },
    { a: local(235, 88), b: local(255, 88), width: 2.4 },
  ];
  const homes = HOME_IDS.flatMap(id => {
    const building = map.buildings.find(b => b.id === id);
    return building ? [{ building, floors: 6, height: building.height ?? 17.4 }] : [];
  });
  const center = local(248, 71);
  return { center, path, spans, stairs, deckHeight, solids, pavement, crossings, homes };
}
