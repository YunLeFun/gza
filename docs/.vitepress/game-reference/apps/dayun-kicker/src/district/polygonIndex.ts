import type { Point } from "./map";

/** Index immutable map rings by the ray's height. The crossing rule stays
 * identical to inPolygon, including vertices, horizontal edges and boundaries. */
export function createPolygonTest(polygon: readonly number[][]) {
  const bands = new Map<number, number[]>(), size = 64;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!;
    left = Math.min(left, a[0]!); right = Math.max(right, a[0]!);
    top = Math.min(top, a[1]!); bottom = Math.max(bottom, a[1]!);
    if (a[1] === b[1]) continue;
    for (let band = Math.floor(Math.min(a[1]!, b[1]!) / size); band <= Math.floor(Math.max(a[1]!, b[1]!) / size); band++) {
      const edges = bands.get(band) ?? []; edges.push(i); bands.set(band, edges);
    }
  }
  return (point: Point) => {
    if (point.x < left || point.x > right || point.z < top || point.z > bottom) return false;
    let inside = false;
    for (const i of bands.get(Math.floor(point.z / size)) ?? []) {
      const a = polygon[i]!, b = polygon[(i + polygon.length - 1) % polygon.length]!;
      if ((a[1]! > point.z) !== (b[1]! > point.z)
        && point.x < (b[0]! - a[0]!) * (point.z - a[1]!) / (b[1]! - a[1]!) + a[0]!) inside = !inside;
    }
    return inside;
  };
}
