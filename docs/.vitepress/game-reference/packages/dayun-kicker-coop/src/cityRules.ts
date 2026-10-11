import { addZombieKnockback, advanceZombieKnockback, type ZombieKnockback } from './knockback';
import { COOP_WEAPONS } from './weapons';
import { parseCoopAppearanceProfile } from './profile';
import { CITY_MELEE, CITY_MELEE_TOOLS, cityMeleeGuarded, cityMeleeCanHit, cityMeleeKnockback } from './cityMelee';
import { sanitizeCityInput } from './cityValidation';
import { CITY_RULES, cityBuildingRayDistance, cityLineWalkable, cityNearbyRoads, citySegmentDistance, isCityWalkable, moveCityPlayer } from './cityWorld';
import { CITY_VEHICLE_RULES, cityDismountPoint, cityVehicleSeatPosition, cityVehiclesOverlap, createCityVehicles, nearestCityVehicle, stepCityVehicle } from './cityVehicles';
import type { CityEvent, CityInput, CityOptions, CityPlayerProfile,
  CityPlayerSnapshot, CityPoint, CityReason, CitySnapshot, CityVehicleSnapshot, CityWeapon, CityWorld, CityZombieSnapshot } from './cityTypes';

export function neutralCityInput(inputSequence = 0): CityInput {
  return { inputSequence, moveX: 0, moveZ: 0, aimYaw: 0, aimPitch: 0, fire: false, shotId: 0, melee: false, meleeId: 0, meleeTool: 'broom', reload: false, revive: false, weapon: 'smg',
    interact: false, interactId: 0, throttle: 0, steer: 0, brake: false, jump: false, jumpId: 0, sprint: false };
}
export function cityShotRay(player: Pick<CityPlayerSnapshot, 'x' | 'y' | 'z' | 'yaw' | 'aimPitch'>) {
  const cp = Math.cos(player.aimPitch);
  return { origin: { x: player.x, y: player.y + CITY_RULES.eyeHeight, z: player.z },
    direction: { x: -Math.sin(player.yaw) * cp, y: Math.sin(player.aimPitch), z: -Math.cos(player.yaw) * cp } };
}
/** Finite upright zombie capsule/cylinder: the ray must really cross its body. */
export function cityZombieRayDistance(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, zombie: CityZombieSnapshot) {
  const ox = origin.x - zombie.x, oz = origin.z - zombie.z;
  const a = direction.x * direction.x + direction.z * direction.z, b = 2 * (ox * direction.x + oz * direction.z),
    c = ox * ox + oz * oz - .5 * .5, disc = b * b - 4 * a * c;
  if (a < 1e-9 || disc < 0) return Infinity;
  for (const t of [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)])
    if (t >= 0 && origin.y + direction.y * t >= zombie.y && origin.y + direction.y * t <= zombie.y + 1.85) return t;
  return Infinity;
}
interface Ammo { ammo: number; reserve: number; reloadTicks: number }
interface Player {
  state: CityPlayerSnapshot; input: CityInput; lastInputTick: number; shotCooldown: number; meleeCooldown: number; guardTicks: number; invulnerableTicks: number;
  stores: Record<CityWeapon, Ammo>;
  jumpVelocity: number;
}
interface Zombie { state: CityZombieSnapshot; attackCooldown: number; staggerTicks: number; path: CityPoint[]; routeTick: number; targetUserId: string; knockback?: ZombieKnockback }
interface Graph { points: CityPoint[]; adjacent: number[][]; byKey: Map<string, number> }
function pointKey(p: CityPoint) { return `${p.x.toFixed(2)},${p.z.toFixed(2)}`; }
function graph(world: CityWorld): Graph {
  const g: Graph = { points: [], adjacent: [], byKey: new Map() };
  const node = (p: CityPoint) => { const k = pointKey(p), existing = g.byKey.get(k); if (existing !== undefined) return existing;
    const id = g.points.length; g.points.push(p); g.adjacent.push([]); g.byKey.set(k, id); return id; };
  for (const road of world.roads) { const a = node(road.a), b = node(road.b); g.adjacent[a]!.push(b); g.adjacent[b]!.push(a); }
  return g;
}
function closestRoad(world: CityWorld, point: CityPoint) {
  const roads = cityNearbyRoads(world, point, 24);
  return roads.reduce<typeof roads[number] | undefined>((best, r) => !best || citySegmentDistance(point, r.a, r.b) < citySegmentDistance(point, best.a, best.b) ? r : best, undefined);
}
function pathTo(world: CityWorld, g: Graph, from: CityPoint, target: CityPoint): CityPoint[] {
  const a = closestRoad(world, from), b = closestRoad(world, target); if (!a || !b) return [];
  const start = [a.a, a.b].map(p => g.byKey.get(pointKey(p))!);
  const end = new Set([b.a, b.b].map(p => g.byKey.get(pointKey(p))!));
  const parents = new Map<number, number | null>(), queue = [...start];
  for (const n of start) parents.set(n, null);
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i]!;
    if (end.has(n)) { const path: CityPoint[] = [target]; let cursor: number | null = n;
      while (cursor !== null) { path.unshift(g.points[cursor]!); cursor = parents.get(cursor)!; }
      // Start at the nearest projection, so spawning on a road never requires crossing its corners.
      while (path.length > 1 && cityLineWalkable(world, from, path[1]!)) path.shift();
      return path;
    }
    for (const next of g.adjacent[n]!) if (!parents.has(next)) { parents.set(next, n); queue.push(next); }
  }
  return [];
}

