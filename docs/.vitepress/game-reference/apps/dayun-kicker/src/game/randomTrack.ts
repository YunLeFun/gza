import { buildPoints, parseTrackSeed, type TrackSample } from "./track";
import { CIRCUIT_LENGTH } from "../config/gameplay/track";

// Keep a few immutable recipes, not a new route table per rendered object/frame.
const tracks = new Map<number, TrackSample[]>();
export function getRandomTrack(seed: number) {
  if (parseTrackSeed(seed) === null) throw new Error("Invalid track seed");
  const cached = tracks.get(seed);
  if (cached) return cached;
  let value = seed;
  const random = () => {
    value |= 0;
    value = value + 0x6D2B79F5 | 0;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const length = (min: number, max: number) => Math.round((min + random() * (max - min)) / 2) * 2;
  const direction = random() < 0.5 ? -1 : 1;
  const sTurn = (random() < 0.5 ? -1 : 1) * (0.3 + random() * 0.25);
  const s1 = length(80, 100), s2 = length(80, 100);
  const corner1 = length(190, 230), corner2 = length(190, 230);
  const remaining = CIRCUIT_LENGTH / 2 - 80 - s1 - s2 - corner1 - corner2;
  const recovery = Math.round(remaining * (0.35 + random() * 0.3) / 2) * 2;
  const half = [
    { length: 80, turn: 0 },
    { length: s1, turn: sTurn }, { length: s2, turn: -sTurn },
    { length: corner1, turn: direction * Math.PI / 2 },
    { length: recovery, turn: 0 },
    { length: corner2, turn: direction * Math.PI / 2 },
    { length: remaining - recovery, turn: 0 },
  ];
  // Half-turn symmetry closes both position and tangent without a forced seam.
  const route = buildPoints([...half, ...half], CIRCUIT_LENGTH);
  route.at(-1)!.x = route.at(-1)!.z = 0;
  if (tracks.size >= 4) tracks.delete(tracks.keys().next().value!);
  tracks.set(seed, route);
  return route;
}
