import type { PlayMode, PlayModeRules } from "../../game/types";

/** Speeds in m/s, durations in seconds, challenge distances in metres. */
export const RUN_DURATION = 90;
export const SPRINT_DURATION = 75;
export const SPRINT_DISTANCE_TARGET = 1_500;
export const KICK_RUSH_DURATION = 45;
export const KICK_RUSH_HIT_TARGET = 8;
export const BOOST_MAX_DURATION = 3.2;
export const MAX_ENERGY = 100;
export const MAX_STABILITY = 100;
export const PLAY_MODE_RULES: Readonly<Record<PlayMode, PlayModeRules>> = Object.freeze({
  free: { duration: RUN_DURATION, challengeMetric: null, challengeTarget: 0 },
  music: { duration: RUN_DURATION, challengeMetric: null, challengeTarget: 0 },
  sprint: {
    duration: SPRINT_DURATION,
    challengeMetric: "distance",
    challengeTarget: SPRINT_DISTANCE_TARGET,
  },
  "kick-rush": {
    duration: KICK_RUSH_DURATION,
    challengeMetric: "kick-hits",
    challengeTarget: KICK_RUSH_HIT_TARGET,
  },
});

export const MIN_SPEED = 9;
export const CRUISE_SPEED = 18;
export const MAX_SPEED = 34;
export const BOOST_MAX_SPEED = 38;
export const KICK_BOOST_DURATION = 0.65;
export const CLEAN_SECTOR_BOOST_DURATION = 1.25;
export const NEAR_MISS_BOOST_DURATION = 1.15;
export const EXTREME_RED_BOOST_DURATION = 0.8;
export const RACE_TUNING = {
  acceleration: 13.5,
  cruiseResponse: 0.42,
  brake: 22,
  boostAcceleration: 6.5,
  steeringBase: 4.2,
  steeringSpeedGain: 0.16,
  curvatureDrift: 0.32,
  edgeMargin: 0.7,
  edgeBrake: 10,
  edgeStabilityLoss: 9,
  leanResponse: 7.5,
  scorePerMetre: 0.28,
  energyRecovery: 24,
} as const;

export const DRIFT_TUNING = {
  turnThreshold: 0.25,
  curvatureThreshold: 0.0015,
  minSpeed: 14,
  maxLateral: 5.25,
  minStability: 35,
  brake: 8,
  steeringMultiplier: 0.6,
  chargeRate: 0.9,
  minReleaseCharge: 0.35,
  boostBase: 0.6,
  boostChargeGain: 1.4,
  speedImpulse: 2.5,
} as const;
