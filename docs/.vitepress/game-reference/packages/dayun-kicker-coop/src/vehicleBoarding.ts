/** Lightweight interaction rules shared by free roaming and zombie breakout. */
import { VEHICLE_INTERACTION_RULES } from './vehicleInteractionRules';
export { VEHICLE_INTERACTION_RULES } from './vehicleInteractionRules';

export interface VehicleInteractionPoint { x: number; z: number; height?: number }
export interface VehicleInteractionPose extends VehicleInteractionPoint { yaw: number }
export interface VehicleBoardingOptions { distance?: number; speed?: number }
export interface VehicleDismountOptions { sideDistance?: number; endDistance?: number; seatForward?: number }

/** Forward is along the vehicle's negative Z axis, matching both riding rigs. */
export function vehicleLocalPoint(vehicle: VehicleInteractionPose, side: number, forward: number) {
  return { x: vehicle.x + Math.cos(vehicle.yaw) * side - Math.sin(vehicle.yaw) * forward,
    z: vehicle.z - Math.sin(vehicle.yaw) * side - Math.cos(vehicle.yaw) * forward };
}

export function canBoardVehicle(person: VehicleInteractionPoint, vehicle: VehicleInteractionPoint, options: VehicleBoardingOptions = {}) {
  const distance = options.distance ?? VEHICLE_INTERACTION_RULES.boardDistance;
  return Number.isFinite(distance) && distance >= 0 && Number.isFinite(options.speed ?? 0)
    && Math.abs(options.speed ?? 0) <= VEHICLE_INTERACTION_RULES.interactSpeed
    && Math.hypot(person.x - vehicle.x, person.z - vehicle.z) <= distance
    && Math.abs((person.height ?? 0) - (vehicle.height ?? 0)) <= VEHICLE_INTERACTION_RULES.maxHeightDifference;
}

/** Pure candidate geometry; each mode checks its ground and collision authority. */
export function vehicleDismountCandidates(vehicle: VehicleInteractionPose, options: VehicleDismountOptions = {}) {
  const side = options.sideDistance ?? 1.3, end = options.endDistance ?? 1.8;
  const forward = options.seatForward ?? 0;
  const offsets: [number, number][] = [[-side, forward], [side, forward]];
  if (forward) offsets.push([-side, 0], [side, 0]);
  offsets.push([0, end], [0, -end], [-side, 1], [side, 1]);
  return offsets.map(([across, along]) => ({ ...vehicleLocalPoint(vehicle, across, along), height: vehicle.height ?? 0 }));
}

/** Filter before sorting so a blocked closest vehicle cannot hide a usable one. */
export function nearestBoardableVehicle<T>(person: VehicleInteractionPoint, vehicles: readonly T[], options: {
  pose: (vehicle: T) => VehicleInteractionPoint;
  speed?: (vehicle: T) => number;
  distance?: (vehicle: T) => number | undefined;
  admit?: (vehicle: T) => boolean;
  id?: (vehicle: T) => string | number;
}) {
  return vehicles.filter(vehicle => canBoardVehicle(person, options.pose(vehicle), {
    speed: options.speed?.(vehicle), distance: options.distance?.(vehicle),
  }) && (options.admit?.(vehicle) ?? true)).sort((a, b) => {
    const first = options.pose(a), second = options.pose(b);
    const delta = Math.hypot(first.x - person.x, first.z - person.z) - Math.hypot(second.x - person.x, second.z - person.z);
    if (delta || !options.id) return delta;
    const firstId = options.id(a), secondId = options.id(b);
    return typeof firstId === 'number' && typeof secondId === 'number' ? firstId - secondId : String(firstId).localeCompare(String(secondId));
  })[0] ?? null;
}
