import { BOOST_MAX_SPEED } from "../config/gameplay/race";
import { RAM_MIN_RELATIVE_SPEED, VEHICLE_TUNING } from "../config/gameplay/combat";
export interface RamImpactOptions {
  playerSpeed: number;
  targetSpeed: number;
  lateralOffset: number;
  vehicleClass?: RamVehicleClass;
  powerMultiplier?: number;
  random?: () => number;
}

export interface RamContactOptions {
  playerSpeed: number;
  targetSpeed: number;
  lateralOffset: number;
  longitudinalOffset: number;
  collisionMultiplier?: number;
}

export type RamVehicleClass = "car" | "truck" | "heavy";

export interface RamImpactProfile {
  side: -1 | 1;
  relativeSpeed: number;
  score: number;
  speedLoss: number;
  hitStun: number;
  feedbackPower: number;
  linearVelocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
  impulse: { x: number; y: number; z: number };
  torqueImpulse: { x: number; y: number; z: number };
}

export function evaluateRamContact(options: RamContactOptions) {
  const playerSpeed = clamp(finiteOr(options.playerSpeed, 0), 0, BOOST_MAX_SPEED);
  const targetSpeed = clamp(finiteOr(options.targetSpeed, 0), -28, 28);
  const collisionMultiplier = clamp(finiteOr(options.collisionMultiplier, 1), 0.5, 1.5);
  const lateralOffset = Math.abs(finiteOr(options.lateralOffset, Number.POSITIVE_INFINITY));
  const longitudinalOffset = finiteOr(options.longitudinalOffset, Number.POSITIVE_INFINITY);
  const relativeSpeed = Math.abs(-playerSpeed - targetSpeed);
  const frontContact = longitudinalOffset >= -3.05 * collisionMultiplier
    && longitudinalOffset <= 0.55 * collisionMultiplier;
  const lateralContact = lateralOffset < 1.68 * collisionMultiplier;

  if (!frontContact || !lateralContact || relativeSpeed < RAM_MIN_RELATIVE_SPEED) {
    return null;
  }
  return { relativeSpeed };
}

export function calculateRamImpact(options: RamImpactOptions): RamImpactProfile {
  const playerSpeed = clamp(finiteOr(options.playerSpeed, 0), 0, BOOST_MAX_SPEED);
  const targetSpeed = clamp(finiteOr(options.targetSpeed, 0), -28, 28);
  const lateralOffset = clamp(finiteOr(options.lateralOffset, 0), -3, 3);
  const vehicleTuning = VEHICLE_TUNING[options.vehicleClass ?? "truck"];
  const powerMultiplier = clamp(finiteOr(options.powerMultiplier, 1), 0.65, 1.8);
  const roll = clamp(finiteOr(options.random?.() ?? Math.random(), 0.5), 0, 0.999_999);
  const side: -1 | 1 = Math.abs(lateralOffset) < 0.08
    ? roll < 0.5 ? -1 : 1
    : lateralOffset < 0 ? -1 : 1;
  const centerHit = 1 - clamp(Math.abs(lateralOffset) / 1.68, 0, 1);
  const relativeSpeed = clamp(Math.abs(-playerSpeed - targetSpeed), 8, 60);
  const launchScale = vehicleTuning.launchMultiplier * powerMultiplier * (0.88 + centerHit * 0.18);
  const spinVariance = 0.9 + roll * 0.2;

  return {
    side,
    relativeSpeed,
    score: calculateRamScore(relativeSpeed),
    speedLoss: clamp(
      playerSpeed * vehicleTuning.speedLossRatio,
      vehicleTuning.minSpeedLoss,
      vehicleTuning.maxSpeedLoss,
    ),
    hitStun: 1.05 + relativeSpeed * 0.009,
    feedbackPower: clamp(relativeSpeed / 24, 0.65, 2.2),
    linearVelocity: {
      x: side * (4.8 + relativeSpeed * 0.18) * launchScale,
      y: (3.7 + relativeSpeed * 0.09) * launchScale,
      z: -(7.2 + playerSpeed * 0.3 + relativeSpeed * 0.07) * launchScale,
    },
    angularVelocity: {
      x: (1.5 + relativeSpeed * 0.035) * spinVariance,
      y: side * (1.8 + relativeSpeed * 0.045) * spinVariance,
      z: -side * (4.6 + relativeSpeed * 0.09) * spinVariance,
    },
    impulse: {
      x: side * (28 + relativeSpeed * 1.8) * launchScale,
      y: (48 + relativeSpeed * 1.65) * launchScale,
      z: -(52 + playerSpeed * 3.2 + relativeSpeed * 1.1) * launchScale,
    },
    torqueImpulse: {
      x: (14 + relativeSpeed * 0.52) * spinVariance,
      y: side * (22 + relativeSpeed * 0.78) * spinVariance,
      z: -side * (96 + relativeSpeed * 3.2) * launchScale * spinVariance,
    },
  };
}

export function calculateRamScore(relativeSpeed: number) {
  return Math.min(400, Math.round(180 + clamp(finiteOr(relativeSpeed, 0), 0, 60) * 5));
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
