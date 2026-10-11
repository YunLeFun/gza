import { CITY_RULES, cityLineWalkable, citySegmentDistance, isCityWalkable } from './cityWorld';
import type { CityInput, CityPlayerSnapshot, CityPoint, CityVehicleSeat, CityVehicleSnapshot, CityWorld } from './cityTypes';
import { VEHICLE_INTERACTION_RULES, nearestBoardableVehicle, vehicleDismountCandidates, vehicleLocalPoint } from './vehicleBoarding';

export const CITY_VEHICLE_RULES = {
  spawnVehicles: 2, maxVehicles: 11, health: 100, boardDistance: VEHICLE_INTERACTION_RULES.boardDistance, interactSpeed: VEHICLE_INTERACTION_RULES.interactSpeed,
  maxSpeed: 12, reverseSpeed: 4, acceleration: 7, braking: 18, coast: 4, steerRate: 1.8,
  bodyRadius: .42, bodyOffset: .75, driverSeatZ: .22, passengerSeatZ: .9, attackDamage: 5,
  collisionDamage: 8, collisionSpeed: 5, collisionCooldownMs: 1000,
} as const;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const wrap = (yaw: number) => Math.atan2(Math.sin(yaw), Math.cos(yaw));
const approach = (n: number, goal: number, step: number) => n < goal ? Math.min(goal, n + step) : Math.max(goal, n - step);
const localPoint = vehicleLocalPoint;
export function cityVehicleSeatPosition(vehicle: CityVehicleSnapshot, seat: CityVehicleSeat) {
  const p = localPoint(vehicle, 0, -(seat === 'driver' ? CITY_VEHICLE_RULES.driverSeatZ : CITY_VEHICLE_RULES.passengerSeatZ));
  return { ...p, y: vehicle.y };
}
/** The entire scooter footprint must remain on supported, unobstructed city ground. */
export function canPlaceCityVehicle(world: CityWorld, vehicle: Pick<CityVehicleSnapshot, 'x' | 'z' | 'yaw'>) {
  return [-CITY_VEHICLE_RULES.bodyOffset, 0, CITY_VEHICLE_RULES.bodyOffset]
    .every(forward => isCityWalkable(world, localPoint(vehicle, 0, forward), CITY_VEHICLE_RULES.bodyRadius));
}
function vehicleAxis(vehicle: Pick<CityVehicleSnapshot, 'x' | 'z' | 'yaw'>) {
  return [localPoint(vehicle, 0, -CITY_VEHICLE_RULES.bodyOffset), localPoint(vehicle, 0, CITY_VEHICLE_RULES.bodyOffset)] as const;
}
export function cityVehicleBlocksPoint(vehicle: CityVehicleSnapshot, point: CityPoint, radius: number = CITY_RULES.playerRadius) {
  const [a, b] = vehicleAxis(vehicle);
  return citySegmentDistance(point, a, b) < CITY_VEHICLE_RULES.bodyRadius + radius;
}
/** Chassis capsules, so end-on contact and narrow side-by-side parking agree. */
export function cityVehiclesOverlap(first: CityVehicleSnapshot, second: CityVehicleSnapshot) {
  const [a, b] = vehicleAxis(first), [c, d] = vehicleAxis(second);
  const ux = b.x - a.x, uz = b.z - a.z, vx = d.x - c.x, vz = d.z - c.z, det = ux * vz - uz * vx;
  if (Math.abs(det) > 1e-9) {
    const dx = c.x - a.x, dz = c.z - a.z, t = (dx * vz - dz * vx) / det, s = (dx * uz - dz * ux) / det;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return true;
  }
  return Math.min(citySegmentDistance(a, c, d), citySegmentDistance(b, c, d), citySegmentDistance(c, a, b), citySegmentDistance(d, a, b))
    < CITY_VEHICLE_RULES.bodyRadius * 2;
}
/** A pure UI hint; the authority repeats every check before claiming a seat. */
export function nearestCityVehicle(player: Pick<CityPlayerSnapshot, 'x' | 'y' | 'z'>, vehicles: readonly CityVehicleSnapshot[], world?: CityWorld) {
  return nearestBoardableVehicle({ ...player, height: player.y }, vehicles, {
    pose: v => ({ ...v, height: v.y }), speed: v => v.speed, id: v => v.id,
    admit: v => v.health > 0 && (!v.driverId || !v.passengerId)
      && (!world || cityLineWalkable(world, player, v, CITY_RULES.playerRadius)),
  });
}
/** Try both sides and ends; refusing an exit never changes the seat or vehicle. */
export function cityDismountPoint(world: CityWorld, vehicle: CityVehicleSnapshot, seat: CityVehicleSeat = 'driver', vehicles: readonly CityVehicleSnapshot[] = []) {
  const forward = -(seat === 'passenger' ? CITY_VEHICLE_RULES.passengerSeatZ : CITY_VEHICLE_RULES.driverSeatZ);
  for (const candidate of vehicleDismountCandidates({ ...vehicle, height: vehicle.y }, { seatForward: forward }).slice(0, 6)) {
    const p = { x: candidate.x, z: candidate.z };
    if (isCityWalkable(world, p) && cityLineWalkable(world, vehicle, p, CITY_RULES.playerRadius)
      && !vehicles.some(other => other.id !== vehicle.id && cityVehicleBlocksPoint(other, p))) return { ...p, y: vehicle.y };
  }
  return null;
}
export function createCityVehicles(world: CityWorld): CityVehicleSnapshot[] {
  const spawn: CityVehicleSnapshot[] = [], parking: CityVehicleSnapshot[] = [];
  const canAdmit = (candidate: CityVehicleSnapshot, vehicles: readonly CityVehicleSnapshot[]) => {
    if (!canPlaceCityVehicle(world, candidate) || vehicles.some(v => cityVehiclesOverlap(v, candidate))) return false;
    const parked = [...vehicles, candidate];
    if (!parked.every(v => cityDismountPoint(world, v, 'driver', parked) && cityDismountPoint(world, v, 'passenger', parked))) return false;
    return true;
  };
  // Reserve named bays before placing the two nearby scooters, so starting at
  // a landmark cannot displace its fixed parking stock. Spawn IDs stay 1/2.
  for (const site of world.scooterParking ?? []) for (const slot of site.slots) {
    if (parking.length >= CITY_VEHICLE_RULES.maxVehicles - CITY_VEHICLE_RULES.spawnVehicles) break;
    if (parking.some(v => v.parkingSiteId === site.id && v.parkingSlotId === slot.id)) continue;
    const candidate: CityVehicleSnapshot = { id: CITY_VEHICLE_RULES.spawnVehicles + parking.length + 1,
      x: slot.x, y: 0, z: slot.z, yaw: slot.yaw, speed: 0, health: CITY_VEHICLE_RULES.health,
      maxHealth: CITY_VEHICLE_RULES.health, driverId: null, passengerId: null, parkingSiteId: site.id, parkingSlotId: slot.id };
    if (canAdmit(candidate, parking)) parking.push(candidate);
  }
  const offsets = [[-1.8, 0], [1.8, 0], [-3, 0], [3, 0], [0, 3], [0, -3], [-4, 2], [4, 2], [0, 5], [0, -5],
    [-6, 0], [6, 0], [0, 6], [0, -6], [-5, 3], [5, 3], [-5, -3], [5, -3]];
  for (const [side, forward] of offsets) {
    const p = localPoint(world.spawn, side!, forward!);
    const candidate: CityVehicleSnapshot = { ...p, y: 0, yaw: world.spawn.yaw, id: spawn.length + 1,
      speed: 0, health: CITY_VEHICLE_RULES.health, maxHealth: CITY_VEHICLE_RULES.health, driverId: null, passengerId: null };
    if (!cityLineWalkable(world, world.spawn, p, CITY_RULES.playerRadius)
      || spawn.some(v => Math.hypot(v.x - p.x, v.z - p.z) < 2.5) || !canAdmit(candidate, [...spawn, ...parking])) continue;
    spawn.push(candidate); if (spawn.length === CITY_VEHICLE_RULES.spawnVehicles) break;
  }
  return [...spawn, ...parking];
}
export type CityVehicleDriveInput = Pick<CityInput, 'throttle' | 'steer' | 'brake'>;
export interface CityVehicleStep { vehicle: CityVehicleSnapshot; collided: boolean; impactSpeed: number }
/** Swept city collision, independent of any fixed delivery route or corridor. */
export function stepCityVehicle(world: CityWorld, source: CityVehicleSnapshot, input: CityVehicleDriveInput, dt = 1 / CITY_RULES.tickRate): CityVehicleStep {
  const vehicle = { ...source }, seconds = Number.isFinite(dt) ? clamp(dt, 0, 1 / CITY_RULES.tickRate) : 0;
  if (!seconds || !vehicle.health) return { vehicle: { ...vehicle, ...(vehicle.health ? {} : { speed: 0 }) }, collided: false, impactSpeed: 0 };
  const throttle = Number.isFinite(input.throttle) ? clamp(input.throttle ?? 0, -1, 1) : 0;
  const steer = Number.isFinite(input.steer) ? clamp(input.steer ?? 0, -1, 1) : 0;
  if (input.brake || throttle * vehicle.speed < 0) vehicle.speed = approach(vehicle.speed, 0, CITY_VEHICLE_RULES.braking * seconds);
  else if (throttle) vehicle.speed = clamp(vehicle.speed + throttle * CITY_VEHICLE_RULES.acceleration * seconds, -CITY_VEHICLE_RULES.reverseSpeed, CITY_VEHICLE_RULES.maxSpeed);
  else vehicle.speed = approach(vehicle.speed, 0, CITY_VEHICLE_RULES.coast * seconds);
  const distance = vehicle.speed * seconds, impactSpeed = Math.abs(vehicle.speed);
  const yaw = wrap(vehicle.yaw - steer * CITY_VEHICLE_RULES.steerRate * seconds * clamp(vehicle.speed / 4, -1, 1));
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / .1));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, pose = { ...vehicle, x: source.x - Math.sin(yaw) * distance * t, z: source.z - Math.cos(yaw) * distance * t, yaw };
    if (!canPlaceCityVehicle(world, pose)) return { vehicle: { ...vehicle, speed: 0 }, collided: true, impactSpeed };
    vehicle.x = pose.x; vehicle.z = pose.z; vehicle.yaw = pose.yaw;
  }
  return { vehicle, collided: false, impactSpeed: 0 };
}
