import type { DistrictMap } from "./map";
import type { StreetSite } from "./streets";
import { TIT_CONFERENCE_BUILDING_ID } from "./titSite";

/** Existing OSM footprints west of Yiyuan Road. The user's west-gate photo
 * supplies the older residential appearance; floor counts are visual estimates.
 */
const homes = [
  { id: 1311481056, floors: 6, color: "#d8b17a" },
  { id: 1311481055, floors: 6, color: "#e5d3a1" },
  { id: 906981398, floors: 7, color: "#ccb085" },
  { id: 1311481054, floors: 6, color: "#ddd0ab" },
] as const;
export function titWestStreetHomes(map: DistrictMap) {
  if (!map.buildings.some(b => b.id === TIT_CONFERENCE_BUILDING_ID)) return [];
  return homes.flatMap(style => {
    const building = map.buildings.find(b => b.id === style.id);
    return building ? [{ ...style, building, height: building.height ?? 3.5 + (style.floors - 1) * 2.9 }] : [];
  });
}
export type TitWestStreetHome = ReturnType<typeof titWestStreetHomes>[number];

/** Project the photograph's planted verge and tall swept-arm lamps into the
 * same street layout consumed by rendering, lamp pools and physical colliders.
 */
export function titWestStreetFurniture(map: DistrictMap): StreetSite[] {
  if (!map.buildings.some(b => b.id === TIT_CONFERENCE_BUILDING_ID)) return [];
  const dx = (113.3196 - map.origin[0]!) * 111320 * Math.cos(map.origin[1]! * Math.PI / 180);
  const dz = (map.origin[1]! - 23.0995) * 111320;
  const trees = [[-148.5, -76], [-146.8, -105], [-146.5, -141], [-146.8, -168],
    [-109, -98], [-109, -117], [-109, -136], [-107, -157]];
  const lamps = [[-127.5, -96.5, Math.PI], [-127.1, -133, Math.PI], [-146.8, -90, 0], [-146.8, -124, 0], [-146.8, -160, 0]];
  return [
    ...trees.map(([x, z]) => ({ x: x! + dx, z: z! + dz, kind: "tree" as const, yaw: 0,
      radius: 1.1, campus: false, treeKind: "broadleaf" as const, treeScale: 1.65 })),
    ...lamps.map(([x, z, yaw]) => ({ x: x! + dx, z: z! + dz, kind: "lamp" as const, yaw: yaw!,
      radius: .3, campus: false, lampStyle: "swept" as const })),
  ];
}
