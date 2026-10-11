import { RACE_COURSES } from "./courses";

/** Road and procedural course dimensions in metres. */
export const ROAD_HALF_WIDTH = 6.4;
export const LANES = [-4.8, -1.6, 1.6, 4.8] as const;
export const CHECKPOINT_INTERVAL = 500;

// 1.5 km repeatable course: warm-up, sweeping bend, recovery, then an S bend.
export const SECTIONS = [
  { length: 120, turn: 0 }, { length: 180, turn: 0.65 },
  { length: 120, turn: 0 }, { length: 180, turn: -0.65 },
  { length: 140, turn: 0 }, { length: 160, turn: -0.5 },
  { length: 160, turn: 1 }, { length: 160, turn: -0.5 },
  { length: 280, turn: 0 },
] as const;

// Two identical half turns cancel their displacement and close the city loop.
export const HALF_CIRCUIT = [
  { length: 100, turn: 0 }, { length: 100, turn: -0.45 },
  { length: 100, turn: 0.45 }, { length: 180, turn: Math.PI / 2 },
  { length: 100, turn: 0 }, { length: 220, turn: Math.PI / 2 },
] as const;

export const CIRCUIT_SECTIONS = [...HALF_CIRCUIT, ...HALF_CIRCUIT];
export const CIRCUIT_LENGTH = RACE_COURSES.loop.length;
export const CIRCUIT_LAPS = RACE_COURSES.loop.laps;
export const CIRCUIT_CHECKPOINT_INTERVAL = CIRCUIT_LENGTH / RACE_COURSES.loop.gates;
export const TRACK_LENGTH = SECTIONS.reduce((sum, section) => sum + section.length, 0);
export const TRACK_SAMPLE_STEP = 2;
export const MAX_TRACK_SEED = 999999;
