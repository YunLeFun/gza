import type { CoopAppearanceProfile, CoopPlayerProfile, CoopVector3 } from './types';
import type { CityScooterParkingSite } from './cityParking';

export const CITY_ROOM_CAPACITY = 4;
export const CITY_ROOM_PROTOCOL = 'dayun-city-coop-v3';
export type CityMeleeTool = 'broom' | 'umbrella' | 'frying-pan' | 'pot-lid';
export type CityWeapon = 'smg' | 'shotgun';
export type CityPhase = 'waiting' | 'running' | 'won' | 'lost';
export type CityReason = 'waves-cleared' | 'all-downed' | 'no-players' | 'host-left' | 'connection-lost' | null;
/** World movement axes; yaw 0 faces -Z, positive yaw faces -X, pitch positive up. */
export interface CityInput {
  inputSequence: number; moveX: number; moveZ: number; aimYaw: number; aimPitch: number;
  fire: boolean; shotId: number; melee: boolean; meleeId: number; meleeTool: CityMeleeTool; reload: boolean; revive: boolean; weapon: CityWeapon;
  /** Discrete boarding/dismount intent; omitted legacy fields normalize to neutral. */
  interact?: boolean; interactId?: number; throttle?: number; steer?: number; brake?: boolean;
  /** Jump requests are deduplicated by the authority; old clients remain neutral. */
  jump?: boolean; jumpId?: number; sprint?: boolean;
}
export interface CityPlayerSnapshot extends CoopVector3 {
  userId: string; displayName: string; skinId: string; clothingColor: string | null;
  ready: boolean; connected: boolean; yaw: number; aimPitch: number;
  health: number; downed: boolean; reviveProgress: number; kills: number;
  weapon: CityWeapon; ammo: number; reserve: number; reloading: boolean; reloadMs: number;
  lastInputSequence: number; lastShotId: number; lastMeleeId: number; meleeCooldownMs: number; meleeTool: CityMeleeTool; guardMs: number; guardYaw: number;
  vehicleId?: number | null; seat?: CityVehicleSeat | null; lastInteractId?: number;
  lastJumpId?: number;
}
export type CityVehicleSeat = 'driver' | 'passenger';
export interface CityVehicleSnapshot extends CoopVector3 {
  id: number; yaw: number; speed: number; health: number; maxHealth: number;
  driverId: string | null; passengerId: string | null;
  /** Stable parking origin, retained while the scooter moves away. */
  parkingSiteId?: CityScooterParkingSite['id']; parkingSlotId?: string;
}
export interface CityZombieSnapshot extends CoopVector3 {
  id: number; yaw: number; health: number; kind: 'walker' | 'runner';
}
export type CityEventKind = 'shot' | 'melee' | 'blocked' | 'hit' | 'kill' | 'player-hit' | 'downed' | 'revived' | 'wave' | 'phase' | 'board' | 'dismount' | 'vehicle-hit' | 'vehicle-destroyed';
export interface CityEvent extends CoopVector3 {
  eventId: number; tick: number; kind: CityEventKind; userId: string | null; targetId: number | null;
  direction?: CoopVector3; weapon?: CityWeapon; shotId?: number; meleeId?: number; meleeTool?: CityMeleeTool; targetUserId?: string;
  vehicleId?: number;
}
export interface CitySnapshot {
  matchId: string; tick: number; phase: CityPhase; elapsedMs: number; wave: number; totalWaves: number;
  /** Includes live zombies and any not yet spawned in the current wave. */
  waveRemaining: number; players: CityPlayerSnapshot[]; zombies: CityZombieSnapshot[]; events: CityEvent[];
  vehicles?: CityVehicleSnapshot[];
  reason: CityReason;
}
export interface CityPoint { x: number; z: number }
export interface CityRoad { a: CityPoint; b: CityPoint; width: number; bridge?: boolean; roadId?: number }
export interface CityBuilding { id: number; outline: readonly (readonly number[])[]; height: number }
export interface CityWater { outline: readonly (readonly number[])[]; holes: readonly (readonly (readonly number[])[])[] }
export interface CityWorld {
  id: string; bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  roads: readonly CityRoad[]; buildings: readonly CityBuilding[]; waters: readonly CityWater[];
  spawn: CityPoint & { yaw: number };
  scooterParking?: readonly CityScooterParkingSite[];
}
/** Structural JSON contract shared by the renderer and Node/Steam authority. */
export interface CityMapExtract {
  origin: readonly number[]; bbox: readonly number[]; nodes: readonly (readonly number[])[];
  roads: readonly { id: number; kind: string; lanes: number; rideable: boolean; nodes: readonly number[];
    width?: number; layer?: number; bridge?: boolean; crossing?: boolean; tunnel?: boolean; heights?: readonly number[] }[];
  buildings: readonly { id: number; outline: readonly (readonly number[])[]; height: number | null; levels?: number }[];
  waters?: readonly { outline: readonly (readonly number[])[]; holes: readonly (readonly (readonly number[])[])[] }[];
  replaceRoadIds?: readonly number[];
}
export interface CityWorldExtracts { kecun: CityMapExtract; riverside: CityMapExtract; pazhou: CityMapExtract }
export interface CityOptions { world: CityWorld; seed?: number; waveCounts?: readonly number[]; spawnInterval?: number }
export type CityPlayerProfile = CoopPlayerProfile;
export interface CityRoomMember {
  userId: string; displayName: string; skinId: string; clothingColor: string | null; ready: boolean; connected: boolean;
}
export type CityRoomError = 'steam-unavailable' | 'networking-unavailable' | 'host-left' | 'connection-lost'
  | 'invalid-room' | 'room-started' | 'room-full' | 'operation-failed' | 'login-required';
export interface CityRoomState {
  authority: 'steam-host' | 'development-server' | 'local' | 'cloud-server'; available: boolean;
  status: 'idle' | 'connecting' | 'waiting' | 'running' | 'completed' | 'closed' | 'error';
  lobbyId: string; hostUserId: string; localUserId: string; members: CityRoomMember[]; revision: number; error: CityRoomError | null;
}
export type CityRoomEvent = { type: 'state'; state: CityRoomState } | { type: 'snapshot'; snapshot: CitySnapshot };
export interface CityRoomBridge {
  getState(): Promise<CityRoomState>; create(): Promise<void>; join(lobbyId: string): Promise<void>; leave(): Promise<void>;
  setProfile(profile: CoopAppearanceProfile): Promise<void>; setSkin(skinId: string): Promise<void>;
  setReady(ready: boolean): Promise<void>; start(): Promise<void>; invite(): Promise<void>;
  sendInput(input: CityInput): void; requestSync(): Promise<void>; onEvent(handler: (event: CityRoomEvent) => void): () => void;
}
