/** Save validation stays independent of optional search, reward and inventory operations. */
export const SCAVENGING_SITE_IDS = ["convenience", "clinic", "repair"] as const;
export type ScavengingSiteId = typeof SCAVENGING_SITE_IDS[number];
export type ScavengingPhase = "available" | "active" | "completed";
export const COMMISSION_REWARD_POINTS = 120;
export interface SavedScavengingState {
  version: 1;
  phase: ScavengingPhase;
  searchedSiteIds: ScavengingSiteId[];
  earnedPoints: number;
}
export interface ScavengingState extends SavedScavengingState {
  /** A runtime timer, never trusted or resumed from a save. */
  activeSearch: { siteId: ScavengingSiteId; elapsedSeconds: number } | null;
}

export const createScavengingState = (): ScavengingState => ({
  version: 1, phase: "available", searchedSiteIds: [], earnedPoints: 0, activeSearch: null,
});
export const serializeScavengingState = (state: ScavengingState): SavedScavengingState => ({
  version: 1, phase: state.phase, searchedSiteIds: [...state.searchedSiteIds], earnedPoints: state.earnedPoints,
});
/** Validate the one-commission ledger, copy known fields, and cancel any saved timer. */
export function parseScavengingState(value: unknown): ScavengingState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as Record<string, unknown>;
  if (state.version !== 1 || !["available", "active", "completed"].includes(state.phase as string)
    || !Array.isArray(state.searchedSiteIds) || state.searchedSiteIds.length > SCAVENGING_SITE_IDS.length
    || Array.from(state.searchedSiteIds).some(id => !SCAVENGING_SITE_IDS.includes(id as ScavengingSiteId))
    || new Set(state.searchedSiteIds).size !== state.searchedSiteIds.length
    || state.earnedPoints !== (state.phase === "completed" ? COMMISSION_REWARD_POINTS : 0)
    || (state.phase === "available" && state.searchedSiteIds.length > 0)
    || (state.phase === "completed" && !state.searchedSiteIds.includes("clinic"))) return null;
  return {
    version: 1, phase: state.phase as ScavengingPhase,
    searchedSiteIds: [...state.searchedSiteIds] as ScavengingSiteId[],
    earnedPoints: state.earnedPoints as number, activeSearch: null,
  };
}
