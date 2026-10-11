import type { CoopWeapon } from "./types";

export const COOP_WEAPON_ORDER: readonly CoopWeapon[] = ["smg", "shotgun", "feather-duster", "gas-cylinder", "slingshot"];
export function isCoopWeapon(value: unknown): value is CoopWeapon {
  return typeof value === "string" && COOP_WEAPON_ORDER.includes(value as CoopWeapon);
}
interface CoopWeaponSpec {
  name: string; mode: "ranged" | "melee" | "area"; consumesAmmo: boolean;
  capacity: number; reserve: number; interval: number; reload: number; range: number;
  damage: number; pellets: number; spread: number; radius: number;
}
export const COOP_WEAPONS = {
  smg: { name: "冲锋枪", mode: "ranged", consumesAmmo: true, capacity: 12, reserve: 180, interval: 0.15, reload: 1, range: 60, damage: 35, pellets: 1, spread: 0, radius: 0 },
  shotgun: { name: "霰弹枪", mode: "ranged", consumesAmmo: true, capacity: 6, reserve: 42, interval: 0.8, reload: 1.4, range: 28, damage: 16, pellets: 6, spread: 0.12, radius: 0 },
  "feather-duster": { name: "鸡毛掸子", mode: "melee", consumesAmmo: false, capacity: 1, reserve: 0, interval: 0.55, reload: 0, range: 3.2, damage: 70, pellets: 1, spread: Math.PI / 3, radius: 0 },
  "gas-cylinder": { name: "煤气罐", mode: "area", consumesAmmo: true, capacity: 1, reserve: 5, interval: 1.2, reload: 1.8, range: 22, damage: 90, pellets: 1, spread: 0, radius: 4 },
  slingshot: { name: "弹弓", mode: "ranged", consumesAmmo: true, capacity: 1, reserve: 60, interval: 0.45, reload: 0.45, range: 45, damage: 70, pellets: 1, spread: 0, radius: 0 },
} as const satisfies Record<CoopWeapon, CoopWeaponSpec>;

