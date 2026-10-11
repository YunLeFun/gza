import { distance, type Destination, type Point, type RoadNetwork, type Route } from "./map";
import type { RideSurface } from "./surfaces";
import type { RideInput } from "./input";
import { RIDE_TUNING } from "../config/district/ride";
import { DELIVERY_RULES } from "../config/district/delivery";
import type { WaterKind } from "./waterTravel";

export interface RideState extends Point {
  height: number; pitch: number; yaw: number; speed: number; distance: number; elapsed: number; lean: number;
  road: string; offRoad: boolean; collision: boolean; arrived: boolean;
  boostRemaining: number; boostCooldown: number;
  waterKind: WaterKind; waterY: number;
}
export function createRideState(start: Point, yaw: number): RideState {
  return { x: start.x, z: start.z, height: 0, pitch: 0, yaw, speed: 0, distance: 0, elapsed: 0, lean: 0, road: "", offRoad: false, collision: false, arrived: false, boostRemaining: 0, boostCooldown: 0, waterKind: null, waterY: 0 };
}
/** Cooldown starts when the item is activated. */
export function activateRideBoost(state: RideState): boolean {
  if (state.boostRemaining > 0 || state.boostCooldown > 0) return false;
  state.boostRemaining = RIDE_TUNING.boostDuration;
  state.boostCooldown = RIDE_TUNING.boostCooldown;
  return true;
}
type Move = (dx: number, dz: number) => Point & { height?: number; bridgeName?: string; waterKind?: WaterKind; waterY?: number };
const approach = (value: number, target: number, amount: number) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
/** Signed speed drives both travel and bicycle steering; braking never engages reverse. */
export function stepRide(state: RideState, input: RideInput, dt: number, move: Move, network: RoadNetwork, surfaceAt?: (p: Point) => RideSurface) {
  const steer = Math.max(-1, Math.min(1, Number(input.steerRight) - Number(input.steerLeft) + input.steerAxis));
  const nearby = network.nearest(state, false);
  const wet = state.waterKind !== null;
  state.offRoad = wet || Math.abs(state.height) > 0.1 ? false : surfaceAt ? surfaceAt(state) === "grass" : nearby.distance > nearby.edge.width / 2 + 2;
  const boosting = state.boostRemaining > 0;
  const max = wet ? RIDE_TUNING.waterSpeed : state.offRoad ? RIDE_TUNING.grassSpeed : boosting ? RIDE_TUNING.boostSpeed : RIDE_TUNING.forwardSpeed;
  if (wet && Math.abs(state.speed) > max) state.speed = approach(state.speed, Math.sign(state.speed) * max, RIDE_TUNING.waterDeceleration * dt);
  if (input.brake || (input.accelerate && input.reverse)) {
    state.speed = approach(state.speed, 0, RIDE_TUNING.brake * dt);
  } else if ((input.accelerate && state.speed < 0) || (input.reverse && state.speed > 0)) {
    // Reversing the motor first stops the scooter; a step cannot cross through zero.
    state.speed = approach(state.speed, 0, RIDE_TUNING.directionBrake * dt);
  } else if (input.reverse) {
    const limit = Math.min(RIDE_TUNING.reverseSpeed, wet ? max : Infinity);
    state.speed = state.speed < -limit ? approach(state.speed, -limit, RIDE_TUNING.overspeedDeceleration * dt)
      : Math.max(-limit, state.speed - RIDE_TUNING.reverseAcceleration * dt);
  } else if (input.accelerate) {
    const acceleration = (wet ? RIDE_TUNING.waterAcceleration : state.offRoad ? RIDE_TUNING.grassAcceleration : boosting ? RIDE_TUNING.boostAcceleration : RIDE_TUNING.acceleration) * (1 - 0.45 * (state.speed / max) ** 2);
    // Surface changes ease down excess speed instead of clamping it instantly.
    state.speed = state.speed > max ? approach(state.speed, max, RIDE_TUNING.overspeedDeceleration * dt) : Math.min(max, state.speed + acceleration * dt);
  } else {
    state.speed = approach(state.speed, 0, (RIDE_TUNING.coastDeceleration + Math.abs(state.speed) * (wet ? RIDE_TUNING.waterDrag : state.offRoad ? RIDE_TUNING.grassDrag : RIDE_TUNING.roadDrag)) * dt);
  }
  state.lean += (steer - state.lean) * Math.min(1, 8 * dt);
  const yawLimit = 1.55 / (1 + Math.max(0, Math.abs(state.speed) - 8) * 0.035);
  const turning = state.speed * Math.tan(steer * 0.62) / 1.8;
  // Positive yaw follows the Three camera's left turn; steering right reduces yaw.
  state.yaw -= Math.max(-yawLimit, Math.min(yawLimit, turning)) * dt;
  const dx = -Math.sin(state.yaw) * state.speed * dt, dz = -Math.cos(state.yaw) * state.speed * dt;
  const actual = move(dx, dz), moved = Math.hypot(actual.x, actual.z);
  const nextHeight = actual.height ?? 0;
  const slope = moved > 0.001 ? Math.atan2(nextHeight - state.height, moved) * Math.sign(state.speed) : state.pitch;
  state.pitch += (slope - state.pitch) * Math.min(1, 6 * dt); state.height = nextHeight;
  state.waterKind = actual.waterKind ?? null; state.waterY = actual.waterY ?? 0;
  state.x += actual.x; state.z += actual.z;
  state.collision = Math.abs(state.speed) > 0.8 && moved < Math.abs(state.speed) * dt * 0.55;
  if (state.collision) state.speed *= 0.45;
  state.distance += moved; state.elapsed += dt;
  // Snap tiny fixed-step rounding remnants to zero so the item is ready on time.
  state.boostRemaining = state.boostRemaining <= dt + 1e-9 ? 0 : state.boostRemaining - dt;
  state.boostCooldown = state.boostCooldown <= dt + 1e-9 ? 0 : state.boostCooldown - dt;
  state.road = state.waterKind === "pool" ? "TIT 广场浅水池" : state.waterKind === "river" ? "珠江水域" : actual.bridgeName || nearby.edge.road.name || (nearby.edge.road.kind === "service" ? "园区巷道" : "街区支路");
}

