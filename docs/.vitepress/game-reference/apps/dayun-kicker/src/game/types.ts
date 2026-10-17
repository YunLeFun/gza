import type { TrackId } from "./track";
import type { ItemRaceState } from "./items";
import type { CircuitRaceState } from "./circuitRace";

export type KickSide = -1 | 1;
export type GameMode = "ready" | "playing" | "paused" | "ended";
export const PLAY_MODES = ["free", "music", "sprint", "kick-rush"] as const;
export type PlayMode = typeof PLAY_MODES[number];
export type ChallengeMode = Extract<PlayMode, "sprint" | "kick-rush">;
export type ChallengeMetric = "distance" | "kick-hits";
export type BeatAccuracy = "perfect" | "good" | "off" | "";
export type BoostSource = "near-miss" | "kick" | "clean-sector" | "red-light" | "corner" | "drift" | "item";
export type SizeMode = "giant" | "mini";
export type GameVariant = "classic" | "time" | "items";
export type TruckVariant = "cargo" | "tanker" | "sprinkler" | "sanitation" | "flatbed" | "dump" | "mixer" | "crane" | "excavator" | "roller" | "loader" | "heavy";
export type TruckRole = "traffic" | "interference";
export type EnvironmentTheme = "day" | "sunset" | "night";
export type RunEndReason = "crashed" | "time" | "completed" | null;

export const ENVIRONMENT_THEMES: readonly EnvironmentTheme[] = ["day", "sunset", "night"];

export interface InputSnapshot {
  accelerate: boolean;
  brake: boolean;
  /** Pedal braking is separate from drifting; legacy keyboard/touch input uses brake for both. */
  handbrake?: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  steerAxis: number;
}

export interface PlayerState {
  x: number;
  z: number;
  speed: number;
  lean: number;
  stability: number;
  energy: number;
  kickCooldown: number;
  kickTime: number;
  kickSide: KickSide | 0;
  distance: number;
  score: number;
  combo: number;
  comboTimer: number;
  boostTimer: number;
  boostSource: BoostSource | null;
  sizeMode: SizeMode | null;
  sizeTimer: number;
  shake: number;
}

export interface RunStats {
  kickAttempts: number;
  kickHits: number;
  misses: number;
  collisions: number;
  ramHits: number;
  illegalRams: number;
  redLightViolations: number;
  extremeRedRuns: number;
  legalPasses: number;
  nearMisses: number;
  cleanSectors: number;
  sideHits: number;
  frontHits: number;
  sectorSplitsMs: number[];
}

export interface CheckpointState {
  nextDistance: number;
  lastSplitMs: number | null;
  bestSplitMs: number | null;
  pulse: number;
  sectorClean: boolean;
}

export interface ChallengeState {
  id: ChallengeMode | null;
  metric: ChallengeMetric | null;
  target: number;
  progress: number;
  completed: boolean;
}

export interface GameState {
  variant: GameVariant;
  items: ItemRaceState;
  race: CircuitRaceState;
  trackId: TrackId;
  trackSeed: number | null;
  bend: number;
  bendClean: boolean;
  beatSynced: boolean;
  mode: GameMode;
  playMode: PlayMode;
  elapsed: number;
  duration: number;
  endReason: RunEndReason;
  player: PlayerState;
  stats: RunStats;
  message: string;
  messageTimer: number;
  bestCombo: number;
  bestScore: number;
  checkpoint: CheckpointState;
  challenge: ChallengeState;
  nearMissStreak: number;
  nearMissTimer: number;
  beatPhase: number;
  beatPulse: number;
  beatIndex: number;
  beatStreak: number;
  beatAccuracy: BeatAccuracy;
}

export interface PlayModeRules {
  duration: number;
  challengeMetric: ChallengeMetric | null;
  challengeTarget: number;
}

export function isPlayMode(value: unknown): value is PlayMode {
  return typeof value === "string" && PLAY_MODES.includes(value as PlayMode);
}

export function isChallengeMode(mode: PlayMode): mode is ChallengeMode {
  return mode === "sprint" || mode === "kick-rush";
}
