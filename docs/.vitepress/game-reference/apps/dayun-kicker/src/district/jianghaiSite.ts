import { districtBridgeDecks, type BridgeDeck } from "./bridgeDecks";
import { roadWidth, type DistrictMap, type Point } from "./map";

export interface JianghaiPier extends Point { deckId: string; height: number; yaw: number; capWidth: number }

/** OSM 614648954/956/962 pedestrian refuges, in this map's WGS84 metre frame.
 * Heights, lane shoulders and support spacing are art estimates. The observed
 * two decks remain independent of Shiliugang's surface carriageways below.
 */
export function jianghaiSiteLayout(map: DistrictMap, decks: readonly BridgeDeck[] = districtBridgeDecks(map)) {
  const elevated = decks.filter(d => d.road?.interchange === "jianghai");
  if (!elevated.some(d => d.road?.id === 233809681)) return null;
  const nodes = new Map(map.nodes.map(n => [n[0], n]));
  const ground = map.roads.flatMap(road => road.nodes.slice(1).flatMap((id, i) => {
    const a = nodes.get(road.nodes[i]!)!, b = nodes.get(id)!;
    const h0 = road.heights?.[i] ?? 0, h1 = road.heights?.[i + 1] ?? 0;
    return Math.max(h0, h1) < 2 ? [{ a: { x: a[1]!, z: a[2]! }, b: { x: b[1]!, z: b[2]! }, width: roadWidth(road) }] : [];
  }));
  const distanceToSegment = (p: Point, a: Point, b: Point) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
  };
  const piers: JianghaiPier[] = [];
  for (const deck of elevated) {
    const sample = (s: number) => {
      let i = 1; while (i < deck.lengths.length - 1 && deck.lengths[i]! < s) i++;
      const a = deck.path[i - 1]!, b = deck.path[i]!, t = (s - deck.lengths[i - 1]!) / (deck.lengths[i]! - deck.lengths[i - 1]!);
      return { x: a[0]! + (b[0]! - a[0]!) * t, z: a[1]! + (b[1]! - a[1]!) * t,
        height: deck.heights[i - 1]! + (deck.heights[i]! - deck.heights[i - 1]!) * t,
        yaw: -Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!) };
    };
    for (let s = 20; s < deck.lengths.at(-1)! - 12; s += 34) {
      // Shift or omit supports at the actual road crossing and turning lanes.
      const p = [0, -6, 6, -12, 12].map(offset => sample(Math.max(3, Math.min(deck.lengths.at(-1)! - 3, s + offset))))
        .find(p => p.height >= 5 && ground.every(g => distanceToSegment(p, g.a, g.b) > g.width / 2 + 2.2)
          && piers.every(q => Math.hypot(p.x - q.x, p.z - q.z) > 15));
      if (p) piers.push({ ...p, height: p.height - 1.9, deckId: deck.id, capWidth: deck.width - 2.2 });
    }
  }
  const pavement = [
    [[820.4,118.18],[830.07,125],[834.12,130.1],[834.85,131.47],[839.02,139.39],[844.94,124.27],[847.7,117.21],[844.75,117.09],[821.59,116.1]],
    [[877.13,132.01],[881.52,129.57],[892.43,122.77],[883.69,121.75],[873.05,120.52],[875.05,126.2]],
    [[859.9,121.24],[863.43,122.15],[862.18,125.07],[860.08,129.62],[856.77,128.53],[858.43,124.71]],
  ];
  const crossings = map.roads.filter(r => [614648953,614648955,614648957,614648958,1395413018].includes(r.id))
    .map(r => r.nodes.map(id => { const n = nodes.get(id)!; return [n[1]!, n[2]!]; }));
  return { piers, pavement, crossings };
}
