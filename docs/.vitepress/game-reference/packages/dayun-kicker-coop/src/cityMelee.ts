import { CITY_RULES, cityBuildingRayDistance, moveCityPlayer } from './cityWorld';
import type { CityMeleeTool, CityPlayerSnapshot, CityWorld, CityZombieSnapshot } from './cityTypes';

/** Shared tuning only; damage and target selection are always resolved by the authority. */
export const CITY_MELEE_TOOLS = {
  broom: { name: '扫把', range: 2.25, halfAngle: Math.PI * .4, damage: 35, cooldownMs: 650, swingMs: 220, knockback: 1.1, staggerMs: 180 },
  umbrella: { name: '雨伞', range: 2.8, halfAngle: Math.PI / 10, damage: 25, cooldownMs: 380, swingMs: 150, knockback: .45, staggerMs: 100 },
  'frying-pan': { name: '平底锅', range: 1.8, halfAngle: Math.PI / 4, damage: 55, cooldownMs: 1000, swingMs: 300, knockback: 1.65, staggerMs: 260 },
  'pot-lid': { name: '锅盖', range: 1.7, halfAngle: Math.PI / 3, damage: 12, cooldownMs: 800, swingMs: 200, knockback: .9, staggerMs: 150 },
} as const;
export const CITY_MELEE_ORDER: readonly CityMeleeTool[] = ['broom', 'umbrella', 'frying-pan', 'pot-lid'];
export const isCityMeleeTool = (value: unknown): value is CityMeleeTool => typeof value === 'string' && Object.hasOwn(CITY_MELEE_TOOLS, value);
export const CITY_MELEE = { ...CITY_MELEE_TOOLS.broom, heightTolerance: 1.25, maxCooldownMs: 1000,
  guardMs: 200, guardReduction: .7, guardHalfAngle: Math.PI / 3 } as const;

/** Guard direction is frozen on accepted attack; neither aim changes nor tool switching can extend it. */
export function cityMeleeGuarded(player: CityPlayerSnapshot, zombie: CityZombieSnapshot) {
  if (player.meleeTool !== 'pot-lid' || player.guardMs <= 0 || player.downed || !player.connected || player.health <= 0) return false;
  const dx = zombie.x - player.x, dz = zombie.z - player.z, distance = Math.hypot(dx, dz);
  return distance > 1e-8 && (-Math.sin(player.guardYaw) * dx - Math.cos(player.guardYaw) * dz) / distance >= Math.cos(CITY_MELEE.guardHalfAngle);
}

export function cityMeleeCanHit(world: CityWorld, player: CityPlayerSnapshot, zombie: CityZombieSnapshot) {
  if (player.downed || player.health <= 0 || !player.connected || zombie.health <= 0
    || Math.abs(player.y - zombie.y) > CITY_MELEE.heightTolerance) return false;
  const spec = CITY_MELEE_TOOLS[player.meleeTool];
  const dx = zombie.x - player.x, dz = zombie.z - player.z, distance = Math.hypot(dx, dz);
  if (distance > spec.range || distance < 1e-8) return false;
  const facing = (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) / distance;
  if (facing < Math.cos(spec.halfAngle) - 1e-8) return false;
  return cityBuildingRayDistance(world, { x: player.x, y: player.y + 1, z: player.z },
    { x: dx / distance, y: 0, z: dz / distance }, distance) >= distance;
}

/** Reuse sub-stepped swept movement, retaining building/water/road/bounds collision and the zombie radius. */
export function cityMeleeKnockback(world: CityWorld, player: CityPlayerSnapshot, zombie: CityZombieSnapshot) {
  const dx = zombie.x - player.x, dz = zombie.z - player.z, distance = Math.hypot(dx, dz);
  if (distance < 1e-8) return { x: zombie.x, z: zombie.z };
  return moveCityPlayer(world, zombie, dx / distance, dz / distance, .25, CITY_MELEE_TOOLS[player.meleeTool].knockback / .25, CITY_RULES.zombieRadius);
}
