import { SECTIONS, CIRCUIT_SECTIONS, CIRCUIT_LENGTH, TRACK_LENGTH, TRACK_SAMPLE_STEP as STEP, MAX_TRACK_SEED } from "../config/gameplay/track";
import { getCantonLayout } from "./cantonTrack";
import { getCommutePoints } from "./commuteTrack";
import { raceCourse } from "./raceCourse";
/** Canton/commute IDs remain for historical records and diagnostic replays; city play uses district.html. */
export type TrackId = "classic" | "curves" | "circuit" | "canton" | "commute";
/** Race modes include closed circuits and the point-to-point city commute. */
export const isCircuitTrack = (track: TrackId) => track === "circuit" || track === "canton" || track === "commute";

export interface TrackSample {
  x: number;
  z: number;
  heading: number;
  curvature: number;
  bend: number;
}

function profile(distance: number, sections: readonly { length: number; turn: number }[]) {
  let start = 0, heading = 0;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (distance < start + section.length || i === sections.length - 1) {
      const t = Math.max(0, Math.min(1, (distance - start) / section.length));
      return {
        heading: heading + section.turn * (t - Math.sin(2 * Math.PI * t) / (2 * Math.PI)),
        curvature: section.turn / section.length * (1 - Math.cos(2 * Math.PI * t)),
        bend: section.turn === 0 ? -1 : i,
        start, end: start + section.length,
      };
    }
    start += section.length;
    heading += section.turn;
  }
  throw new Error("Invalid track section");
}

export function buildPoints(sections: readonly { length: number; turn: number }[], length: number) {
  const points: TrackSample[] = [{ x: 0, z: 0, heading: 0, curvature: 0, bend: -1 }];
  for (let s = STEP; s <= length; s += STEP) {
    const heading = profile(s - STEP / 2, sections).heading;
    const previous = points.at(-1)!;
    const section = profile(s, sections);
    points.push({ x: previous.x + Math.sin(heading) * STEP, z: previous.z - Math.cos(heading) * STEP,
      heading: section.heading, curvature: section.curvature, bend: section.bend });
  }
  return points;
}
const points = buildPoints(SECTIONS, TRACK_LENGTH);
const circuitPoints = buildPoints(CIRCUIT_SECTIONS, CIRCUIT_LENGTH);
circuitPoints.at(-1)!.x = circuitPoints.at(-1)!.z = 0;
const cycleEnd = points.at(-1)!;
export function parseTrackSeed(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !/^\d{1,6}$/.test(value)) return null;
  const seed = Number(value);
  return Number.isInteger(seed) && seed > 0 && seed <= MAX_TRACK_SEED ? seed : null;
}
let randomTrackFactory: ((seed: number) => TrackSample[]) | undefined;
let randomTrackLoading: Promise<void> | undefined;
export async function prepareRandomTrack(seed: number | null) {
  if (seed === null) return;
  if (parseTrackSeed(seed) === null) throw new Error("Invalid track seed");
  randomTrackLoading ??= import("./randomTrack").then(module => {
    randomTrackFactory = module.getRandomTrack;
  }).catch(error => { randomTrackLoading = undefined; throw error; });
  await randomTrackLoading;
  randomTrackFactory!(seed);
}

export function sampleTrack(track: TrackId, distance: number, result: TrackSample = { x: 0, z: 0, heading: 0, curvature: 0, bend: -1 }, seed: number | null = null) {
  if (track === "classic" || (track === "curves" && distance <= 0)) {
    result.x = result.heading = result.curvature = 0;
    result.z = -distance;
    result.bend = -1;
    return result;
  }
  if (track === "commute") {
    const samples = getCommutePoints(), length = raceCourse(track).length;
    const local = Math.max(0, Math.min(length, distance));
    const index = Math.floor(local / STEP), t = (local - index * STEP) / STEP;
    const a = samples[index]!, b = samples[index + 1] ?? a;
    const extension = distance - local;
    result.x = a.x + (b.x - a.x) * t + Math.sin(a.heading) * extension;
    result.z = a.z + (b.z - a.z) * t - Math.cos(a.heading) * extension;
    result.heading = a.heading + (b.heading - a.heading) * t;
    result.curvature = extension ? 0 : a.curvature + (b.curvature - a.curvature) * t;
    result.bend = extension ? -1 : a.bend;
    return result;
  }
  const closed = isCircuitTrack(track);
  const length = closed ? CIRCUIT_LENGTH : TRACK_LENGTH;
  const samples = track === "canton" ? getCantonLayout().points : closed ? seed !== null && randomTrackFactory ? randomTrackFactory(seed) : circuitPoints : points;
  const cycle = Math.floor(distance / length);
  const local = distance - cycle * length;
  const index = Math.floor(local / STEP), t = (local - index * STEP) / STEP;
  const a = samples[index], b = samples[index + 1] ?? a;
  result.x = (closed ? 0 : cycle * cycleEnd.x) + a.x + (b.x - a.x) * t;
  result.z = (closed ? 0 : cycle * cycleEnd.z) + a.z + (b.z - a.z) * t;
  result.heading = (closed ? cycle * (samples.at(-1)!.heading - samples[0]!.heading) : 0) + a.heading + (b.heading - a.heading) * t;
  result.curvature = a.curvature + (b.curvature - a.curvature) * t;
  result.bend = a.bend < 0 ? -1 : cycle * (closed ? samples.length : SECTIONS.length) + a.bend;
  return result;
}

const worldSample: TrackSample = { x: 0, z: 0, heading: 0, curvature: 0, bend: -1 };
/** Simulation and Rapier use metres along the road and a lateral road offset. */
export function roadToWorld(track: TrackId, lateral: number, z: number, result = { x: 0, z: 0, yaw: 0 }, seed: number | null = null) {
  const pose = sampleTrack(track, -z, worldSample, seed);
  result.x = pose.x + Math.cos(pose.heading) * lateral;
  result.z = pose.z + Math.sin(pose.heading) * lateral;
  result.yaw = -pose.heading;
  return result;
}

export function upcomingTurn(distance: number, track: TrackId = "curves", seed: number | null = null) {
  for (let ahead = 0; ahead <= 100; ahead += 5) {
    const sample = sampleTrack(track, distance + ahead, undefined, seed);
    if (Math.abs(sample.curvature) > 0.0015) {
      return { direction: sample.curvature > 0 ? "right" : "left", distance: ahead } as const;
    }
  }
  return { direction: "straight", distance: 0 } as const;
}

export function trackStorage(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, track: TrackId) {
  const key = (value: string) => track === "classic" ? value : `${track}-v1:${value}`;
  return {
    getItem: (value: string) => storage.getItem(key(value)),
    setItem: (value: string, data: string) => storage.setItem(key(value), data),
    removeItem: (value: string) => storage.removeItem(key(value)),
  };
}
