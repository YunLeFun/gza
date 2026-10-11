import type { DistrictMap } from "./map";
import { vipshopLayout, vipshopPlanPolygon } from "./vipshopLayout";

/** Roof traces/evidence belong to the lazily loaded authored model. Navigation
 * and collision only need F01 blocks, not pool/court data or the accuracy audit.
 */
export const VIPSHOP_ROOF_TRACE = {
  drawingSize: [1600, 1131], poolDeck: [603, 318, 670, 454],
  pool: [609, 323, 631, 443], court: [693, 352, 755, 454],
  passages: [[671, 314, 806, 600], [806, 537, 1078, 624]],
  scaleBarPixels: 137, scaleBarMetres: 25,
} as const;

export function vipshopRoofLayout(map: DistrictMap) {
  const ground = vipshopLayout(map); if (!ground) return null;
  const polygon = (bounds: readonly number[]) => vipshopPlanPolygon(ground.transform, bounds);
  const drawingScale = VIPSHOP_ROOF_TRACE.scaleBarMetres / VIPSHOP_ROOF_TRACE.scaleBarPixels;
  const scale = Math.hypot(ground.transform.c, ground.transform.s);
  return { ...ground, poolDeck: polygon(VIPSHOP_ROOF_TRACE.poolDeck), pool: polygon(VIPSHOP_ROOF_TRACE.pool),
    court: polygon(VIPSHOP_ROOF_TRACE.court), passages: VIPSHOP_ROOF_TRACE.passages.map(polygon),
    metresPerPixel: scale, drawingMetresPerPixel: drawingScale,
    scaleDifference: scale / drawingScale - 1, manualOverlayResidualMetres: 3, anchorCount: 2 };
}
