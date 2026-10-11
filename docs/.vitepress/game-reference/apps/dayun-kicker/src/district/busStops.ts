import { BUS_STOP_ANCHORS, BUS_TRANSIT as RULES } from "../config/district/busTransit";
import { projectCoordinate, type DistrictMap, type Point, type RoadNetwork } from "./map";
import type { LandmarkBarrier } from "./places";

export interface BusStop extends Point {
  id: string; name: string; ref: string; node: number; source: string; nearLiyuan: boolean;
  direction: -1 | 1; heading: string; yaw: number; shelter: Point; waiting: Point; bay: Point;
}

/** Source platform positions stay separate from the estimated shelter dimensions. */
export function createBusStops(map: DistrictMap, network: RoadNetwork): BusStop[] {
  return BUS_STOP_ANCHORS.flatMap(anchor => {
    if (anchor.lon < map.bbox[0]! || anchor.lon > map.bbox[2]! || anchor.lat < map.bbox[1]! || anchor.lat > map.bbox[3]!) return [];
    const point = projectCoordinate(map.origin, anchor.lon, anchor.lat);
    const edges = network.edges.filter(e => e.road.name === "新港中路" && !e.road.layer && !e.road.heights
      && Math.sign(network.nodes.get(e.b)!.x - network.nodes.get(e.a)!.x) * (e.road.oneWay === -1 ? -1 : 1) === anchor.direction);
    const edge = [...edges].sort((a, b) => {
      const distance = (e: typeof a) => {
        const first = network.nodes.get(e.a)!, last = network.nodes.get(e.b)!;
        const t = Math.max(0, Math.min(1, ((point.x - first.x) * (last.x - first.x) + (point.z - first.z) * (last.z - first.z)) / e.length ** 2));
        return Math.hypot(point.x - first.x - (last.x - first.x) * t, point.z - first.z - (last.z - first.z) * t);
      };
      return distance(a) - distance(b);
    })[0];
    if (!edge) return [];
    const a = network.nodes.get(edge.a)!, b = network.nodes.get(edge.b)!;
    const sign = edge.road.oneWay === -1 ? -1 : 1, dx = (b.x - a.x) / edge.length * sign, dz = (b.z - a.z) / edge.length * sign;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.z - a.z) * (b.z - a.z)) / edge.length ** 2));
    const offset = edge.width / 2 - 1.275 - .4;
    const center = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const lateral = (point.x - center.x) * -dz + (point.z - center.z) * dx;
    const move = Math.max(0, edge.width / 2 + RULES.shelterWidth / 2 + .4 - lateral);
    // OSM marks a platform point, not its shelter footprint. Keep the source
    // coordinate and place the estimated canopy fully outside the carriageway.
    const shelter = { x: point.x - dz * move, z: point.z + dx * move };
    return [{ ...point, id: `bus-stop-${anchor.node}`, node: anchor.node, name: anchor.name, ref: anchor.ref,
      source: `https://www.openstreetmap.org/node/${anchor.node}`, nearLiyuan: "nearLiyuan" in anchor,
      direction: anchor.direction as -1 | 1, heading: anchor.direction === -1 ? "往珠影" : "往赤岗",
      yaw: Math.atan2(-dx, -dz), shelter, waiting: { x: shelter.x + dz * .85, z: shelter.z - dx * .85 },
      bay: { x: a.x + (b.x - a.x) * t - dz * offset, z: a.z + (b.z - a.z) * t + dx * offset } }];
  });
}

/** Local +X is the shelter back; local -Z follows the bus direction. */
export function busStopPoint(stop: BusStop, x: number, z: number): Point {
  const c = Math.cos(stop.yaw), s = Math.sin(stop.yaw);
  return { x: stop.shelter.x + c * x + s * z, z: stop.shelter.z - s * x + c * z };
}

export function busStopReservations(stops: readonly BusStop[]): LandmarkBarrier[] {
  return stops.map(stop => ({ ...stop.shelter, yaw: stop.yaw, width: RULES.shelterWidth + 1.4, depth: RULES.shelterLength + 3, height: 3.5 }));
}

export function busStopSolids(stops: readonly BusStop[]): LandmarkBarrier[] {
  return stops.flatMap(stop => [
    ...[-.8, .8].flatMap(x => [-2.6, 2.6].map(z => ({ ...busStopPoint(stop, x, z), width: .12, depth: .12, height: 2.8, yaw: stop.yaw }))),
    { ...busStopPoint(stop, .82, 0), width: .1, depth: 3.5, height: 2.25, yaw: stop.yaw },
    { ...busStopPoint(stop, .35, .6), width: .5, depth: 2.1, height: .48, yaw: stop.yaw },
  ]);
}