/** Deterministic 60 Hz host simulation. Inputs express intentions; clients never set damage or positions. */
export class AuthoritativeCityCoop {
  private readonly world: CityWorld;
  private readonly roadGraph: Graph;
  private readonly players = new Map<string, Player>();
  private readonly zombies = new Map<number, Zombie>();
  private readonly vehicles: CityVehicleSnapshot[];
  private readonly vehicleCollisionTicks = new Map<number, number>();
  private readonly waves: readonly number[];
  private readonly spawnIntervalTicks: number;
  private rng: number;
  private currentTick = 0;
  private phase: CitySnapshot['phase'] = 'waiting';
  private reason: CityReason = null;
  private wave = 0;
  private pendingSpawns = 0;
  private spawnCooldown = 0;
  private wavePause = 0;
  private nextZombieId = 1;
  private nextEventId = 1;
  private events: CityEvent[] = [];
  constructor(readonly matchId: string, options: CityOptions) {
    this.world = options.world; this.roadGraph = graph(this.world); this.rng = (options.seed ?? 713) >>> 0;
    if (!isCityWalkable(this.world, this.world.spawn)) throw new Error('Invalid city spawn');
    this.vehicles = createCityVehicles(this.world);
    const counts = options.waveCounts ?? CITY_RULES.waveCounts;
    if (!counts.length || counts.length > 3 || counts.some(n => !Number.isInteger(n) || n < 1 || n > 32)) throw new Error('Invalid city wave counts');
    this.waves = [...counts];
    const interval = options.spawnInterval ?? CITY_RULES.spawnInterval;
    if (!Number.isFinite(interval) || interval < 0 || interval > 10) throw new Error('Invalid city spawn interval');
    this.spawnIntervalTicks = Math.max(1, Math.ceil(interval * CITY_RULES.tickRate));
  }
  private random() { this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0; return this.rng / 0x100000000; }
  addPlayer(profile: CityPlayerProfile) {
    if (this.phase !== 'waiting') return false;
    if (this.players.has(profile.userId)) return this.updatePlayer(profile);
    const appearance = parseCoopAppearanceProfile(profile);
    if (!appearance || !profile.userId || profile.userId.length > 128 || this.players.size >= CITY_RULES.maxPlayers) return false;
    const skinId = profile.skinId ?? 'stock'; if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(skinId)) return false;
    const index = this.players.size;
    let spawn: CityPoint = this.world.spawn;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].slice(index).concat([[0, 0]])) {
      const p = { x: this.world.spawn.x + dx!, z: this.world.spawn.z + dz! };
      if (isCityWalkable(this.world, p)) { spawn = p; break; }
    }
    const state: CityPlayerSnapshot = { ...appearance, userId: profile.userId, skinId,
      x: spawn.x, y: 0, z: spawn.z, yaw: this.world.spawn.yaw, aimPitch: 0,
      ready: false, connected: true, health: CITY_RULES.health, downed: false, reviveProgress: 0,
      kills: 0, weapon: 'smg', ammo: COOP_WEAPONS.smg.capacity, reserve: COOP_WEAPONS.smg.reserve,
      reloadMs: 0, reloading: false, lastInputSequence: -1, lastShotId: -1, lastMeleeId: -1, meleeCooldownMs: 0, meleeTool: 'broom', guardMs: 0, guardYaw: this.world.spawn.yaw,
      vehicleId: null, seat: null, lastInteractId: -1, lastJumpId: -1 };
    const store = (weapon: CityWeapon): Ammo => ({ ammo: COOP_WEAPONS[weapon].capacity, reserve: COOP_WEAPONS[weapon].reserve, reloadTicks: 0 });
    this.players.set(profile.userId, { state, input: neutralCityInput(), lastInputTick: -1000, shotCooldown: 0, meleeCooldown: 0, guardTicks: 0,
      invulnerableTicks: 0, jumpVelocity: 0, stores: { smg: store('smg'), shotgun: store('shotgun') } }); return true;
  }
  updatePlayer(profile: CityPlayerProfile) {
    const player = this.players.get(profile.userId), appearance = parseCoopAppearanceProfile(profile);
    if (!player || !appearance) return false;
    const skinId = profile.skinId ?? player.state.skinId; if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(skinId)) return false;
    Object.assign(player.state, appearance, { skinId }); return true;
  }
  removePlayer(userId: string) {
    const player = this.players.get(userId); if (player) this.dismount(player, true);
    const removed = this.players.delete(userId);
    if (removed && this.phase === 'running') this.checkDefeat(); return removed;
  }
  setConnected(userId: string, connected: boolean) {
    const p = this.players.get(userId); if (!p) return false;
    if (!connected && this.phase === 'running') return this.removePlayer(userId);
    p.state.connected = connected; if (!connected) p.state.ready = false; return true;
  }
  setReady(userId: string, ready: boolean) {
    const p = this.players.get(userId); if (!p || this.phase !== 'waiting' || !p.state.connected) return false;
    p.state.ready = ready; return true;
  }
  start() {
    if (this.phase !== 'waiting' || this.players.size < CITY_RULES.minPlayers || [...this.players.values()].some(p => !p.state.ready || !p.state.connected)) return false;
    this.phase = 'running'; this.wave = 1; this.pendingSpawns = this.waves[0]!;
    this.emit({ kind: 'phase', userId: null, targetId: null, ...this.world.spawn, y: 0 });
    this.emit({ kind: 'wave', userId: null, targetId: null, ...this.world.spawn, y: 0 }); return true;
  }
  applyInput(userId: string, value: unknown) {
    const p = this.players.get(userId), input = sanitizeCityInput(value);
    if (!p || !input || this.phase !== 'running' || !p.state.connected || input.inputSequence <= p.state.lastInputSequence) return false;
    p.input = input; p.state.lastInputSequence = input.inputSequence; p.lastInputTick = this.currentTick; return true;
  }
  step(ticks = 1) {
    if (!Number.isInteger(ticks) || ticks < 0 || ticks > CITY_RULES.maxStepTicks) return;
    for (let i = 0; i < ticks && this.phase === 'running'; i++) this.tick();
  }
  /** Authority lifecycle boundary; no checkpoint or process recovery is implied. */
  terminate(reason: 'host-left' | 'connection-lost') {
    if (this.phase === 'won' || this.phase === 'lost') return false;
    this.phase = 'lost'; this.reason = reason;
    for (const vehicle of this.vehicles) vehicle.speed = 0;
    for (const p of this.players.values()) p.input = neutralCityInput(p.state.lastInputSequence);
    this.emit({ kind: 'phase', userId: null, targetId: null, ...this.world.spawn, y: 0 });
    return true;
  }
  private tick() {
    this.currentTick++;
    const dt = 1 / CITY_RULES.tickRate;
    for (const p of this.players.values()) {
      p.shotCooldown = Math.max(0, p.shotCooldown - 1); p.meleeCooldown = Math.max(0, p.meleeCooldown - 1); p.guardTicks = Math.max(0, p.guardTicks - 1); p.invulnerableTicks = Math.max(0, p.invulnerableTicks - 1);
      for (const weapon of ['smg', 'shotgun'] as const) {
        const ammo = p.stores[weapon];
        if (ammo.reloadTicks > 0 && --ammo.reloadTicks === 0) {
          const fill = Math.min(COOP_WEAPONS[weapon].capacity - ammo.ammo, ammo.reserve); ammo.ammo += fill; ammo.reserve -= fill;
        }
      }
      const fresh = this.currentTick - p.lastInputTick <= CITY_RULES.inputTimeoutMs / 1000 * CITY_RULES.tickRate;
      if (p.input.jump && (p.input.jumpId ?? 0) > (p.state.lastJumpId ?? -1)) {
        p.state.lastJumpId = p.input.jumpId ?? 0;
        if (fresh && p.state.connected && !p.state.downed && p.state.vehicleId == null && p.state.y === 0 && !p.jumpVelocity)
          p.jumpVelocity = CITY_RULES.jumpSpeed;
      }
      // Finish gravity even after input expires; a lost packet cannot suspend a player in midair.
      if (p.state.vehicleId == null) {
        if (p.state.downed || !p.state.connected) { p.state.y = 0; p.jumpVelocity = 0; }
        else if (p.state.y > 0 || p.jumpVelocity) {
          p.state.y = Math.max(0, p.state.y + p.jumpVelocity * dt - CITY_RULES.gravity * dt * dt / 2);
          p.jumpVelocity = p.state.y > 0 ? p.jumpVelocity - CITY_RULES.gravity * dt : 0;
        }
      }
      if (!fresh || p.state.downed || p.state.health <= 0 || !p.state.connected) {
        // Consume rejected intent so revival/reconnect cannot replay an earlier swing.
        this.consumeAttacks(p);
        if (p.input.interact) p.state.lastInteractId = Math.max(p.state.lastInteractId ?? -1, p.input.interactId ?? 0);
        if (p.state.downed || !p.state.connected) this.dismount(p, true);
        p.guardTicks = 0;
        p.input = { ...p.input, moveX: 0, moveZ: 0, fire: false, melee: false, revive: false, reload: false, interact: false, throttle: 0, steer: 0, brake: true, jump: false, sprint: false }; continue;
      }
      if (p.input.interact && (p.input.interactId ?? 0) > (p.state.lastInteractId ?? -1)) {
        p.state.lastInteractId = p.input.interactId ?? 0;
        if (p.state.vehicleId != null) this.dismount(p);
        else {
          const vehicle = p.state.y === 0 ? nearestCityVehicle(p.state, this.vehicles, this.world) : null;
          if (vehicle) {
            const seat = vehicle.driverId === null ? 'driver' : 'passenger';
            if (seat === 'driver') vehicle.driverId = p.state.userId; else vehicle.passengerId = p.state.userId;
            p.state.vehicleId = vehicle.id; p.state.seat = seat; p.guardTicks = 0;
            Object.assign(p.state, cityVehicleSeatPosition(vehicle, seat)); this.releaseActions(p);
            this.emit({ kind: 'board', userId: p.state.userId, targetId: null, vehicleId: vehicle.id, x: p.state.x, y: p.state.y, z: p.state.z });
          }
        }
      }
    }
    this.moveVehicles(dt);
    for (const p of this.players.values()) {
      if (this.currentTick - p.lastInputTick > CITY_RULES.inputTimeoutMs / 1000 * CITY_RULES.tickRate
        || p.state.downed || !p.state.connected) continue;
      const input = p.input;
      if (p.state.meleeTool !== input.meleeTool) p.guardTicks = 0;
      p.state.meleeTool = input.meleeTool;
      p.state.yaw = input.aimYaw; p.state.aimPitch = input.aimPitch; p.state.weapon = input.weapon;
      if (p.state.vehicleId == null) Object.assign(p.state, moveCityPlayer(this.world, p.state, input.moveX, input.moveZ, dt, input.sprint ? CITY_RULES.sprintSpeed : CITY_RULES.movementSpeed));
      if (p.state.seat === 'driver') { this.consumeAttacks(p); p.guardTicks = 0; continue; }
      const ammo = p.stores[input.weapon], spec = COOP_WEAPONS[input.weapon];
      if (input.reload && ammo.reloadTicks === 0 && ammo.ammo < spec.capacity && ammo.reserve > 0) ammo.reloadTicks = Math.ceil(spec.reload * CITY_RULES.tickRate);
      if (input.melee && input.meleeId > p.state.lastMeleeId) {
        // Consume every distinct request, including cooldown rejection; never queue a surprise swing.
        p.state.lastMeleeId = input.meleeId;
        if (p.state.vehicleId == null && !p.meleeCooldown) {
          p.meleeCooldown = Math.ceil(CITY_MELEE_TOOLS[p.state.meleeTool].cooldownMs / 1000 * CITY_RULES.tickRate); this.melee(p);
        }
      }
      if (input.fire && input.shotId > p.state.lastShotId) {
        // A slightly early unreliable packet waits for the authoritative cooldown; its ID remains unacknowledged.
        // Empty/reloading requests are consumed so completing a reload cannot replay an old trigger.
        if (ammo.reloadTicks || ammo.ammo <= 0) p.state.lastShotId = input.shotId;
        else if (!p.shotCooldown) {
          p.state.lastShotId = input.shotId;
          ammo.ammo--; p.shotCooldown = Math.ceil(spec.interval * CITY_RULES.tickRate); this.shoot(p);
        }
      }
    }
    this.updateRevives(dt);
    if (this.wavePause > 0) {
      if (--this.wavePause === 0) { this.wave++; this.pendingSpawns = this.waves[this.wave - 1]!;
        this.emit({ kind: 'wave', userId: null, targetId: null, ...this.world.spawn, y: 0 }); }
    } else if (this.pendingSpawns && this.zombies.size < CITY_RULES.maxZombies && --this.spawnCooldown <= 0) {
      if (this.spawnZombie()) this.pendingSpawns--; this.spawnCooldown = this.spawnIntervalTicks;
    }
    for (const zombie of this.zombies.values()) this.moveZombie(zombie, dt);
    this.checkDefeat();
    if (this.phase === 'running' && !this.pendingSpawns && !this.zombies.size && !this.wavePause) {
      if (this.wave === this.waves.length) this.finish('won', 'waves-cleared');
      else this.wavePause = Math.ceil(CITY_RULES.wavePauseMs / 1000 * CITY_RULES.tickRate);
    }
  }
  private consumeAttacks(p: Player) {
    if (p.input.fire) p.state.lastShotId = Math.max(p.state.lastShotId, p.input.shotId);
    if (p.input.melee) p.state.lastMeleeId = Math.max(p.state.lastMeleeId, p.input.meleeId);
  }
  private releaseActions(p: Player) {
    this.consumeAttacks(p); p.guardTicks = 0;
    p.jumpVelocity = 0;
    p.input = { ...p.input, moveX: 0, moveZ: 0, fire: false, melee: false, revive: false, reload: false, throttle: 0, steer: 0, brake: true, jump: false, sprint: false };
  }
  private dismount(p: Player, forced = false) {
    const vehicle = this.vehicles.find(v => v.id === p.state.vehicleId);
    if (!vehicle || !p.state.seat) return false;
    if (!forced && Math.abs(vehicle.speed) > CITY_VEHICLE_RULES.interactSpeed) return false;
    const exit = cityDismountPoint(this.world, vehicle, p.state.seat, this.vehicles);
    if (!exit && !forced) return false;
    // The admitted vehicle footprint always contains a walkable center. A forced
    // exit may use it when both sides are blocked; normal interaction refuses.
    const position = exit ?? { x: vehicle.x, y: vehicle.y, z: vehicle.z };
    if (p.state.seat === 'driver') {
      vehicle.driverId = null; vehicle.speed = 0;
      p.state.yaw = vehicle.yaw; p.state.aimPitch = 0;
      p.input = { ...p.input, aimYaw: vehicle.yaw, aimPitch: 0 };
    }
    else vehicle.passengerId = null;
    p.state.vehicleId = null; p.state.seat = null; Object.assign(p.state, position);
    this.releaseActions(p);
    this.emit({ kind: 'dismount', userId: p.state.userId, targetId: null, vehicleId: vehicle.id, ...position });
    return true;
  }
  private moveVehicles(dt: number) {
    for (const vehicle of this.vehicles) {
      const cooldown = Math.max(0, (this.vehicleCollisionTicks.get(vehicle.id) ?? 0) - 1);
      this.vehicleCollisionTicks.set(vehicle.id, cooldown);
      const driver = vehicle.driverId ? this.players.get(vehicle.driverId) : undefined;
      if (!driver || driver.state.downed || !driver.state.connected || !vehicle.health
        || this.currentTick - driver.lastInputTick > CITY_RULES.inputTimeoutMs / 1000 * CITY_RULES.tickRate) vehicle.speed = 0;
      else {
        const moved = stepCityVehicle(this.world, vehicle, driver.input, dt);
        if (this.vehicles.some(other => other.id !== vehicle.id && cityVehiclesOverlap(other, moved.vehicle))) {
          moved.collided = true; moved.impactSpeed = Math.abs(moved.vehicle.speed); moved.vehicle = { ...vehicle, speed: 0 };
        }
        Object.assign(vehicle, moved.vehicle);
        if (moved.collided && moved.impactSpeed > CITY_VEHICLE_RULES.collisionSpeed && !cooldown) {
          this.damageVehicle(vehicle, CITY_VEHICLE_RULES.collisionDamage);
          this.vehicleCollisionTicks.set(vehicle.id, Math.ceil(CITY_VEHICLE_RULES.collisionCooldownMs / 1000 * CITY_RULES.tickRate));
        }
      }
      for (const [seat, userId] of [['driver', vehicle.driverId], ['passenger', vehicle.passengerId]] as const) {
        if (!userId) continue;
        const occupant = this.players.get(userId);
        if (occupant) Object.assign(occupant.state, cityVehicleSeatPosition(vehicle, seat));
      }
    }
  }
  private damageVehicle(vehicle: CityVehicleSnapshot, damage: number) {
    if (!vehicle.health) return;
    vehicle.health = Math.max(0, vehicle.health - damage);
    this.emit({ kind: 'vehicle-hit', userId: null, targetId: null, vehicleId: vehicle.id, x: vehicle.x, y: vehicle.y, z: vehicle.z });
    if (vehicle.health) return;
    vehicle.speed = 0;
    this.emit({ kind: 'vehicle-destroyed', userId: null, targetId: null, vehicleId: vehicle.id, x: vehicle.x, y: vehicle.y, z: vehicle.z });
    for (const occupant of this.players.values()) if (occupant.state.vehicleId === vehicle.id) this.dismount(occupant, true);
  }
  private melee(p: Player) {
    const spec = CITY_MELEE_TOOLS[p.state.meleeTool];
    if (p.state.meleeTool === 'pot-lid') { p.guardTicks = Math.ceil(CITY_MELEE.guardMs / 1000 * CITY_RULES.tickRate); p.state.guardYaw = p.state.yaw; }
    const direction = { x: -Math.sin(p.state.yaw), y: 0, z: -Math.cos(p.state.yaw) };
    this.emit({ kind: 'melee', userId: p.state.userId, targetId: null, x: p.state.x, y: p.state.y + 1, z: p.state.z,
      direction, meleeId: p.state.lastMeleeId, meleeTool: p.state.meleeTool });
    for (const zombie of this.zombies.values()) {
      if (!cityMeleeCanHit(this.world, p.state, zombie.state)) continue;
      zombie.state.health -= spec.damage;
      this.emit({ kind: 'hit', userId: p.state.userId, targetId: zombie.state.id,
        x: zombie.state.x, y: zombie.state.y + 1, z: zombie.state.z, meleeId: p.state.lastMeleeId, meleeTool: p.state.meleeTool });
      if (zombie.state.health <= 0) {
        zombie.knockback = undefined; p.state.kills++; this.zombies.delete(zombie.state.id);
        this.emit({ kind: 'kill', userId: p.state.userId, targetId: zombie.state.id,
          x: zombie.state.x, y: zombie.state.y, z: zombie.state.z, meleeId: p.state.lastMeleeId, meleeTool: p.state.meleeTool });
      } else {
        Object.assign(zombie.state, cityMeleeKnockback(this.world, p.state, zombie.state));
        zombie.staggerTicks = Math.ceil(spec.staggerMs / 1000 * CITY_RULES.tickRate);
        zombie.path = []; zombie.routeTick = 0;
      }
    }
  }
  private shoot(p: Player) {
    const ray = cityShotRay(p.state), weapon = p.state.weapon, spec = COOP_WEAPONS[weapon];
    this.emit({ kind: 'shot', userId: p.state.userId, targetId: null, ...ray.origin, direction: ray.direction, weapon, shotId: p.state.lastShotId });
    for (let pellet = 0; pellet < spec.pellets; pellet++) {
      const spread = spec.pellets === 1 ? 0 : (pellet / (spec.pellets - 1) - .5) * spec.spread;
      const direction = cityShotRay({ ...p.state, yaw: p.state.yaw + spread, aimPitch: p.state.aimPitch + spread * .35 }).direction;
      let distance = cityBuildingRayDistance(this.world, ray.origin, direction, spec.range), target: Zombie | undefined;
      for (const zombie of this.zombies.values()) {
        const hit = cityZombieRayDistance(ray.origin, direction, zombie.state);
        if (hit < distance) { distance = hit; target = zombie; }
      }
      if (!target) continue;
      target.state.health -= spec.damage;
      this.emit({ kind: 'hit', userId: p.state.userId, targetId: target.state.id,
        x: ray.origin.x + direction.x * distance, y: ray.origin.y + direction.y * distance, z: ray.origin.z + direction.z * distance, weapon });
      if (target.state.health <= 0) { target.knockback = undefined; p.state.kills++; this.zombies.delete(target.state.id);
        this.emit({ kind: 'kill', userId: p.state.userId, targetId: target.state.id, x: target.state.x, y: target.state.y, z: target.state.z, weapon }); }
      else target.knockback = addZombieKnockback(target.knockback, direction, spec.damage);
    }
  }
  private spawnZombie() {
    const alive = [...this.players.values()].filter(p => !p.state.downed && p.state.connected);
    if (!alive.length) return false;
    const target = alive[Math.floor(this.random() * alive.length)]!.state;
    const roads = cityNearbyRoads(this.world, target, 45);
    // Sample source-road positions, never raw circles that can place a zombie in a building or water.
    for (let attempt = 0; attempt < 90; attempt++) {
      const r = roads[Math.floor(this.random() * roads.length)]; if (!r) return false;
      const t = this.random(), pos = { x: r.a.x + (r.b.x - r.a.x) * t, z: r.a.z + (r.b.z - r.a.z) * t };
      const distance = Math.hypot(pos.x - target.x, pos.z - target.z);
      if (distance < 14 || distance > 36 || alive.some(p => Math.hypot(p.state.x - pos.x, p.state.z - pos.z) < 10)
        || !isCityWalkable(this.world, pos, CITY_RULES.zombieRadius)) continue;
      const path = cityLineWalkable(this.world, pos, target) ? [target] : pathTo(this.world, this.roadGraph, pos, target);
      if (!path.length) continue;
      const id = this.nextZombieId++, kind = id % 4 === 0 ? 'runner' : 'walker';
      this.zombies.set(id, { state: { id, ...pos, y: 0, yaw: 0, health: CITY_RULES.zombieHealth, kind },
        attackCooldown: 0, staggerTicks: 0, path, routeTick: this.currentTick, targetUserId: target.userId }); return true;
    }
    return false;
  }
  private moveZombie(z: Zombie, dt: number) {
    z.attackCooldown = Math.max(0, z.attackCooldown - 1);
    const staggered = z.staggerTicks > 0;
    if (staggered) z.staggerTicks--;
    if (z.knockback) {
      const movement = advanceZombieKnockback(z.knockback, dt), distance = Math.hypot(movement.x, movement.z);
      if (distance > 0) Object.assign(z.state, moveCityPlayer(this.world, z.state,
        movement.x / distance, movement.z / distance, dt, distance / dt, CITY_RULES.zombieRadius));
      if (!z.knockback.x && !z.knockback.z) z.knockback = undefined;
      // Rebuild pursuit from the displaced position; melee stun and recoil expire concurrently.
      z.path = []; z.routeTick = 0; return;
    }
    if (staggered) return;
    const alive = [...this.players.values()].filter(p => !p.state.downed && p.state.connected);
    const target = alive.reduce<Player | undefined>((best, p) => !best || Math.hypot(p.state.x - z.state.x, p.state.z - z.state.z) < Math.hypot(best.state.x - z.state.x, best.state.z - z.state.z) ? p : best, undefined);
    if (!target) return;
    const distance = Math.hypot(target.state.x - z.state.x, target.state.z - z.state.z);
    const reachable = distance < 40 && cityLineWalkable(this.world, z.state, target.state);
    if (reachable) z.path = [target.state];
    else if (z.targetUserId !== target.state.userId || this.currentTick - z.routeTick >= 120 || !z.path.length) {
      z.path = pathTo(this.world, this.roadGraph, z.state, target.state); z.routeTick = this.currentTick; z.targetUserId = target.state.userId;
    }
    while (z.path.length > 1 && Math.hypot(z.path[0]!.x - z.state.x, z.path[0]!.z - z.state.z) < .7) z.path.shift();
    const next = z.path[0];
    if (next && distance > .8) {
      const dx = next.x - z.state.x, dz = next.z - z.state.z, norm = Math.hypot(dx, dz);
      z.state.yaw = Math.atan2(-dx, -dz);
      const speed = z.state.kind === 'runner' ? CITY_RULES.runnerSpeed : CITY_RULES.walkerSpeed;
      const old = { x: z.state.x, z: z.state.z };
      if (norm > .01) Object.assign(z.state, moveCityPlayer(this.world, z.state, dx / norm, dz / norm, dt, speed, CITY_RULES.zombieRadius));
      if (Math.hypot(z.state.x - old.x, z.state.z - old.z) < .001) {
        // Slide around footprint corners while keeping authoritative walkability.
        for (const angle of [.35, -.35, .7, -.7, 1.1, -1.1]) {
          const moved = moveCityPlayer(this.world, z.state, Math.cos(angle) * dx / norm - Math.sin(angle) * dz / norm,
            Math.sin(angle) * dx / norm + Math.cos(angle) * dz / norm, dt, speed, CITY_RULES.zombieRadius);
          if (Math.hypot(moved.x - old.x, moved.z - old.z) > .001) { Object.assign(z.state, moved); break; }
        }
      }
    }
    if (distance <= CITY_RULES.zombieAttackRange && reachable && !z.attackCooldown && !target.invulnerableTicks) {
      z.attackCooldown = Math.ceil(CITY_RULES.zombieAttackInterval * CITY_RULES.tickRate);
      const guarded = cityMeleeGuarded({ ...target.state, guardMs: target.guardTicks * 1000 / CITY_RULES.tickRate }, z.state);
      const damage = guarded ? Math.max(1, Math.round(CITY_RULES.zombieDamage * (1 - CITY_MELEE.guardReduction))) : CITY_RULES.zombieDamage;
      target.state.health = Math.max(0, target.state.health - damage);
      const vehicle = this.vehicles.find(v => v.id === target.state.vehicleId);
      if (vehicle) this.damageVehicle(vehicle, CITY_VEHICLE_RULES.attackDamage);
      if (guarded) this.emit({ kind: 'blocked', userId: target.state.userId, targetUserId: target.state.userId, targetId: z.state.id,
        x: target.state.x, y: target.state.y + 1, z: target.state.z, meleeTool: 'pot-lid' });
      target.state.reviveProgress = 0;
      this.emit({ kind: 'player-hit', userId: null, targetId: z.state.id, targetUserId: target.state.userId, x: target.state.x, y: target.state.y, z: target.state.z });
      if (!target.state.health) {
        target.state.downed = true; this.dismount(target, true); target.state.y = 0; target.jumpVelocity = 0;
        this.emit({ kind: 'downed', userId: target.state.userId, targetId: null, x: target.state.x, y: target.state.y, z: target.state.z });
      }
    }
  }
  private updateRevives(dt: number) {
    const assisted = new Set<string>();
    for (const medic of this.players.values()) {
      if (medic.state.downed || medic.state.vehicleId != null || !medic.input.revive || !medic.state.connected) continue;
      const candidate = [...this.players.values()].filter(p => p.state.downed && p.state.connected
        && Math.hypot(p.state.x - medic.state.x, p.state.z - medic.state.z) <= CITY_RULES.reviveRadius
        && cityLineWalkable(this.world, medic.state, p.state, CITY_RULES.playerRadius))
        .sort((a, b) => Math.hypot(a.state.x - medic.state.x, a.state.z - medic.state.z) - Math.hypot(b.state.x - medic.state.x, b.state.z - medic.state.z))[0];
      if (!candidate || assisted.has(candidate.state.userId)) continue;
      assisted.add(candidate.state.userId); candidate.state.reviveProgress = Math.min(1, candidate.state.reviveProgress + dt * 1000 / CITY_RULES.reviveMs);
      if (candidate.state.reviveProgress >= 1 - 1e-8) { candidate.state.downed = false; candidate.state.health = CITY_RULES.reviveHealth;
        candidate.state.reviveProgress = 0; candidate.invulnerableTicks = CITY_RULES.tickRate * 2;
        this.emit({ kind: 'revived', userId: medic.state.userId, targetId: null, targetUserId: candidate.state.userId, x: candidate.state.x, y: candidate.state.y, z: candidate.state.z }); }
    }
    for (const p of this.players.values()) if (p.state.downed && !assisted.has(p.state.userId)) p.state.reviveProgress = 0;
  }
  private checkDefeat() {
    if (!this.players.size) this.finish('lost', 'no-players');
    else if ([...this.players.values()].every(p => p.state.downed || !p.state.connected)) this.finish('lost', 'all-downed');
  }
  private finish(phase: 'won' | 'lost', reason: CityReason) {
    if (this.phase !== 'running') return;
    this.phase = phase; this.reason = reason; this.emit({ kind: 'phase', userId: null, targetId: null, ...this.world.spawn, y: 0 });
    for (const vehicle of this.vehicles) vehicle.speed = 0;
  }
  private emit(event: Omit<CityEvent, 'tick' | 'eventId'>) {
    // Reconstruct only public fields; spreading a target snapshot must not leak its internals into wire events.
    const e: CityEvent = { eventId: this.nextEventId++, tick: this.currentTick, kind: event.kind, userId: event.userId,
      targetId: event.targetId, x: event.x, y: event.y, z: event.z };
    if (event.targetUserId !== undefined) e.targetUserId = event.targetUserId;
    if (event.direction) e.direction = { ...event.direction };
    if (event.weapon) e.weapon = event.weapon;
    if (event.shotId !== undefined) e.shotId = event.shotId;
    if (event.meleeTool !== undefined) e.meleeTool = event.meleeTool;
    if (event.meleeId !== undefined) e.meleeId = event.meleeId;
    if (event.vehicleId !== undefined) e.vehicleId = event.vehicleId;
    this.events.push(e); if (this.events.length > CITY_RULES.maxEvents) this.events.shift();
  }
  snapshot(): CitySnapshot {
    return { matchId: this.matchId, tick: this.currentTick, phase: this.phase, reason: this.reason,
      elapsedMs: this.currentTick * 1000 / CITY_RULES.tickRate, wave: this.wave, totalWaves: this.waves.length,
      waveRemaining: this.pendingSpawns + this.zombies.size,
      players: [...this.players.values()].map(p => { const ammo = p.stores[p.state.weapon]; return { ...p.state,
        guardMs: p.guardTicks * 1000 / CITY_RULES.tickRate, meleeCooldownMs: p.meleeCooldown * 1000 / CITY_RULES.tickRate, ammo: ammo.ammo, reserve: ammo.reserve, reloadMs: ammo.reloadTicks * 1000 / CITY_RULES.tickRate, reloading: ammo.reloadTicks > 0 }; }),
      zombies: [...this.zombies.values()].map(z => ({ ...z.state })),
      vehicles: this.vehicles.map(v => ({ ...v })),
      events: this.events.map(e => ({ ...e, ...(e.direction ? { direction: { ...e.direction } } : {}) })) };
  }
}
