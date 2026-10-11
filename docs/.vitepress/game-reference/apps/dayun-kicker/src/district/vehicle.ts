import type { Point } from "./map";
import type { RideState } from "./ride";
import type { RideInput } from "./input";
import type { WaterKind } from "./waterTravel";
import { CITY_RULES, VEHICLE_INTERACTION_RULES, canBoardVehicle, vehicleDismountCandidates } from "@yunlefun/dayun-kicker-coop";

export interface VehiclePose extends Point { height: number; yaw: number }
export interface WalkSurface { height: number; waterKind: WaterKind; waterY: number; bridgeName?: string; grounded?: boolean }
export const BOARD_DISTANCE = VEHICLE_INTERACTION_RULES.boardDistance;
export const WALK_SPEED = 2.8;
export const SPRINT_SPEED = 5.2;
export const createWalkMotion = () => ({ velocity: 0, grounded: true });

export function canBoard(person: Point, vehicle: VehiclePose, range: number = BOARD_DISTANCE) {
  return canBoardVehicle(person, vehicle, { distance: range });
}

/** Search both sides and both ends, keeping the rider on the same deck. */
export function dismountPoint(vehicle: VehiclePose, surface: (p: Point, height: number) => WalkSurface, clear: (a: Point, b: Point) => boolean, sideDistance = 1.3, endDistance = 1.8) {
  for (const p of vehicleDismountCandidates(vehicle, { sideDistance, endDistance })) {
    const ground = surface(p, vehicle.height);
    if (ground.waterKind === "river" || Math.abs(ground.height - vehicle.height) > VEHICLE_INTERACTION_RULES.maxHeightDifference) continue;
    p.height = ground.height;
    if (clear(vehicle, p)) return { ...p, ...ground };
  }
  return null;
}

export function stepWalk(person: RideState, input: RideInput, dt: number, lookYaw: number,
  surface: (p: Point, height: number) => WalkSurface, move: (dx: number, dz: number, dy?: number) => Point & WalkSurface,
  motion = createWalkMotion()) {
  if (dt <= 0) return;
  // Recovery and teleports restore a ground pose without retaining an old impulse.
  if (!motion.grounded && Math.abs(person.height - surface(person, person.height).height) < .001)
    Object.assign(motion, createWalkMotion());
  const side = input.brake ? 0 : Math.max(-1, Math.min(1, Number(input.steerRight) - Number(input.steerLeft) + (input.steerAxis ?? 0)));
  const forward = input.brake ? 0 : Number(input.accelerate) - Number(Boolean(input.reverse));
  const stride = (input.sprint ? SPRINT_SPEED : WALK_SPEED) * dt / Math.max(1, Math.hypot(side, forward));
  const yaw = person.yaw + lookYaw;
  let dx = (Math.cos(yaw) * side - Math.sin(yaw) * forward) * stride;
  let dz = (-Math.sin(yaw) * side - Math.cos(yaw) * forward) * stride;
  person.speed = 0; person.collision = false; person.lean = 0; person.pitch = 0; person.elapsed += dt;
  if (surface({ x: person.x + dx, z: person.z + dz }, person.height).waterKind === "river") dx = dz = 0;
  if (!dx && !dz && motion.grounded && !(input.jump && !person.waterKind)) return;
  if (input.jump && motion.grounded && !person.waterKind) { motion.velocity = CITY_RULES.jumpSpeed; motion.grounded = false; }
  const dy = motion.grounded ? -.05 : motion.velocity * dt - CITY_RULES.gravity * dt * dt / 2;
  if (!motion.grounded) motion.velocity -= CITY_RULES.gravity * dt;
  const previousHeight = person.height, actual = move(dx, dz, dy);
  person.x += actual.x; person.z += actual.z;
  person.height = actual.height; person.waterKind = actual.waterKind; person.waterY = actual.waterY;
  motion.grounded = actual.grounded ?? actual.height <= surface(person, person.height).height + .06;
  if (motion.grounded || dy > 0 && actual.height < previousHeight + dy - .005) motion.velocity = 0;
  person.speed = Math.hypot(actual.x, actual.z) / dt;
  person.road = actual.bridgeName ?? (actual.waterKind === "pool" ? "浅水池步行" : "步行探索");
}
