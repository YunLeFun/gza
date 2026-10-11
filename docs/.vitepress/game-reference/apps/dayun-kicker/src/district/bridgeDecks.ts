import { createRoadNetwork, distance, roadWidth, type DistrictMap, type DistrictRoad, type Point } from "./map";

export interface BridgeDeck {
  id: string; name: string; kind: "beam" | "arch" | "road"; width: number; road?: DistrictRoad;
  path: number[][]; heights: number[]; lengths: number[]; edges: number[][][];
}
/** Mitered cross-sections are shared by the visible slab and collision rails. */
export function bridgeDeckEdges(path: number[][], width: number) {
  return path.map((p, i) => {
    const previous = path[Math.max(0, i - 1)]!, next = path[Math.min(path.length - 1, i + 1)]!;
    let bx = p[0]! - previous[0]!, bz = p[1]! - previous[1]!, ax = next[0]! - p[0]!, az = next[1]! - p[1]!;
    if (!i) { bx = ax; bz = az; } if (i === path.length - 1) { ax = bx; az = bz; }
    const bl = Math.hypot(bx, bz), al = Math.hypot(ax, az); bx /= bl; bz /= bl; ax /= al; az /= al;
    let nx = -(bz + az), nz = bx + ax; const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
    const miter = width / 2 / Math.max(0.5, -nx * az + nz * ax);
    return [-1, 1].map(side => [p[0]! + nx * miter * side, p[1]! + nz * miter * side]);
  });
}

export function districtBridgeDecks(map: Pick<DistrictMap, "bridges"> & Partial<Pick<DistrictMap, "roads" | "nodes">>): BridgeDeck[] {
  const nodes = new Map((map.nodes ?? []).map(n => [n[0], n.slice(1, 3)]));
  const elevated: BridgeDeck[] = (map.roads ?? []).filter(r => r.heights).map(road => {
    const path = road.nodes.map(id => nodes.get(id)!), lengths = [0];
    for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(path[i]![0]! - path[i - 1]![0]!, path[i]![1]! - path[i - 1]![1]!));
    const width = roadWidth(road) + 1.2;
    return { id: `interchange:${road.id}`, name: road.name, kind: "road", road, width, path, heights: road.heights!, lengths, edges: bridgeDeckEdges(path, width) };
  });
  return [...elevated, ...(map.bridges ?? []).flatMap(bridge => bridge.paths.filter(p => p.length > 1).map((source, pathIndex) => {
    const width = bridge.kind === "beam" ? 21 : source.length > 30 ? 9.5 : 4;
    const ramp = bridge.kind === "beam" ? 150 : 60, top = bridge.kind === "beam" ? 15.84 : 8.925;
    // The narrow Haixin branch joins the wide deck mid-span, rather than land.
    const branch = bridge.kind === "arch" && bridge.paths.some(p => p !== source && p.some(q => distance({ x: q[0]!, z: q[1]! }, { x: source[0]![0]!, z: source[0]![1]! }) < 0.01));
    const distances = [0];
    for (let i = 1; i < source.length; i++) distances.push(distances[i - 1]! + Math.hypot(source[i]![0]! - source[i - 1]![0]!, source[i]![1]! - source[i - 1]![1]!));
    const total = distances.at(-1)!;
    const samples = [...new Set([...distances, Math.min(ramp, total / 2), Math.max(total - ramp, total / 2)])].sort((a, b) => a - b);
    let segment = 1;
    const path = samples.map(s => {
      while (segment < distances.length - 1 && distances[segment]! < s) segment++;
      const a = source[segment - 1]!, b = source[segment]!, t = (s - distances[segment - 1]!) / (distances[segment]! - distances[segment - 1]!);
      return [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t];
    });
    const heights = samples.map(s => branch ? top : top * Math.max(0, Math.min(1, s / ramp, (total - s) / ramp)));
    return { id: `${bridge.id}:${pathIndex}`, name: bridge.name, kind: bridge.kind, width, path, heights, lengths: samples, edges: bridgeDeckEdges(path, width) };
  }))];
}

/** Clip guardrails against connecting decks, including capsule clearance.
 * Every retained rail piece is shared by rendering and Rapier. */
