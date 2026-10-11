/** Simulation timings, independent of Guangzhou's real timetable. Metres / seconds. */
export const BUS_TRANSIT = {
  routeNumber: "01", headway: 42, dwell: 8, speed: 9, acceleration: 1.5, braking: 2.5,
  maxPerDirection: 3, initialApproach: 65, spawnClearance: 190, followGap: 8,
  shelterWidth: 2.1, shelterLength: 6, viewDistance: 165, detailDistance: 55,
} as const;

/** WGS84 OSM platforms, snapshot 2026-06-01T08:52:28Z. See docs/bus-transit.md. */
export const BUS_STOP_ANCHORS = [
  { node: 4391879738, name: "珠影（地铁客村站）", ref: "①", lon: 113.3163612, lat: 23.0989719, direction: -1 },
  { node: 4391903252, name: "赤岗路口", ref: "②", lon: 113.319706, lat: 23.0989949, direction: -1, nearLiyuan: true },
  { node: 4391903253, name: "赤岗路口", ref: "①", lon: 113.3234828, lat: 23.0990562, direction: -1 },
  { node: 4391875042, name: "珠影（地铁客村站）", ref: "②", lon: 113.316239, lat: 23.0986855, direction: 1 },
  { node: 4391903251, name: "赤岗路口", ref: "①", lon: 113.3201468, lat: 23.0986957, direction: 1, nearLiyuan: true },
  { node: 4391903250, name: "赤岗路口", ref: "②", lon: 113.3230039, lat: 23.0987099, direction: 1 },
] as const;
