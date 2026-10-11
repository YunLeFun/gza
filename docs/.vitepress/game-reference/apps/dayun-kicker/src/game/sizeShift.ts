import { NORMAL_TUNING, SIZE_SHIFT_TUNING } from "../config/gameplay/combat";
import type { SizeMode } from "./types";

export interface SizeShiftTuning {
  visualScale: number;
  cameraHeightOffset: number;
  steeringMultiplier: number;
  collisionMultiplier: number;
  underpassEnabled: boolean;
  kickRangeMultiplier: number;
  kickPowerMultiplier: number;
  ramPowerMultiplier: number;
  kickCooldownMultiplier: number;
}

export function getSizeShiftTuning(mode: SizeMode | null) {
  return mode ? SIZE_SHIFT_TUNING[mode] : NORMAL_TUNING;
}
