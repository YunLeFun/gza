import { ITEM_TUNING, ITEM_ROW_START, ITEM_ROW_INTERVAL } from "../config/gameplay/items";
import { BOOST_MAX_SPEED, BOOST_MAX_DURATION } from "../config/gameplay/race";

import { SIZE_SHIFT_DURATION } from "../config/gameplay/combat";

import { LANES } from "../config/gameplay/track";
import { type GameState } from "./types";

export const ITEM_KINDS = ["nitro", "shield", "giant", "mini"] as const;
export type ItemKind = typeof ITEM_KINDS[number];
export interface ItemRaceState {
  held: ItemKind | null;
  nextRow: number;
  shieldTimer: number;
  shieldGrace: number;
  collected: number;
  used: number;
  blocked: number;
}
export const itemRowDistance = (row: number) => ITEM_ROW_START + row * ITEM_ROW_INTERVAL;
export function createItemRace(): ItemRaceState {
  return { held: null, nextRow: 0, shieldTimer: 0, shieldGrace: 0, collected: 0, used: 0, blocked: 0 };
}

/** Each row offers all four items; a seeded rotation changes their lanes. */
export function itemAtLane(row: number, lane: number, seed: number | null): ItemKind {
  const rotation = ((Math.imul(row + 1, 1103515245) ^ (seed ?? 73)) >>> 0) % 4;
  return ITEM_KINDS[(lane + rotation) % 4];
}

export function updateItems(state: GameState, previousDistance: number, previousX: number, dt: number) {
  if (state.variant !== "items" || state.mode !== "playing") return false;
  const items = state.items;
  items.shieldTimer = Math.max(0, items.shieldTimer - dt);
  items.shieldGrace = Math.max(0, items.shieldGrace - dt);
  const delta = state.player.distance - previousDistance;
  let collected = false;
  while (delta > 0 && state.player.distance >= itemRowDistance(items.nextRow)) {
    const distance = itemRowDistance(items.nextRow);
    // Interpolate the rider's lateral position at the crossing, including slow frames.
    if (previousDistance < distance && items.held === null) {
      const fraction = (distance - previousDistance) / delta;
      const x = previousX + (state.player.x - previousX) * fraction;
      const lane = LANES.findIndex(position => Math.abs(position - x) <= ITEM_TUNING.pickupHalfWidth);
      if (lane >= 0) {
        items.held = itemAtLane(items.nextRow, lane, state.trackSeed);
        items.collected++;
        state.message = `item.pickup.${items.held}`;
        state.messageTimer = ITEM_TUNING.pickupMessageDuration;
        collected = true;
      }
    }
    items.nextRow++;
  }
  return collected;
}

export function useItem(state: GameState) {
  if (state.variant !== "items" || state.mode !== "playing" || !state.items.held) return false;
  const item = state.items.held;
  state.items.held = null;
  state.items.used++;
  if (item === "nitro") {
    state.player.boostTimer = BOOST_MAX_DURATION;
    state.player.boostSource = "item";
    state.player.speed = Math.min(BOOST_MAX_SPEED, state.player.speed + ITEM_TUNING.nitroSpeedImpulse);
  } else if (item === "shield") {
    state.items.shieldTimer = ITEM_TUNING.shieldDuration;
  } else {
    state.player.sizeMode = item;
    state.player.sizeTimer = SIZE_SHIFT_DURATION;
  }
  state.message = `item.use.${item}`;
  state.messageTimer = ITEM_TUNING.useMessageDuration;
  return true;
}

/** The shield absorbs one vehicle impact and prevents repeated contacts on that frame. */
export function absorbItemCollision(state: GameState) {
  if (state.variant !== "items" || state.mode !== "playing") return false;
  if (state.items.shieldGrace > 0) return true;
  if (state.items.shieldTimer <= 0) return false;
  state.items.shieldTimer = 0;
  state.items.shieldGrace = ITEM_TUNING.shieldGrace;
  state.items.blocked++;
  state.message = "item.blocked";
  state.messageTimer = ITEM_TUNING.pickupMessageDuration;
  return true;
}
