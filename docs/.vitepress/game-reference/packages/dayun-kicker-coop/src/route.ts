import type { CoopMap, CoopVector3 } from "./types";

export interface CoopRouteFrame {
  x: number; z: number; yaw: number; width: number; distance: number; segment: number;
  tangentX: number; tangentZ: number; normalX: number; normalZ: number;
}
export interface CoopRouteProjection extends CoopRouteFrame { lateral: number; separation: number }
type Segment = Omit<CoopRouteFrame, "distance" | "segment"> & { start: number; end: number };
const cache = new WeakMap<CoopMap, { segments: Segment[]; length: number }>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function route(map: CoopMap) {
  const cached = cache.get(map); if (cached) return cached;
  const segments: Segment[] = []; let length = 0;
  for (let index = 0; index < (map.path?.length ?? 0) - 1; index++) {
    const from = map.path![index]!, to = map.path![index + 1]!;
    const dx = to.x - from.x, dz = to.z - from.z, span = Math.hypot(dx, dz);
    if (span < 1e-8) continue;
    const tangentX = dx / span, tangentZ = dz / span;
    segments.push({ x: from.x, z: from.z, yaw: Math.atan2(-tangentX, -tangentZ), width: from.width,
      tangentX, tangentZ, normalX: -tangentZ, normalZ: tangentX, start: length, end: length + span });
    length += span;
  }
  const result = { segments, length: segments.length ? length : map.roadLength }; cache.set(map, result); return result;
}

export function getCoopRouteLength(map: CoopMap): number { return route(map).length; }
function segmentAt(segments: Segment[], distance: number) {
  let low = 0, high = segments.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (segments[mid]!.end <= distance) low = mid + 1; else high = mid;
  }
  return low;
}
function frame(segment: Segment, index: number, distance: number): CoopRouteFrame {
  const along = distance - segment.start;
  return { x: segment.x + segment.tangentX * along, z: segment.z + segment.tangentZ * along,
    yaw: segment.yaw, width: segment.width, distance, segment: index,
    tangentX: segment.tangentX, tangentZ: segment.tangentZ, normalX: segment.normalX, normalZ: segment.normalZ };
}

export function getCoopRouteFrame(map: CoopMap, distance: number): CoopRouteFrame {
  const { segments, length } = route(map), along = clamp(Number.isFinite(distance) ? distance : 0, 0, length);
  if (!segments.length) return { x: 0, z: -along, yaw: 0, width: map.roadWidth, distance: along, segment: 0,
    tangentX: 0, tangentZ: -1, normalX: 1, normalZ: 0 };
  const index = segmentAt(segments, along); return frame(segments[index]!, index, along);
}

/** Search only the current cursor's neighbourhood: overlapping return roads never jump progress. */
export function projectCoopRoute(map: CoopMap, position: Pick<CoopVector3, "x" | "z">,
  hintDistance: number, yaw?: number, windowMetres = 24): CoopRouteProjection {
  const { segments, length } = route(map), hint = clamp(Number.isFinite(hintDistance) ? hintDistance : 0, 0, length);
  if (!segments.length) {
    const result = getCoopRouteFrame(map, -position.z);
    return { ...result, lateral: position.x, separation: Math.hypot(position.x - result.x, position.z - result.z) };
  }
  const window = Number.isFinite(windowMetres) ? Math.max(0, windowMetres) : 24;
  const low = Math.max(0, hint - window), high = Math.min(length, hint + window);
  let selected = getCoopRouteFrame(map, hint), score = Infinity;
  const forwardX = yaw === undefined ? 0 : -Math.sin(yaw), forwardZ = yaw === undefined ? 0 : -Math.cos(yaw);
  for (let index = segmentAt(segments, low); index < segments.length && segments[index]!.start <= high; index++) {
    const candidate = segments[index]!;
    const along = clamp(candidate.start + (position.x - candidate.x) * candidate.tangentX + (position.z - candidate.z) * candidate.tangentZ,
      Math.max(low, candidate.start), Math.min(high, candidate.end));
    const projected = frame(candidate, index, along);
    const dx = position.x - projected.x, dz = position.z - projected.z;
    const heading = yaw === undefined ? 0 : (1 - forwardX * candidate.tangentX - forwardZ * candidate.tangentZ) * 0.02;
    const candidateScore = dx * dx + dz * dz + heading + Math.abs(along - hint) * 1e-7;
    if (candidateScore < score) { score = candidateScore; selected = projected; }
  }
  const dx = position.x - selected.x, dz = position.z - selected.z;
  return { ...selected, lateral: dx * selected.normalX + dz * selected.normalZ, separation: Math.hypot(dx, dz) };
}
