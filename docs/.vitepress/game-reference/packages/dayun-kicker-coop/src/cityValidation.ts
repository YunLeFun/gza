import { parseCoopAppearanceProfile } from './profile';
import { COOP_WEAPONS } from './weapons';
import { CITY_MELEE, isCityMeleeTool } from './cityMelee';
import { CITY_RULES } from './cityWorld';
import { CITY_VEHICLE_RULES } from './cityVehicles';
import { CITY_ROOM_CAPACITY, type CityInput, type CityRoomState, type CitySnapshot } from './cityTypes';
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const number = (v: unknown, min = -1_000_000, max = 1_000_000): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min = 0, max = 0x7fffffff): v is number => number(v, min, max) && Number.isSafeInteger(v);
const text = (v: unknown, max = 128): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const skin = (v: unknown) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v);
const vector = (v: unknown) => record(v) && number(v.x) && number(v.y, -20, 1000) && number(v.z);
const direction = (v: unknown) => record(v) && number(v.x, -1, 1) && number(v.y, -1, 1) && number(v.z, -1, 1)
  && Math.abs(Math.hypot(v.x, v.y, v.z) - 1) <= 1e-5;
export const isCityWeapon = (v: unknown): v is 'smg' | 'shotgun' => v === 'smg' || v === 'shotgun';
/** Reject malformed input and normalize diagonal movement before authoritative processing. */
export function sanitizeCityInput(value: unknown): CityInput | null {
  if (!record(value) || !integer(value.inputSequence) || !integer(value.shotId) || !integer(value.meleeId) || !isCityMeleeTool(value.meleeTool)
    || !number(value.moveX, -1, 1) || !number(value.moveZ, -1, 1)
    || !number(value.aimYaw, -Math.PI * 2, Math.PI * 2) || !number(value.aimPitch, -CITY_RULES.aimPitchLimit, CITY_RULES.aimPitchLimit)
    || !isCityWeapon(value.weapon) || !['fire', 'melee', 'reload', 'revive'].every(k => typeof value[k] === 'boolean')
    || (value.interact !== undefined && typeof value.interact !== 'boolean')
    || (value.interactId !== undefined && !integer(value.interactId)) || (value.interact === true && !integer(value.interactId))
    || (value.jump !== undefined && typeof value.jump !== 'boolean')
    || (value.jumpId !== undefined && !integer(value.jumpId)) || (value.jump === true && !integer(value.jumpId))
    || (value.sprint !== undefined && typeof value.sprint !== 'boolean')
    || (value.throttle !== undefined && !number(value.throttle, -1, 1)) || (value.steer !== undefined && !number(value.steer, -1, 1))
    || (value.brake !== undefined && typeof value.brake !== 'boolean')) return null;
  const scale = Math.max(1, Math.hypot(value.moveX, value.moveZ));
  return { inputSequence: value.inputSequence, shotId: value.shotId, meleeId: value.meleeId, meleeTool: value.meleeTool, melee: value.melee as boolean, moveX: value.moveX / scale, moveZ: value.moveZ / scale,
    aimYaw: Math.atan2(Math.sin(value.aimYaw), Math.cos(value.aimYaw)), aimPitch: value.aimPitch,
    weapon: value.weapon, fire: value.fire as boolean, reload: value.reload as boolean, revive: value.revive as boolean,
    interact: value.interact === true, interactId: value.interactId as number ?? 0,
    jump: value.jump === true, jumpId: value.jumpId as number ?? 0, sprint: value.sprint === true,
    throttle: value.throttle as number ?? 0, steer: value.steer as number ?? 0, brake: value.brake === true };
}
function member(v: unknown) {
  return record(v) && text(v.userId) && !!parseCoopAppearanceProfile(v) && skin(v.skinId)
    && typeof v.ready === 'boolean' && typeof v.connected === 'boolean';
}
export function isCityRoomState(value: unknown): value is CityRoomState {
  if (!record(value) || !['steam-host', 'development-server', 'local', 'cloud-server'].includes(String(value.authority))
    || typeof value.available !== 'boolean' || !['idle', 'connecting', 'waiting', 'running', 'completed', 'closed', 'error'].includes(String(value.status))
    || ![value.lobbyId, value.hostUserId, value.localUserId].every(v => typeof v === 'string' && v.length <= 128)
    || !integer(value.revision) || !Array.isArray(value.members) || value.members.length > CITY_ROOM_CAPACITY
    || !(value.error === null || ['steam-unavailable', 'networking-unavailable', 'host-left', 'connection-lost', 'invalid-room', 'room-started', 'room-full', 'operation-failed', 'login-required'].includes(String(value.error)))) return false;
  return value.members.every(member) && new Set(value.members.map(p => p.userId)).size === value.members.length;
}
/** Hard allocation limits and references are checked before accepting any wire scene. */
export function isCitySnapshot(value: unknown): value is CitySnapshot {
  if (!record(value) || !text(value.matchId) || !integer(value.tick) || !number(value.elapsedMs, 0, 86_400_000)
    || !['waiting', 'running', 'won', 'lost'].includes(String(value.phase))
    || !integer(value.wave, 0, 3) || !integer(value.totalWaves, 1, 3) || value.wave > value.totalWaves
    || !integer(value.waveRemaining, 0, 32) || !Array.isArray(value.players) || value.players.length > CITY_ROOM_CAPACITY
    || !Array.isArray(value.zombies) || value.zombies.length > CITY_RULES.maxZombies
    || !Array.isArray(value.events) || value.events.length > CITY_RULES.maxEvents) return false;
  const playerIds = new Set<string>();
  for (const p of value.players) {
    if (!member(p) || !record(p) || !vector(p) || !number(p.yaw, -Math.PI, Math.PI)
      || !number(p.aimPitch, -CITY_RULES.aimPitchLimit, CITY_RULES.aimPitchLimit) || !number(p.health, 0, CITY_RULES.health)
      || typeof p.downed !== 'boolean' || p.downed !== (p.health === 0) || !number(p.reviveProgress, 0, 1)
      || !integer(p.kills) || !integer(p.lastInputSequence, -1) || !integer(p.lastShotId, -1) || !integer(p.lastMeleeId, -1) || !number(p.meleeCooldownMs, 0, CITY_MELEE.maxCooldownMs + 1e-6) || !isCityMeleeTool(p.meleeTool) || !number(p.guardMs, 0, CITY_MELEE.guardMs) || !number(p.guardYaw, -Math.PI, Math.PI) || !isCityWeapon(p.weapon)
      || !integer(p.ammo, 0, COOP_WEAPONS[p.weapon].capacity) || !integer(p.reserve, 0, COOP_WEAPONS[p.weapon].reserve)
      || !number(p.reloadMs, 0, COOP_WEAPONS[p.weapon].reload * 1000 + 1e-6) || typeof p.reloading !== 'boolean'
      || (p.vehicleId !== undefined && p.vehicleId !== null && !integer(p.vehicleId, 1))
      || (p.seat !== undefined && p.seat !== null && !['driver', 'passenger'].includes(String(p.seat)))
      || (p.lastInteractId !== undefined && !integer(p.lastInteractId, -1))
      || (p.lastJumpId !== undefined && !integer(p.lastJumpId, -1))
      || ((p.vehicleId ?? null) === null) !== ((p.seat ?? null) === null)
      || p.reloading !== (p.reloadMs > 0) || playerIds.has(p.userId as string)) return false;
    playerIds.add(p.userId as string);
  }
  if (value.vehicles !== undefined) {
    if (!Array.isArray(value.vehicles) || value.vehicles.length > CITY_VEHICLE_RULES.maxVehicles) return false;
    const vehicleIds = new Set<number>(), parkingSlots = new Set<string>(), seated = new Set<string>();
    for (const v of value.vehicles) {
      if (!record(v) || !vector(v) || !integer(v.id, 1) || vehicleIds.has(v.id) || !number(v.yaw, -Math.PI, Math.PI)
        || !number(v.speed, -CITY_VEHICLE_RULES.reverseSpeed, CITY_VEHICLE_RULES.maxSpeed)
        || v.maxHealth !== CITY_VEHICLE_RULES.health || !number(v.health, 0, CITY_VEHICLE_RULES.health)
        || !(v.driverId === null || text(v.driverId)) || !(v.passengerId === null || text(v.passengerId))
        || (v.parkingSiteId !== undefined && !['liyuan', 'liying', 'seven'].includes(String(v.parkingSiteId)))
        || (v.parkingSlotId !== undefined && !text(v.parkingSlotId, 64))
        || (v.parkingSiteId === undefined) !== (v.parkingSlotId === undefined)
        || (v.driverId === null && v.speed !== 0)
        || (!v.health && (v.speed !== 0 || v.driverId !== null || v.passengerId !== null))) return false;
      vehicleIds.add(v.id);
      if (v.parkingSiteId !== undefined) {
        const parkingKey = `${v.parkingSiteId}:${v.parkingSlotId}`;
        if (parkingSlots.has(parkingKey)) return false; parkingSlots.add(parkingKey);
      }
      for (const [seat, userId] of [['driver', v.driverId], ['passenger', v.passengerId]] as const) {
        if (userId === null) continue;
        if (!playerIds.has(userId as string) || seated.has(userId as string)) return false;
        const p = value.players.find(p => record(p) && p.userId === userId);
        if (!record(p) || p.vehicleId !== v.id || p.seat !== seat || p.downed || !p.connected) return false;
        seated.add(userId as string);
      }
    }
    if (value.players.some(p => record(p) && p.vehicleId != null && (!vehicleIds.has(p.vehicleId as number) || !seated.has(p.userId as string)))) return false;
  } else if (value.players.some(p => record(p) && p.vehicleId != null)) return false;
  const zombieIds = new Set<number>();
  for (const z of value.zombies) {
    if (!record(z) || !vector(z) || !integer(z.id, 1) || zombieIds.has(z.id) || !number(z.yaw, -Math.PI, Math.PI)
      || !number(z.health, 1, CITY_RULES.zombieHealth) || !['walker', 'runner'].includes(String(z.kind))) return false;
    zombieIds.add(z.id);
  }
  let lastId = 0;
  for (const e of value.events) {
    if (!record(e) || !vector(e) || !integer(e.eventId, 1) || e.eventId <= lastId || !integer(e.tick, 0, value.tick)
      || !['shot', 'melee', 'blocked', 'hit', 'kill', 'player-hit', 'downed', 'revived', 'wave', 'phase', 'board', 'dismount', 'vehicle-hit', 'vehicle-destroyed'].includes(String(e.kind))
      || !(e.userId === null || text(e.userId)) || !(e.targetId === null || integer(e.targetId, 1))
      || (e.targetUserId !== undefined && !text(e.targetUserId)) || (e.weapon !== undefined && !isCityWeapon(e.weapon))
      || (e.vehicleId !== undefined && !integer(e.vehicleId, 1))
      || (e.meleeTool !== undefined && !isCityMeleeTool(e.meleeTool)) || (e.meleeId !== undefined && !integer(e.meleeId)) || (e.shotId !== undefined && !integer(e.shotId)) || (e.direction !== undefined && !direction(e.direction))) return false;
    if (e.kind === 'shot' && (!direction(e.direction) || !isCityWeapon(e.weapon) || !integer(e.shotId))) return false;
    if (e.kind === 'melee' && (!direction(e.direction) || !integer(e.meleeId) || !isCityMeleeTool(e.meleeTool) || !text(e.userId))) return false;
    if (['board', 'dismount', 'vehicle-hit', 'vehicle-destroyed'].includes(String(e.kind)) && !integer(e.vehicleId, 1)) return false;
    lastId = e.eventId;
  }
  if (value.waveRemaining < value.zombies.length) return false;
  if (value.phase === 'waiting') return value.reason === null && value.wave === 0 && value.zombies.length === 0;
  if (value.phase === 'running') return value.reason === null && value.wave >= 1;
  if (value.phase === 'won') return value.reason === 'waves-cleared' && value.wave === value.totalWaves && value.waveRemaining === 0;
  return ['all-downed', 'no-players', 'host-left', 'connection-lost'].includes(String(value.reason));
}
