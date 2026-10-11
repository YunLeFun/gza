import { ShapeUtils, Vector2 } from "three";
import { inPolygon, roadWidth, type DistrictMap, type Point } from "./map";
import { districtBuildingOutlines, type DistrictPark } from "./places";
import { vipshopRoofLayout } from "./vipshopRoofLayout";
import { PAZHOU_BUILDINGS as ID, PAZHOU_HOSPITAL_SITE_ID } from "./pazhouPlaces";

type Polygon = number[][];
type Bounds = [number, number, number, number];
export interface PazhouPlanter extends Point { buildingId: number; width: number; depth: number; outline: Polygon }
interface GroundLayout {
  courts: { outline: Polygon; surface: "stone" }[];
  strokes: { a: Point; b: Point; width: number; surface: "stone"; sidewalk: number }[];
  parks: DistrictPark[];
  planters: PazhouPlanter[];
}
const cache = new WeakMap<DistrictMap, GroundLayout>();
const boundsOf = (p: Polygon): Bounds => [Math.min(...p.map(p => p[0]!)), Math.min(...p.map(p => p[1]!)), Math.max(...p.map(p => p[0]!)), Math.max(...p.map(p => p[1]!))];
const overlap = (a: Bounds, b: Bounds) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const rectangle = (l: number, t: number, r: number, b: number): Polygon => [[l, t], [r, t], [r, b], [l, b]];
const signedArea = (p: Polygon) => p.reduce((sum, a, i) => { const b = p[(i + 1) % p.length]!; return sum + a[0]! * b[1]! - b[0]! * a[1]!; }, 0) / 2;
const triangulate = (p: Polygon): Polygon[] => ShapeUtils.triangulateShape(p.map(p => new Vector2(p[0]!, p[1]!)), []).map(face => face.map(index => p[index]!));

function clip(input: Polygon, value: (p: number[]) => number) {
  const result: Polygon = [];
  for (let i = 0; i < input.length; i++) {
    const a = input[i]!, b = input[(i + 1) % input.length]!, av = value(a), bv = value(b);
    if (av >= -1e-7) result.push(a);
    if ((av >= 0) !== (bv >= 0)) {
      const t = av / (av - bv); result.push([a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t]);
    }
  }
  return result;
}
/** Partition a convex piece around an obstacle without leaving a filled hole. */
function subtract(piece: Polygon, obstacle: Polygon) {
  if (!overlap(boundsOf(piece), boundsOf(obstacle))) return [piece];
  let inside = piece; const outside: Polygon[] = [], sign = Math.sign(signedArea(obstacle));
  for (let i = 0; i < obstacle.length && inside.length > 2; i++) {
    const a = obstacle[i]!, b = obstacle[(i + 1) % obstacle.length]!;
    const side = (p: number[]) => sign * ((b[0]! - a[0]!) * (p[1]! - a[1]!) - (b[1]! - a[1]!) * (p[0]! - a[0]!));
    const remainder = clip(inside, p => -side(p)); if (remainder.length > 2 && Math.abs(signedArea(remainder)) > 0.05) outside.push(remainder);
    inside = clip(inside, side);
  }
  return outside;
}

/** Local public-space interpretation, constrained by actual roads, site boundary
 * and building footprints. Landscape divisions are photo references, not surveyed.
 * The same polygons feed the renderer's atlas and the ride surface query.
 */
