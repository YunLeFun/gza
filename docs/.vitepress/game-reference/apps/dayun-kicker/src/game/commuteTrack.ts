import { buildPoints, type TrackSample } from "./track";
import { RACE_COURSES } from "../config/gameplay/courses";

// AMap electric-bike route observed 2026-10-06, north is -Z.
// Liyuan South Gate → Ligang St → Xingang Middle Rd (westbound crossing,
// then east via Chigang/Modiesha) → Haizhou Rd → Dingxin Rd → Tencent.
// Wide, eased corners replace the junction's short pedestrian crossing steps.
const sections = [
  { length: 60, turn: 0 }, { length: 180, turn: Math.PI / 2 },
  { length: 80, turn: 0 }, { length: 360, turn: -Math.PI },
  { length: 540, turn: 0 }, { length: 220, turn: -0.72 },
  { length: 220, turn: 0.72 }, { length: 400, turn: 0 },
  { length: 180, turn: -Math.PI / 2 }, { length: 200, turn: 0 },
  { length: 180, turn: Math.PI / 2 }, { length: 50, turn: 0 },
  { length: 180, turn: -Math.PI / 2 }, { length: 250, turn: 0 },
  { length: 180, turn: Math.PI / 2 }, { length: 120, turn: 0 },
] as const;
let points: TrackSample[] | undefined;
export function getCommutePoints() {
  return points ??= buildPoints(sections, RACE_COURSES.commute.length).map(point => ({ ...point,
    x: -point.x, z: -point.z, heading: point.heading + Math.PI }));
}
