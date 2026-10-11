import { projectCoordinate, type DistrictMap, type Point } from "./map";
/** New streets use mapped surfaces; dense generated props remain in the established district. */
export function inDetailedDistrict(map: DistrictMap, point: Point) {
  const bounds = map.expansionSource?.legacyBounds;
  if (!bounds) return true;
  const nw = projectCoordinate(map.origin, bounds[0]!, bounds[3]!), se = projectCoordinate(map.origin, bounds[2]!, bounds[1]!);
  return point.x >= nw.x && point.x <= se.x && point.z >= nw.z && point.z <= se.z;
}
