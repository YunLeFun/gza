import type { DistrictBuilding, DistrictMap, Point } from "./map";
import { PAZHOU_BUILDINGS } from "./pazhouPlaces";

export interface FootprintFrame {
  center: Point; yaw: number; width: number; depth: number; outline: number[][];
}
export interface ArchitecturalPoint extends Point { y: number }
export interface TencentEscalator {
  id: string; start: ArchitecturalPoint; end: ArchitecturalPoint; width: number; steps: number;
}

/** Public-map geometry, in metres; the local -z face looks towards the river. */
export function footprintFrame(building: DistrictBuilding): FootprintFrame {
  const outline = building.outline.filter((p, i, all) => i === 0 || p[0] !== all[0]![0] || p[1] !== all[0]![1]);
  let heading = 0, longest = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!, dx = b[0]! - a[0]!, dz = b[1]! - a[1]!;
    if (Math.abs(dx) < Math.abs(dz) || Math.hypot(dx, dz) <= longest) continue;
    longest = Math.hypot(dx, dz); heading = Math.atan2(dx < 0 ? -dz : dz, Math.abs(dx));
  }
  const c = Math.cos(heading), s = Math.sin(heading);
  const rotated = outline.map(p => [p[0]! * c + p[1]! * s, -p[0]! * s + p[1]! * c]);
  const minX = Math.min(...rotated.map(p => p[0]!)), maxX = Math.max(...rotated.map(p => p[0]!));
  const minZ = Math.min(...rotated.map(p => p[1]!)), maxZ = Math.max(...rotated.map(p => p[1]!));
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
  return { center: { x: x * c - z * s, z: x * s + z * c }, yaw: -heading,
    width: maxX - minX, depth: maxZ - minZ, outline: rotated.map(p => [p[0]! - x, p[1]! - z]) };
}

/** Photo-proportioned architectural features; all feature coordinates use the
 * south tower's local frame. These are not measured entrance or lift positions.
 */
export function createTencentArchitecture(map: DistrictMap) {
  const southBuilding = map.buildings.find(building => building.id === PAZHOU_BUILDINGS.tencentSouth);
  if (!southBuilding) return null;
  const south = footprintFrame(southBuilding), w = south.width, d = south.depth;
  const northBuilding = map.buildings.find(building => building.id === PAZHOU_BUILDINGS.tencentNorth);
  const north = northBuilding ? footprintFrame(northBuilding) : null;
  const southPortal = { width: w * 0.42, top: 18.5, entranceZ: d / 2, recessDepth: 34, landingY: 17.3 };
  // The user confirmed three parallel flights at the front entrance.
  const groundEscalators: TencentEscalator[] = [0.1, 2.2, 4.3].map((x, i) => ({ id: `tencent-entry-escalator-${i}`, width: 1.4, steps: 52,
    start: { x, y: 0.35, z: d / 2 - 1.8 }, end: { x, y: southPortal.landingY, z: d / 2 - 34 } }));
  const platforms = [53, 96, 140, 183].map((floor, i) => ({ floor, reach: [14, 20, 25, 29][i]!, frontZ: -d / 2 - [14, 20, 25, 29][i]! }));
  // The river-facing middle is an open canyon with inclined curtain walls.
  // A frontal as-built photo does not show the three exterior stair tubes that
  // the earlier model inferred from the architect's general circulation text.
  const canyonWidth = w * 0.24;
  const officeTiers = [[5, 40], [53, 84], [96, 128], [140, 171], [183, 207]]
    .map(([bottom, top]) => ({ bottom: bottom!, top: top! }));
  const canyonFacades = officeTiers.map(({ bottom, top }, i) => ({
    bottom: i === 0 ? 19 : bottom, top,
    lowerWidth: canyonWidth * 0.72, upperWidth: canyonWidth,
    // Local -z is outside: the broad head is forward, the narrow foot recessed.
    lowerZ: d * 0.21, upperZ: -d * 0.34,
  }));
  let upperConnector: { stations: { z: number; floor: number; width: number }[]; height: number; thickness: number } | null = null;
  const lowerEscalators: TencentEscalator[] = [];
  if (north) {
    const dx = north.center.x - south.center.x, dz = north.center.z - south.center.z;
    const c = Math.cos(south.yaw), s = Math.sin(south.yaw), z = dx * s + dz * c;
    const northEdge = z + north.depth / 2, southEdge = -d / 2, gap = southEdge - northEdge;
    if (gap > 5 && gap < 100) {
      upperConnector = { height: 4.4, thickness: 2.2, stations: [
        { z: southEdge + 0.7, floor: 40, width: w * 0.52 },
        { z: southEdge - gap * 0.38, floor: 32, width: w * 0.4 },
        { z: northEdge + gap * 0.33, floor: 32, width: w * 0.4 },
        { z: northEdge - 0.7, floor: 40, width: w * 0.52 },
      ] };
      for (const x of [-1.15, 1.15]) lowerEscalators.push({ id: `tencent-link-escalator-${x < 0 ? 0 : 1}`, width: 1.5, steps: 56,
        start: { x, y: 9, z: southEdge - 0.7 }, end: { x, y: 31, z: northEdge + 0.7 } });
    }
  }
  return { south, north, southPortal, northEntrance: { width: 12, height: 4.5, entranceZ: -d / 2, recessDepth: 4.5 },
    groundEscalators, platforms, officeTiers, canyonWidth, canyonFacades, upperConnector, lowerEscalators };
}
