import type { SizeMode } from "../../game/types";
import type { SizeShiftTuning } from "../../game/sizeShift";
import type { RamVehicleClass } from "../../game/ramImpact";

/** Combat, near-miss and size-item balance parameters. */
export const KICK_DURATION = 0.52;
export const KICK_COOLDOWN = 0.58;
export const SIZE_SHIFT_DURATION = 10;
export const NORMAL_TUNING: SizeShiftTuning = {
  visualScale: 1,
  cameraHeightOffset: 0,
  steeringMultiplier: 1,
  collisionMultiplier: 1,
  underpassEnabled: false,
  kickRangeMultiplier: 1,
  kickPowerMultiplier: 1,
  ramPowerMultiplier: 1,
  kickCooldownMultiplier: 1,
};

export const SIZE_SHIFT_TUNING: Record<SizeMode, SizeShiftTuning> = {
  giant: {
    ...NORMAL_TUNING,
    visualScale: 1.35,
    cameraHeightOffset: 0.28,
    steeringMultiplier: 0.85,
    collisionMultiplier: 1.3,
    kickRangeMultiplier: 1.4,
    kickPowerMultiplier: 1.6,
    ramPowerMultiplier: 1.35,
  },
  mini: {
    ...NORMAL_TUNING,
    visualScale: 0.48,
    cameraHeightOffset: -1.12,
    steeringMultiplier: 1.3,
    collisionMultiplier: 0.42,
    underpassEnabled: true,
    kickRangeMultiplier: 0.7,
    ramPowerMultiplier: 0.85,
    kickCooldownMultiplier: 0.7,
  },
};

export const RAM_MIN_RELATIVE_SPEED = 14;
export const VEHICLE_TUNING: Record<RamVehicleClass, {
  speedLossRatio: number;
  minSpeedLoss: number;
  maxSpeedLoss: number;
  launchMultiplier: number;
}> = {
  car: {
    speedLossRatio: 0.1,
    minSpeedLoss: 2,
    maxSpeedLoss: 4,
    launchMultiplier: 1.15,
  },
  truck: {
    speedLossRatio: 0.16,
    minSpeedLoss: 2.5,
    maxSpeedLoss: 5.5,
    launchMultiplier: 1,
  },
  heavy: {
    speedLossRatio: 0.2,
    minSpeedLoss: 3,
    maxSpeedLoss: 7,
    launchMultiplier: 0.92,
  },
};

export const SIDE_TARGET_OFFSET = 2.1;
export const SCORE_TIE_MARGIN = 0.16;
export const CENTER_TARGET_DEAD_ZONE = 0.32;
export const STEERING_DEAD_ZONE = 0.18;
export const TRACK_START_Z = -3.4;
export const PASS_COMPLETE_Z = 2.7;
export const MIN_CENTER_DISTANCE = 1.8;
export const MAX_CENTER_DISTANCE = 2.65;
export const MIN_PLAYER_SPEED = 16;
export const MIN_RELATIVE_SPEED = 5;