export function bridgeRailSegments(deck: BridgeDeck, index: number, side: number, decks: readonly BridgeDeck[]) {
  const a = deck.edges[index - 1]![side]!, b = deck.edges[index]![side]!;
  const start = deck.lengths[index - 1]!, end = deck.lengths[index]!, total = deck.lengths.at(-1)!;
  const low = deck.heights[0]! < 0.01 ? Math.max(0, (1.5 - start) / (end - start)) : 0;
  const high = deck.heights.at(-1)! < 0.01 ? Math.min(1, (total - 1.5 - start) / (end - start)) : 1;
  let pieces: [number, number][] = low < high ? [[low, high]] : [];
  for (const other of decks) {
    if (other === deck) continue;
    const joined = deck.road && other.road && deck.road.nodes.some(id => other.road!.nodes.includes(id));
    for (let i = 1; i < other.path.length; i++) {
      const p = other.path[i - 1]!, q = other.path[i]!, dx = q[0]! - p[0]!, dz = q[1]! - p[1]!, length = Math.hypot(dx, dz);
      const local = (v: number[]) => [((v[0]! - p[0]!) * dx + (v[1]! - p[1]!) * dz) / length,
        ((v[1]! - p[1]!) * dx - (v[0]! - p[0]!) * dz) / length];
      const start = local(a), end = local(b), margin = other.width / 2 + 0.4;
      let lo = 0, hi = 1;
      for (let axis = 0; axis < 2; axis++) {
        const min = axis ? -margin : -0.4, max = axis ? margin : length + 0.4, delta = end[axis]! - start[axis]!;
        if (Math.abs(delta) < 1e-9) { if (start[axis]! < min || start[axis]! > max) { hi = -1; break; } continue; }
        const t1 = (min - start[axis]!) / delta, t2 = (max - start[axis]!) / delta;
        lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
      }
      if (lo >= hi) continue;
      // At a real shared ramp junction, the rider's head can still intersect
      // a diverging rail after the deck elevations differ by half a metre.
      const tolerance = joined ? 1.9 : 0.4, rise = other.heights[i]! - other.heights[i - 1]!;
      const difference = deck.heights[index - 1]! - other.heights[i - 1]! - rise * start[0]! / length;
      const slope = deck.heights[index]! - deck.heights[index - 1]! - rise * (end[0]! - start[0]!) / length;
      if (Math.abs(slope) < 1e-9) { if (Math.abs(difference) > tolerance) continue; }
      else {
        const first = (-tolerance - difference) / slope, last = (tolerance - difference) / slope;
        lo = Math.max(lo, Math.min(first, last)); hi = Math.min(hi, Math.max(first, last));
        if (lo >= hi) continue;
      }
      pieces = pieces.flatMap(([low, high]) => hi <= low || lo >= high ? [[low, high]]
        : [...(lo > low ? [[low, lo]] : []), ...(hi < high ? [[hi, high]] : [])] as [number, number][]);
    }
  }
  const at = (t: number) => ({ x: a[0]! + (b[0]! - a[0]!) * t, z: a[1]! + (b[1]! - a[1]!) * t,
    y: deck.heights[index - 1]! + (deck.heights[index]! - deck.heights[index - 1]!) * t });
  return pieces.filter(([lo, hi]) => hi - lo > 0.001).map(([lo, hi]) => ({ a: at(lo), b: at(hi) }));
}

export function sampleBridgeDeck(decks: readonly BridgeDeck[], point: Point, referenceHeight = Infinity) {
  let best: { deck: BridgeDeck; height: number; distance: number } | null = null;
  for (const deck of decks) for (let i = 1; i < deck.path.length; i++) {
    const a = deck.path[i - 1]!, b = deck.path[i]!, dx = b[0]! - a[0]!, dz = b[1]! - a[1]!, squared = dx * dx + dz * dz;
    const raw = ((point.x - a[0]!) * dx + (point.z - a[1]!) * dz) / squared;
    if (i === 1 && raw < -0.001 || i === deck.path.length - 1 && raw > 1.001) continue;
    const t = Math.max(0, Math.min(1, raw)), d = Math.hypot(point.x - a[0]! - dx * t, point.z - a[1]! - dz * t);
    const height = deck.heights[i - 1]! + (deck.heights[i]! - deck.heights[i - 1]!) * t;
    // Retain ground passages underneath an elevated span. A moving scooter can
    // acquire a deck only through a ramp or another deck at the same elevation.
    if (d > deck.width / 2 + 0.12 || Number.isFinite(referenceHeight) && Math.abs(height - referenceHeight) > 0.65) continue;
    if (!best || d < best.distance) best = { deck, height, distance: d };
  }
  return best;
}

