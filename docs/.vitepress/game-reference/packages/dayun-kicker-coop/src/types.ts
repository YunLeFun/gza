export type CoopSeat = "driver" | "gunner";
export type CoopPhase = "waiting" | "running" | "won" | "lost";
export type CoopWeapon = "smg" | "shotgun" | "feather-duster" | "gas-cylinder" | "slingshot";
export type CoopZombieKind = "walker" | "runner";
export type CoopReason = "escaped" | "delivered" | "vehicle-destroyed" | "timeout" | "player-disconnected" | "player-left" | null;
export interface CoopVector3 { x: number; y: number; z: number }
export interface CoopShotRequest {
  shotId: number; aimYaw: number; aimPitch: number; weapon: CoopWeapon;
  observedTick?: number;
}
export interface CoopInput {
  inputSequence: number; steer: number; throttle: boolean; brake: boolean; kick: boolean;
  aimYaw: number; aimPitch: number; fire: boolean; shotId: number; reload: boolean; weapon: CoopWeapon;
  /** The latest authoritative frame visible to this client; optional for older clients. */
  observedTick?: number;
  /** Unacknowledged discrete shots, ordered by ID; continuous input may supersede itself. */
  shots?: CoopShotRequest[];
  /** Discrete driver kick; retransmitting an ID never repeats the attack. */
  kickId?: number;
}
export interface CoopAppearanceProfile { displayName: string; clothingColor: string | null }
export interface CoopPlayerProfile { userId: string; displayName: string; skinId?: string; clothingColor?: string | null }
export interface CoopPlayerSnapshot {
  userId: string; displayName: string; skinId: string; clothingColor: string | null; ready: boolean; connected: boolean;
  lastInputSequence: number; kills: number;
  /** Optional for snapshots from older hosts. Includes rejected cooldown attempts. */
  lastKickId?: number;
}
export interface CoopVehicleSnapshot extends CoopVector3 { yaw: number; speed: number; health: number; distance?: number }
export interface CoopZombieSnapshot extends CoopVector3 { id: number; yaw: number; health: number; kind: CoopZombieKind }
export interface CoopGunnerSnapshot {
  aimYaw: number; aimPitch: number; ammo: number; reserve: number; weapon: CoopWeapon;
  reloadMs: number; reloading: boolean; lastShotId: number;
}
export type CoopEventKind = "shot" | "blast" | "hit" | "kill" | "vehicle-hit" | "kick" | "supply" | "resource" | "delivery" | "seat-swap" | "phase";
export interface CoopEvent extends CoopVector3 {
  eventId: number; tick: number; kind: CoopEventKind; userId: string | null; targetId: number | null;
  direction?: CoopVector3; weapon?: CoopWeapon;
  shotId?: number;
  kickId?: number; kickSide?: -1 | 1;
}
export interface CoopRouteSnapshot {
  checkpoint: number; nextSupplyZ: number | null; exitZ: number; canSupply: boolean; swapVotes: string[];
  /** Optional on older wire snapshots; checkpoint counts passed stops, not claimed supplies. */
  supplyClaimed?: boolean;
  swapUsed?: boolean;
  length?: number; distance?: number; nextSupplyDistance?: number | null;
}
export interface CoopDeliveryTarget {
  id: string; name: string; x: number; z: number;
  /** Route cursor prevents completion on a geographically overlapping earlier road. */
  distance?: number;
}
export interface CoopDeliverySnapshot extends CoopDeliveryTarget {
  status: "waiting" | "carrying" | "delivering" | "delivered";
  progressMs: number; requiredMs: number;
}
export type CoopResourceKind = "ammo" | "repair";
export interface CoopResource {
  id: number; kind: CoopResourceKind; x: number; z: number; distance?: number;
}
export interface CoopResourceSnapshot extends CoopResource { collected: boolean }
export interface CoopSnapshot {
  matchId: string; tick: number; phase: CoopPhase; elapsedMs: number; durationMs: number;
  vehicle: CoopVehicleSnapshot; seats: Record<CoopSeat, string | null>;
  players: CoopPlayerSnapshot[]; zombies: CoopZombieSnapshot[]; gunner: CoopGunnerSnapshot;
  route: CoopRouteSnapshot; events: CoopEvent[]; reason: CoopReason;
  /** Optional for old maps and wire snapshots; only the host awards pickups and delivery. */
  delivery?: CoopDeliverySnapshot; resources?: CoopResourceSnapshot[];
}
export interface CoopObstacle { id: string; x: number; z: number; width: number; depth: number; height: number }
export interface CoopSupply { id: number; z: number; x?: number; distance?: number }
export interface CoopRoutePoint { x: number; z: number; width: number }
export interface CoopMap {
  id?: string; path?: readonly CoopRoutePoint[];
  roadWidth: number; roadLength: number; halfWidth: number; exitZ: number;
  obstacles: readonly CoopObstacle[]; supplies: readonly CoopSupply[];
  delivery?: CoopDeliveryTarget; resources?: readonly CoopResource[];
}
export interface CoopOptions { durationMs?: number; maxZombies?: number; seed?: number; map?: CoopMap; spawnInterval?: number }
