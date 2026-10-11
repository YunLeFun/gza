import type { CoopAppearanceProfile } from "./types";

export const COOP_DEFAULT_CLOTHING_COLOR = null;
export const COOP_PROFILE_NAME_MAX_LENGTH = 24;

/** Normalize user appearance at every boundary; null preserves the selected skin's clothes. */
export function parseCoopAppearanceProfile(value: unknown): CoopAppearanceProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  if (typeof profile.displayName !== "string") return null;
  const displayName = profile.displayName.trim();
  if (!displayName || Array.from(displayName).length > COOP_PROFILE_NAME_MAX_LENGTH
    || /[\u0000-\u001f\u007f-\u009f]/.test(displayName)) return null;
  const clothingColor = profile.clothingColor ?? COOP_DEFAULT_CLOTHING_COLOR;
  if (clothingColor !== null && (typeof clothingColor !== "string" || !/^#[0-9a-f]{6}$/i.test(clothingColor))) return null;
  return { displayName, clothingColor: clothingColor?.toLowerCase() ?? null };
}
