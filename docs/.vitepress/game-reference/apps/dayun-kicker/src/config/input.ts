import type { DigitalAction } from "../game/input";
import type { RideAction } from "../district/input";

export const ACTION_KEYS: Record<string, DigitalAction> = {
  KeyW: "accelerate",
  ArrowUp: "accelerate",
  KeyS: "brake",
  ArrowDown: "brake",
  KeyA: "steerLeft",
  ArrowLeft: "steerLeft",
  KeyD: "steerRight",
  ArrowRight: "steerRight",
};

export const RIDE_KEYS: Record<string, RideAction> = {
  ...ACTION_KEYS,
  KeyS: "reverse",
  ArrowDown: "reverse",
  ShiftLeft: "brake",
  ShiftRight: "brake",
};

/** Exploration follows GTA-style view/vehicle keys; race item input stays F. */
export const EXPLORATION_KEYS = {
  view: "KeyV", vehicle: "KeyF", mirror: "KeyB", inventory: "KeyI", boost: "KeyZ",
} as const;

export const KICK_INPUT_BUFFER_MS = 120;

/** Browser standard mapping (Xbox labels; equivalent physical buttons on other pads). */
export const GAMEPAD_INPUT = {
  deadzone: 0.16,
  lookDeadzone: 0.2,
  triggerThreshold: 0.15,
  navigationThreshold: 0.55,
  repeatDelayMs: 350,
  repeatIntervalMs: 140,
  lookRadiansPerSecond: 1.2,
  buttons: { confirm: 0, meleeModifier: 0, cancel: 1, smartKick: 1, item: 2, interact: 3, kickLeft: 4, kickRight: 5,
    handbrake: 5, tankFire: 4, brake: 6, accelerate: 7, map: 8, pause: 9, turnAround: 10, mirror: 11,
    up: 12, down: 13, left: 14, right: 15 },
} as const;

/** Pointer-look sensitivity in radians per pixel, and angle limits in radians. */
export const LOOK_INPUT = {
  sensitivityX: 0.0017,
  sensitivityY: 0.0012,
  minX: -0.32,
  maxX: 0.32,
  minY: -0.16,
  maxY: 0.13,
  releaseDamping: 0.55,
} as const;

/** Vibration durations in milliseconds. */
export const HAPTICS = {
  tap: 10,
  kick: 18,
  hit: [22, 24, 34],
  collision: [34, 18, 48],
  ram: [28, 16, 42],
  nearMiss: [8, 18, 12],
  checkpoint: [14, 22, 18],
} as const;