/** Excavation walls reach the surface; surface crossings retain their openings. */
export function bridgeRetainingSegments(deck: BridgeDeck, index: number, side: number, decks: readonly BridgeDeck[]) {
  if (Math.min(deck.heights[index - 1]!, deck.heights[index]!) >= 0) return [];
  const surface = { ...deck, road: undefined, heights: deck.heights.map(() => 0) };
  const a = deck.edges[index - 1]![side]!, b = deck.edges[index]![side]!;
  const dx = b[0]! - a[0]!, dz = b[1]! - a[1]!;
  const at = (p: { x: number; z: number }) => {
    const t = Math.max(0, Math.min(1, ((p.x - a[0]!) * dx + (p.z - a[1]!) * dz) / (dx * dx + dz * dz)));
    return { ...p, y: deck.heights[index - 1]! + (deck.heights[index]! - deck.heights[index - 1]!) * t };
  };
  return bridgeRailSegments(surface, index, side, decks.filter(d => d !== deck)).map(r => ({ a: at(r.a), b: at(r.b) }));
}

/** Add bridge paths to routing, joining only real endpoints, never streets below. */
export function withBridgeRoutes(map: DistrictMap): DistrictMap {
  if (map.roads.some(r => r.id === -9_000_000)) return map;
  const decks = districtBridgeDecks(map).filter(d => d.kind !== "road"); if (!decks.length) return map;
  const nodes = map.nodes.map(n => [...n]), roads = map.roads.map(r => ({ ...r, nodes: [...r.nodes] }));
  const ground = createRoadNetwork(map), coordinates = new Map<string, number>();
  let id = -9_000_000;
  const add = (p: number[], height: number) => {
    const key = `${p[0]!.toFixed(3)}:${p[1]!.toFixed(3)}:${height.toFixed(3)}`;
    if (coordinates.has(key)) return coordinates.get(key)!;
    const n = id--; coordinates.set(key, n); nodes.push([n, p[0]!, p[1]!, height]); return n;
  };
  decks.forEach((deck, index) => {
    const routeNodes = deck.path.map((p, i) => add(p, deck.heights[i]!));
    for (const end of [0, deck.path.length - 1]) {
      if (deck.heights[end]! > 0.01) continue;
      const p = deck.path[end]!, snap = ground.nearest({ x: p[0]!, z: p[1]! });
      if (snap.distance > 25) continue;
      let junction = snap.t < 0.001 ? snap.edge.a : snap.t > 0.999 ? snap.edge.b : add([snap.x, snap.z], 0);
      if (junction !== snap.edge.a && junction !== snap.edge.b) {
        for (const road of roads) for (let n = road.nodes.length - 1; n > 0; n--) {
          if (road.nodes[n - 1] === snap.edge.a && road.nodes[n] === snap.edge.b || road.nodes[n - 1] === snap.edge.b && road.nodes[n] === snap.edge.a) road.nodes.splice(n, 0, junction);
        }
      }
      if (snap.distance < 0.05) {
        routeNodes[end] = junction;
        coordinates.set(`${p[0]!.toFixed(3)}:${p[1]!.toFixed(3)}:0.000`, junction);
      }
      // A short, ground-level landing connects the centreline to the existing
      // roadside path without changing the surveyed bridge plan geometry.
      if (junction !== routeNodes[end]) {
        const neighbour = deck.path[end === 0 ? 1 : end - 1]!, dx = p[0]! - neighbour[0]!, dz = p[1]! - neighbour[1]!, length = Math.hypot(dx, dz);
        // Approach through the open end, rather than sideways into the first
        // guardrail post. The landing stays three metres beyond the ramp.
        const apron = add([p[0]! + dx / length * 3, p[1]! + dz / length * 3], 0);
        roads.push({ id: -9_100_000 - index * 2 - Number(end > 0), name: `${deck.name}入口`, kind: "cycleway", lanes: 1, oneWay: 0, rideable: true, width: 3, nodes: [junction, apron, routeNodes[end]!] });
      }
    }
    roads.push({ id: -9_000_000 - index, name: deck.name, kind: deck.kind === "beam" ? "secondary" : "cycleway", lanes: deck.kind === "beam" ? 3 : 1, width: deck.width, oneWay: 0, rideable: true, bridge: true, layer: 1, nodes: routeNodes });
  });
  return { ...map, nodes, roads };
}
