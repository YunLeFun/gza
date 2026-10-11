import type { CoopMap, CoopResource, CoopWeapon } from "./types";
import { getCoopRouteFrame, getCoopRouteLength } from "./route";
import { GUANGZHOU_COOP_ROUTE_ID, GUANGZHOU_COOP_ROUTE_LENGTH, GUANGZHOU_COOP_ROUTE_POINTS, GUANGZHOU_COOP_ROUTE_STOPS } from "./guangzhouRouteData";

/** Ground is Y=0; forward is -Z. The straight route takes five minutes at maximum speed. */
export const COOP_MAP: CoopMap = {
  roadWidth: 16, halfWidth: 8, roadLength: 5400, exitZ: -5400,
  supplies: [{ id: 1, z: -1350 }, { id: 2, z: -2700 }, { id: 3, z: -4050 }],
  obstacles: [
    { id: "barrier-1", x: -4, z: -340, width: 5, depth: 2, height: 1.8 },
    { id: "barrier-2", x: 4, z: -680, width: 5, depth: 2, height: 1.8 },
    { id: "barrier-3", x: -3, z: -1120, width: 4, depth: 2, height: 1.8 },
    { id: "barrier-4", x: 3, z: -1720, width: 4, depth: 2, height: 1.8 },
    { id: "barrier-5", x: -4, z: -2240, width: 5, depth: 2, height: 1.8 },
    { id: "barrier-6", x: 4, z: -3150, width: 5, depth: 2, height: 1.8 },
    { id: "barrier-7", x: -3, z: -3620, width: 4, depth: 2, height: 1.8 },
    { id: "barrier-8", x: 3, z: -4490, width: 4, depth: 2, height: 1.8 },
    { id: "barrier-9", x: -4, z: -4930, width: 5, depth: 2, height: 1.8 },
  ],
};

export const COOP_RULES = {
  tickRate: 60, durationMs: 480_000, maxZombies: 32, maxEvents: 64,
  maxSpeed: 18, acceleration: 6, braking: 18, coast: 2, steerRate: 1.4,
  vehicleRadius: 0.7, health: 100, supplyRadius: 6, supplySpeed: 0.6,
  deliveryRadius: 6, deliverySpeed: 0.6, deliveryMs: 2000,
  resourceRadius: 4, resourceSpeed: 0.6, maxResources: 12,
  vehicleFrontZ: -0.8, vehicleRearZ: 1.4, vehicleBodyRadius: 0.4, zombieRadius: 0.5,
  aimYawLimit: 85 * Math.PI / 180, aimPitchLimit: 40 * Math.PI / 180,
  kickCooldown: 0.7, kickRange: 2.4, kickDamage: 70,
  spawnInterval: 1.1, maxCatchupSeconds: 0.25,
  lagCompensationTicks: 15,
  inputTimeoutMs: 500,
  maxPendingShots: 16,
} as const;

/** Repairs and ammunition remain bounded by the existing vehicle and weapon capacities. */
export const COOP_RESOURCE_EFFECTS = {
  repair: 25,
  ammo: { smg: 60, shotgun: 12, "feather-duster": 0, "gas-cylinder": 1, slingshot: 20 },
} as const satisfies { repair: number; ammo: Record<CoopWeapon, number> };

// Backward-compatible exports; city combat does not load driving-route data.
export { COOP_WEAPON_ORDER, isCoopWeapon, COOP_WEAPONS } from "./weapons";

/** Matches the world scooter and passenger rig's seat, receiver and barrel-tip offsets. */
export const COOP_GUNNER_LAYOUT = {
  rideHeight: 1.27, seatY: -0.65, seatZ: 0.9,
  pivotY: 0.14, upperY: -0.14, turnDistance: 0.13, turnLean: 0.36,
  weaponX: 0.34, weaponY: 0.56, weaponZ: -0.045, weaponLeanDistance: 0.35,
  muzzleY: 0.025, muzzleZ: -0.565,
} as const;

const guangzhouBase: CoopMap = {
  id: GUANGZHOU_COOP_ROUTE_ID,
  path: GUANGZHOU_COOP_ROUTE_POINTS.map(([x, z, width]) => ({ x, z, width })),
  roadWidth: 12, halfWidth: 6, roadLength: GUANGZHOU_COOP_ROUTE_LENGTH,
  exitZ: GUANGZHOU_COOP_ROUTE_STOPS.at(-1)!.z,
  supplies: GUANGZHOU_COOP_ROUTE_STOPS.slice(1, -1).map((stop, index) => ({ id: index + 1, x: stop.x, z: stop.z, distance: stop.distance })),
  delivery: { id: "guangzhou-tencent-order", name: "腾讯广州大厦", x: GUANGZHOU_COOP_ROUTE_STOPS.at(-1)!.x,
    z: GUANGZHOU_COOP_ROUTE_STOPS.at(-1)!.z, distance: GUANGZHOU_COOP_ROUTE_LENGTH },
  obstacles: [],
};
function guangzhouObstacles() {
  const candidates: number[] = []; let distance = 0;
  for (let index = 0; index < guangzhouBase.path!.length - 1; index++) {
    const from = guangzhouBase.path![index]!, to = guangzhouBase.path![index + 1]!;
    const span = Math.hypot(to.x - from.x, to.z - from.z), midpoint = distance + span / 2;
    // Midpoints of long streets avoid junctions, the overlapping tower return, and stop entrances.
    if (span >= 45 && from.width >= 6 && midpoint > 180 && midpoint < guangzhouBase.roadLength - 150
      && !(midpoint > 1350 && midpoint < 1850)
      && guangzhouBase.supplies.every(supply => Math.abs(supply.distance! - midpoint) > 100)) candidates.push(midpoint);
    distance += span;
  }
  return [340, 680, 1120, 2150, 2480, 3650, 4050, 4450, 5080].map((target, index) => {
    const best = candidates.reduce((nearest, value) => Math.abs(value - target) < Math.abs(nearest - target) ? value : nearest);
    candidates.splice(candidates.indexOf(best), 1);
    const frame = getCoopRouteFrame(guangzhouBase, best), offset = (index % 2 ? 1 : -1) * (frame.width / 2 - 0.7);
    return { id: `guangzhou-barrier-${index + 1}`, x: frame.x + frame.normalX * offset,
      z: frame.z + frame.normalZ * offset, width: 1.2, depth: 1.2, height: 1.3 };
  });
}
function guangzhouResources(): CoopResource[] {
  return [260, 980, 2050, 2920, 3830, 4860].map((distance, index) => {
    const frame = getCoopRouteFrame(guangzhouBase, distance);
    // Boxes sit within the existing road corridor; no new map or walkable area is needed.
    const offset = (index % 2 ? 1 : -1) * Math.min(2.5, frame.width / 2 - 0.8);
    return { id: index + 1, kind: index % 2 ? "repair" : "ammo", distance,
      x: frame.x + frame.normalX * offset, z: frame.z + frame.normalZ * offset };
  });
}
/** Authored 5.4 km delivery route in the shipped Guangzhou world coordinate system. */
export const GUANGZHOU_COOP_MAP: CoopMap = { ...guangzhouBase,
  delivery: { ...guangzhouBase.delivery!, distance: getCoopRouteLength(guangzhouBase) },
  obstacles: guangzhouObstacles(), resources: guangzhouResources() };