export function navigation(route: Route | null, state: Point & { waterKind?: WaterKind }, target: Destination | null) {
  if (state.waterKind) return { text: state.waterKind === "pool" ? "浅水池探索 · 从低池沿骑出即可上岸" : "水域探索 · 沿下水坡道返回岸上", remaining: 0, arrived: false, offRoute: false };
  if (!target) return { text: "自由探索 · 地图选点可导航", remaining: 0, arrived: false, offRoute: false };
  if (!route) return { text: "此处暂不连通，换一个目的地", remaining: 0, arrived: false, offRoute: false };
  let index = 0, best = Infinity, progress = 0, walked = 0;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1]!, b = route.points[i]!, length = distance(a, b);
    const t = length ? Math.max(0, Math.min(1, ((state.x - a.x) * (b.x - a.x) + (state.z - a.z) * (b.z - a.z)) / length ** 2)) : 0;
    const d = distance(state, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    if (d < best) { best = d; index = i; progress = walked + length * t; }
    walked += length;
  }
  const remaining = Math.max(0, walked - progress), arrived = distance(state, target) < (target.id === "mcdonalds" ? DELIVERY_RULES.restaurantPickupRadius : 10);
  if (arrived) return { text: `已到达 ${target.name} · 继续自由骑行`, remaining: 0, arrived: true, offRoute: false };
  if (best > 20) return { text: "已偏离路线 · 正在重新规划", remaining, arrived: false, offRoute: true };
  let until = distance(state, route.points[index]!);
  for (let i = index; i < route.points.length - 1; i++) {
    const a = route.points[i - 1]!, b = route.points[i]!, c = route.points[i + 1]!;
    const u = { x: b.x - a.x, z: b.z - a.z }, v = { x: c.x - b.x, z: c.z - b.z };
    const angle = Math.atan2(u.x * v.z - u.z * v.x, u.x * v.x + u.z * v.z);
    if (Math.abs(angle) > 0.48) return { text: `${Math.round(until)} m 后${angle > 0 ? "右转" : "左转"} · ${route.roads[i] || "街区巷道"}`, remaining, arrived: false, offRoute: false };
    until += distance(b, c);
  }
  return { text: `沿路前行 · ${target.name}`, remaining, arrived: false, offRoute: false };
}
