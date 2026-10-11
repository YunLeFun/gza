import { copyInventory, removeItem, storeItem, type InventoryItemId, type InventoryState } from "./inventory";
import { COMMISSION_REWARD_POINTS, serializeScavengingState, type ScavengingState, type ScavengingSiteId } from "./scavengingState";
export { COMMISSION_REWARD_POINTS, createScavengingState, parseScavengingState, serializeScavengingState } from "./scavengingState";
export type { SavedScavengingState, ScavengingState, ScavengingPhase, ScavengingSiteId } from "./scavengingState";

/** A finite first trip: site rewards never reroll, including after cancel/save/load. */
export const SCAVENGING_SITES = [
  { id: "convenience", name: "便利店", reward: { id: "water", quantity: 2 }, searchSeconds: 3 },
  { id: "clinic", name: "诊所", reward: { id: "firstAid", quantity: 1 }, searchSeconds: 4 },
  { id: "repair", name: "维修点", reward: { id: "battery", quantity: 1 }, searchSeconds: 3.5 },
] as const satisfies readonly { id: ScavengingSiteId; name: string; reward: { id: InventoryItemId; quantity: number }; searchSeconds: number }[];

export const copyScavengingState = (state: ScavengingState): ScavengingState => ({
  ...serializeScavengingState(state), activeSearch: state.activeSearch ? { ...state.activeSearch } : null,
});
function scavengingSite(id: unknown) { return SCAVENGING_SITES.find(site => site.id === id); }

interface Transition<Status extends string> { state: ScavengingState; status: Status }

export function acceptScavengingCommission(state: ScavengingState): Transition<"accepted" | "active" | "completed"> {
  if (state.phase !== "available") return { state, status: state.phase };
  return { state: { ...copyScavengingState(state), phase: "active" }, status: "accepted" };
}

export function startScavengingSearch(state: ScavengingState, siteId: unknown): Transition<
  "started" | "unavailable" | "completed" | "busy" | "exhausted" | "invalid-site"
> {
  const site = scavengingSite(siteId);
  if (!site) return { state, status: "invalid-site" };
  if (state.phase === "available") return { state, status: "unavailable" };
  if (state.phase === "completed") return { state, status: "completed" };
  if (state.activeSearch) return { state, status: "busy" };
  if (state.searchedSiteIds.includes(site.id)) return { state, status: "exhausted" };
  return { state: { ...copyScavengingState(state), activeSearch: { siteId: site.id, elapsedSeconds: 0 } }, status: "started" };
}

export function cancelScavengingSearch(state: ScavengingState): Transition<"cancelled" | "idle"> {
  return state.activeSearch
    ? { state: { ...copyScavengingState(state), activeSearch: null }, status: "cancelled" }
    : { state, status: "idle" };
}

interface SearchResult extends Transition<"searching" | "found" | "full" | "idle" | "invalid-time"> {
  inventory: InventoryState;
  foundItem: InventoryItemId | null;
}

/** The runtime cancels when moving, leaving the doorway, pausing, or changing modes. */
export function advanceScavengingSearch(
  state: ScavengingState, inventory: InventoryState, dtSeconds: number, carrying = false,
): SearchResult {
  const unchanged = { state, inventory, foundItem: null };
  if (!state.activeSearch || state.phase !== "active") return { ...unchanged, status: "idle" };
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) return { ...unchanged, status: "invalid-time" };
  const site = scavengingSite(state.activeSearch.siteId)!;
  const elapsedSeconds = Math.min(site.searchSeconds, state.activeSearch.elapsedSeconds + dtSeconds);
  if (elapsedSeconds < site.searchSeconds) {
    return { ...unchanged, state: { ...copyScavengingState(state), activeSearch: { siteId: site.id, elapsedSeconds } }, status: "searching" };
  }
  const nextInventory = copyInventory(inventory);
  const nextState = { ...copyScavengingState(state), activeSearch: null };
  // A failed deposit consumes neither stock nor inventory, and can be retried after freeing space.
  if (!storeItem(nextInventory, site.reward.id, site.reward.quantity, carrying)) {
    return { state: nextState, inventory, status: "full", foundItem: null };
  }
  nextState.searchedSiteIds.push(site.id);
  return { state: nextState, inventory: nextInventory, status: "found", foundItem: site.reward.id };
}

interface DeliveryResult extends Transition<"delivered" | "unavailable" | "completed" | "busy" | "missing-kit"> {
  inventory: InventoryState;
  pointsAwarded: number;
}

/** Commit the kit removal and the one-time reward together; courier records are untouched. */
export function deliverScavengingCommission(state: ScavengingState, inventory: InventoryState): DeliveryResult {
  const unchanged = { state, inventory, pointsAwarded: 0 };
  if (state.phase === "available") return { ...unchanged, status: "unavailable" };
  if (state.phase === "completed") return { ...unchanged, status: "completed" };
  if (state.activeSearch) return { ...unchanged, status: "busy" };
  const index = inventory.slots.findIndex(slot => slot?.id === "firstAid");
  if (index < 0 || !state.searchedSiteIds.includes("clinic")) return { ...unchanged, status: "missing-kit" };
  const nextInventory = copyInventory(inventory);
  if (!removeItem(nextInventory, index)) return { ...unchanged, status: "missing-kit" };
  return {
    state: { ...copyScavengingState(state), phase: "completed", earnedPoints: COMMISSION_REWARD_POINTS },
    inventory: nextInventory, status: "delivered", pointsAwarded: COMMISSION_REWARD_POINTS,
  };
}
