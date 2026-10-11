import { distance, roadWidth, type DistrictMap, type Point } from "./map";
import type { LandmarkBarrier } from "./places";

/** The user's west-facing 2026-10-08 photo identifies this divided junction.
 * Road centres are OSM; planting, markings and camera height are visual estimates.
 */
export function tencentJunctionLayout(map: DistrictMap) {
  if (!map.buildings.some(b => b.id === 1396846660)) return null;
  const ids = [12927838530, 12928079570, 12928079569, 12927838528];
  const corners = ids.map(id => map.nodes.find(n => n[0] === id));
  if (corners.some(p => !p)) return null;
  const [sw, nw, ne, se] = corners.map(p => ({ x: p![1]!, z: p![2]! })) as [Point, Point, Point, Point];
  const center = { x: (sw.x + nw.x + ne.x + se.x) / 4, z: (sw.z + nw.z + ne.z + se.z) / 4 };
  const roads = map.roads.filter(r => r.name === "鼎新路" || r.name === "美居北街");
  if (new Set(roads.map(r => r.name)).size !== 2) return null;
  const width = Math.max(...roads.map(roadWidth));
  const dx = distance(nw, ne), dz = distance(nw, sw);
  const rx = Math.min(4.4, (dx - width) / 2 - .8), rz = Math.min(1.7, (dz - width) / 2 - .6);
  if (rx < 1 || rz < .6) return null;
  const point = (x: number, z: number) => ({ x: center.x + x, z: center.z + z });
  const rectangle = (x: number, z: number, w: number, d: number) => [
    [x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2],
  ];
  const island = Array.from({ length: 32 }, (_, i) => {
    const angle = i / 32 * Math.PI * 2; return [center.x + Math.cos(angle) * rx, center.z + Math.sin(angle) * rz];
  });
  // Slice the solid ellipse instead of blocking its rectangular bounding-box corners.
  const barriers: LandmarkBarrier[] = Array.from({ length: 16 }, (_, i) => {
    const x = -rx + (i + .5) * rx / 8;
    return { ...point(x, 0), width: rx / 8 + .025, depth: 2 * rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)), height: .24 };
  });
  const crossings = [
    ...[-1, 1].flatMap(side => [sw, nw].map((p, i) => ({ x: center.x + side * (dx / 2 + width / 2 + 3), z: p.z, yaw: Math.PI / 2, width, side, inbound: side === (i === 0 ? 1 : -1) }))),
    ...[-1, 1].flatMap(side => [nw, ne].map((p, i) => ({ x: p.x, z: center.z + side * (dz / 2 + width / 2 + 3), yaw: 0, width, side, inbound: side === (i === 0 ? -1 : 1) }))),
  ];
  const hatches = corners.map(p => ({ x: p![1]!, z: p![2]!, size: width - .6 }));
  const reserve = (p: Point) => Math.abs(p.x - center.x) < dx / 2 + width / 2 + 8 && Math.abs(p.z - center.z) < dz / 2 + width / 2 + 8;
  const bollards = [-1, 1].flatMap(side => crossings.filter(p => p.yaw === 0).map(cross => ({
    x: cross.x + side * (cross.width / 2 + .6), z: cross.z + cross.side * 2.3,
  })));
  barriers.push(...bollards.map(p => ({ ...p, width: .18, depth: .18, height: .85 })));
  return { center, rx, rz, island, barriers, crossings, hatches, bollards, reserve,
    pavement: rectangle(center.x, center.z, dx + width, dz + width),
    approachWidths: [dz + width, dx + width] as const,
    // Frame westward across the junction, keeping the island in the lower right.
    eye: { ...point(31, 19), y: 18 }, target: { ...point(-65, 13), y: 8 },
  };
}