export function pazhouGroundLayout(map: DistrictMap): GroundLayout {
  const previous = cache.get(map); if (previous) return previous;
  const layout: GroundLayout = { courts: [], strokes: [], parks: [], planters: [] };
  const buildings = new Map(map.buildings.map(building => [building.id, building]));
  if (!Object.values(ID).some(id => buildings.has(id))) { cache.set(map, layout); return layout; }
  const nodes = new Map(map.nodes.map(([id, x, z]) => [id!, { x: x!, z: z! }]));
  const roads = map.roads.flatMap(road => road.nodes.slice(1).flatMap((id, i) => {
    const a = nodes.get(road.nodes[i]!), b = nodes.get(id); if (!a || !b) return [];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz); if (length < 0.01) return [];
    const half = roadWidth(road) / 2 + 0.4, ux = dx / length, uz = dz / length;
    const outline = [[a.x - ux * half - uz * half, a.z - uz * half + ux * half],
      [b.x + ux * half - uz * half, b.z + uz * half + ux * half],
      [b.x + ux * half + uz * half, b.z + uz * half - ux * half],
      [a.x - ux * half + uz * half, a.z - uz * half - ux * half]];
    return [{ a, b, ux, uz, length, half, outline, bounds: boundsOf(outline),
      boundary: !["footway", "path", "cycleway", "pedestrian", "steps"].includes(road.kind) }];
  }));
  const obstacles = [...map.buildings.flatMap(b => districtBuildingOutlines(b, map)), ...(map.waters ?? []).map(w => w.outline)]
    .map(outline => ({ outline, bounds: boundsOf(outline), triangles: undefined as Polygon[] | undefined }));
  function addCourt(outline: Polygon, reference: Point, roadBounded: boolean) {
    const bounds = boundsOf(outline), nearby = roads.filter(road => overlap(bounds, road.bounds));
    // Infinite line clipping is used only to choose the building's road block;
    // subtracting local strips afterwards keeps footpaths and curved junctions open.
    if (roadBounded) for (const road of nearby.filter(road => road.boundary)) {
      const offset = (p: number[]) => (p[0]! - road.a.x) * -road.uz + (p[1]! - road.a.z) * road.ux;
      const side = Math.sign(offset([reference.x, reference.z]));
      if (Math.abs(offset([reference.x, reference.z])) < road.half) continue;
      outline = clip(outline, p => offset(p) * side - road.half);
      if (outline.length < 3) return;
    }
    let pieces = triangulate(outline);
    for (const road of nearby) pieces = pieces.flatMap(piece => subtract(piece, road.outline));
    for (const obstacle of obstacles) if (overlap(bounds, obstacle.bounds)) {
      obstacle.triangles ??= triangulate(obstacle.outline);
      for (const triangle of obstacle.triangles) pieces = pieces.flatMap(piece => subtract(piece, triangle));
    }
    layout.courts.push(...pieces.filter(p => p.length > 2 && Math.abs(signedArea(p)) > 0.12).map(outline => ({ outline, surface: "stone" as const })));
  }
  for (const [id, margins] of [
    [ID.tencentSouth, [24, 26, 24, 58]], [ID.tencentNorth, [18, 27, 18, 10]], [ID.joyy, [24, 29, 29, 64]],
  ] as const) {
    const building = buildings.get(id); if (!building) continue;
    const [l, t, r, b] = boundsOf(building.outline), center = { x: (l + r) / 2, z: (t + b) / 2 };
    addCourt(rectangle(l - margins[0], t - margins[1], r + margins[2], b + margins[3]), center, true);
  }
  const hospital = map.sites?.find(site => site.id === PAZHOU_HOSPITAL_SITE_ID);
  for (const passage of vipshopRoofLayout(map)?.passages ?? []) {
    const [l, t, r, b] = boundsOf(passage); addCourt(passage, { x: (l + r) / 2, z: (t + b) / 2 }, false);
  }
  if (hospital && buildings.has(ID.hospitalStreet)) {
    const bounds = boundsOf(hospital.outline);
    addCourt(hospital.outline, { x: (bounds[0] + bounds[2]) / 2, z: (bounds[1] + bounds[3]) / 2 }, false);
  }
  const inCourt = (point: Point) => layout.courts.some(court => inPolygon(point, court.outline));
  // A few shallow planted strips define the forecourts while keeping wide,
  // direct approaches. Their placement is an explicitly approximate landscape.
  for (const id of [ID.tencentSouth, ID.tencentNorth, ID.joyy, ID.hospitalCentral] as const) {
    const building = buildings.get(id); if (!building) continue;
    const [l, t, r, b] = boundsOf(building.outline), width = id === ID.hospitalCentral ? 3 : 8, depth = id === ID.tencentSouth ? 14 : 3;
    const candidates = id === ID.hospitalCentral ? [[r + 13, t + 16], [r + 13, b - 12]]
      : id === ID.tencentNorth ? [[l + 17, t - 11], [r - 16, t - 11]] : [[l + 9, b + 18], [r - 9, b + 18]];
    for (const [x, z] of candidates) {
      const outline = rectangle(x! - width / 2, z! - depth / 2, x! + width / 2, z! + depth / 2);
      if (![...outline, [x!, z!]].every(p => inCourt({ x: p[0]!, z: p[1]! }))) continue;
      const planter = { buildingId: id, x: x!, z: z!, width, depth, outline }; layout.planters.push(planter);
      layout.parks.push({ id: `pazhou-planting-${id}-${layout.planters.length}`, name: "街前花坛 · 景观参考", outline, lawns: [outline], paths: [] });
    }
  }
  // Short north-facing entrance links stop at the road edge, rather than
  // painting stone across a carriageway. Existing asphalt retains priority.
  for (const id of [ID.tencentSouth, ID.joyy, ID.hospitalStreet] as const) {
    const building = buildings.get(id); if (!building) continue;
    const width = id === ID.hospitalStreet ? 3.6 : 5.6;
    const [l, t, r] = boundsOf(building.outline);
    // A mapped small building occupies the middle of the hospital's frontage
    // (way 983078541). Approach the west part of the canopy, leaving it intact.
    const a = { x: id === ID.hospitalStreet ? l + (r - l) * 0.3 : (l + r) / 2, z: t - width / 2 - 0.4 };
    let nearest: { point: Point; distance: number; half: number } | undefined;
    for (const road of roads.filter(r => id === ID.hospitalStreet || r.boundary)) {
      const along = Math.max(0, Math.min(road.length, (a.x - road.a.x) * road.ux + (a.z - road.a.z) * road.uz));
      const point = { x: road.a.x + road.ux * along, z: road.a.z + road.uz * along }, distance = Math.hypot(point.x - a.x, point.z - a.z);
      if (!nearest || distance < nearest.distance) nearest = { point, distance, half: road.half };
    }
    if (!nearest || nearest.distance > 45) continue;
    const length = nearest.distance - nearest.half - width / 2;
    if (length < 1) continue;
    const b = { x: a.x + (nearest.point.x - a.x) * length / nearest.distance, z: a.z + (nearest.point.z - a.z) * length / nearest.distance };
    if (id === ID.hospitalStreet) {
      // The public footway is a few metres outside the mapped campus. Connect
      // just this entrance, with a narrow link clipped against actual obstacles.
      const distance = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / distance, uz = (b.z - a.z) / distance, h = width / 2;
      addCourt([[a.x - ux * h - uz * h, a.z - uz * h + ux * h], [b.x + ux * h - uz * h, b.z + uz * h + ux * h],
        [b.x + ux * h + uz * h, b.z + uz * h - ux * h], [a.x - ux * h + uz * h, a.z - uz * h - ux * h]], a, false);
    }
    const samples = Array.from({ length: 9 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / 8, z: a.z + (b.z - a.z) * i / 8 }));
    const hospitalLink = id === ID.hospitalStreet && samples.every(point => {
      // Validate both pavement edges too. This small public-footway connection
      // may cross the campus boundary, which is not a physical obstruction.
      const length = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
      return [-1, 0, 1].every(side => !obstacles.some(obstacle => inPolygon({ x: point.x + nx * width / 2 * side, z: point.z + nz * width / 2 * side }, obstacle.outline)));
    });
    if (!hospitalLink && !samples.every(inCourt)) continue;
    layout.strokes.push({ a, b, width, surface: "stone", sidewalk: 0 });
  }
  cache.set(map, layout); return layout;
}
