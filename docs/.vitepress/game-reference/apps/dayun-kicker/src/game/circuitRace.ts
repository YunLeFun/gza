import { BEST_TIME_KEY } from "../config/storage";
import type { TrackId } from "./track";
import { raceCourse } from "./raceCourse";
import type { GameState } from "./types";
import { DRIFT_TUNING } from "../config/gameplay/race";

export interface CircuitRaceState {
  completedLaps: number;
  checkpoints: number;
  lapTimesMs: number[];
  finishTimeMs: number | null;
  bestTimeMs: number | null;
  newBest: boolean;
  driftActive: boolean;
  driftCharge: number;
  driftSide: number;
}
export function createCircuitRace(): CircuitRaceState {
  return { completedLaps: 0, checkpoints: 0, lapTimesMs: [], finishTimeMs: null,
    bestTimeMs: null, newBest: false, driftActive: false, driftCharge: 0, driftSide: 0 };
}

/** Only consecutive gate crossings advance the race; jumping past a gate does not. */
export function updateCircuitRace(state: GameState, previousDistance: number, previousElapsed: number) {
  const race = state.race;
  const delta = state.player.distance - previousDistance;
  const course = raceCourse(state.trackId), interval = course.length / course.gates;
  const totalCheckpoints = course.laps * course.gates;
  while (delta > 0 && race.checkpoints < totalCheckpoints) {
    const next = (race.checkpoints + 1) * interval;
    if (previousDistance >= next || state.player.distance < next) break;
    race.checkpoints++;
    state.checkpoint.pulse = 1;
    if (race.checkpoints % course.gates === 0) {
      const crossing = (next - previousDistance) / delta;
      const timeMs = Math.round((previousElapsed + (state.elapsed - previousElapsed) * crossing) * 1000);
      const previousLapMs = race.lapTimesMs.reduce((sum, time) => sum + time, 0);
      race.lapTimesMs.push(timeMs - previousLapMs);
      race.completedLaps++;
      if (race.completedLaps === course.laps) {
        race.finishTimeMs = timeMs;
        state.elapsed = timeMs / 1000;
        state.mode = "ended";
        state.endReason = "completed";
        race.driftActive = false;
        race.driftCharge = 0;
      }
    }
  }
  state.checkpoint.nextDistance = Math.min(totalCheckpoints, race.checkpoints + 1) * interval;
}

const safeDriftLine = (state: GameState) => Math.abs(state.player.x) < DRIFT_TUNING.maxLateral && state.bendClean;

export function canCircuitDrift(state: GameState, steer: number, curvature: number) {
  return steer * Math.sign(curvature) > DRIFT_TUNING.turnThreshold
    && Math.abs(curvature) > DRIFT_TUNING.curvatureThreshold
    && state.player.speed >= DRIFT_TUNING.minSpeed
    && state.player.stability >= DRIFT_TUNING.minStability
    && safeDriftLine(state);
}

/** Brake + steering into the bend charges a boost; release on a clean line to use it. */
export function updateCircuitDrift(state: GameState, steer: number, curvature: number, braking: boolean, dt: number) {
  const race = state.race;
  const safe = safeDriftLine(state);
  const canDrift = braking && canCircuitDrift(state, steer, curvature);
  if (canDrift) {
    if (race.driftSide !== Math.sign(curvature)) race.driftCharge = 0;
    race.driftActive = true;
    race.driftSide = Math.sign(curvature);
    race.driftCharge = Math.min(1, race.driftCharge + dt * DRIFT_TUNING.chargeRate);
    return 0;
  }
  const boost = race.driftActive && !braking && safe && race.driftCharge >= DRIFT_TUNING.minReleaseCharge
    ? DRIFT_TUNING.boostBase + race.driftCharge * DRIFT_TUNING.boostChargeGain : 0;
  race.driftActive = false;
  race.driftCharge = 0;
  race.driftSide = 0;
  return boost;
}

const bestTimeKey = (seed: number | null, items: boolean, track: TrackId) => track === "canton" || track === "commute"
  ? `dayun-kicker.${items ? `items.v1.${track}` : `${track}.v1`}.best-time`
  : items
  ? `dayun-kicker.items.v1.${seed ?? "fixed"}.best-time`
  : seed === null ? BEST_TIME_KEY : `dayun-kicker.random.v1.${seed}.best-time`;
export function readCircuitBest(storage: Pick<Storage, "getItem">, seed: number | null = null, items = false, track: TrackId = "circuit") {
  try {
    const value = Number(storage.getItem(bestTimeKey(seed, items, track)));
    return Number.isInteger(value) && value > 0 && value <= raceCourse(track).duration * 1000 ? value : null;
  } catch { return null; }
}

export function saveCircuitBest(storage: Pick<Storage, "getItem" | "setItem">, race: CircuitRaceState, seed: number | null = null, items = false, track: TrackId = "circuit") {
  const course = raceCourse(track);
  if (race.completedLaps !== course.laps || race.checkpoints !== course.laps * course.gates
    || race.finishTimeMs === null || !Number.isInteger(race.finishTimeMs)
    || race.finishTimeMs <= 0 || race.finishTimeMs > course.duration * 1000) return false;
  const best = readCircuitBest(storage, seed, items, track);
  if (best !== null && best <= race.finishTimeMs) { race.bestTimeMs = best; return false; }
  try {
    storage.setItem(bestTimeKey(seed, items, track), String(race.finishTimeMs));
    race.bestTimeMs = race.finishTimeMs;
    race.newBest = true;
    return true;
  } catch { return false; }
}
