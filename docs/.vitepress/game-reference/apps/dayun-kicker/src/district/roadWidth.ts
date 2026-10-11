import type { DistrictRoad } from "./map";

/** Road dimensions shared by navigation and lightweight landmark geometry. */
export function roadWidth(road: DistrictRoad) {
  if (road.width && road.width > 0) return Math.min(40, road.width);
  if (road.kind.endsWith("_link")) return Math.max(3.5, (road.lanes || 1) * 3);
  if (["footway", "path", "cycleway", "pedestrian"].includes(road.kind)) return 2.8;
  if (road.kind === "service") return 4.8;
  return Math.min(15, Math.max(6, (road.lanes || (road.kind === "primary" ? 4 : 2)) * 3));
}
