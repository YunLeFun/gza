import { BUS_LIVERIES, STREET_VEHICLE_SIZE } from "../config/district/streetActivity";

export type BusKind = "bus" | "minibus";
export interface BusBoxPart {
  name: string; position: [number, number, number]; size: [number, number, number]; color: string;
}
export interface BusWheelPart {
  name: string; position: [number, number, number]; width: number; radius: number; color: string;
}
export interface BusModel { boxes: BusBoxPart[]; wheels: BusWheelPart[] }

const GLASS = "#263f4c", RUBBER = "#26323b", METAL = "#a9bac2", LED = "#ffd478";
const DIGITS = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"];

/** Local -Z is the front. All parts, including mirrors, fit the parking collider. */
export function createBusModel(kind: BusKind, palette: number, route?: string): BusModel {
  const size = STREET_VEHICLE_SIZE[kind], paint = BUS_LIVERIES[palette]!;
  const compact = kind === "minibus", width = size.width - .2, length = size.length - .14;
  const front = -length / 2, rear = length / 2, roofY = compact ? 2.55 : 2.86;
  const windowY = roofY - .68, windowHeight = compact ? .94 : 1.08;
  const boxes: BusBoxPart[] = [], wheels: BusWheelPart[] = [];
  const box = (name: string, position: BusBoxPart["position"], dimensions: BusBoxPart["size"], color: string) =>
    boxes.push({ name, position, size: dimensions, color });
  box("lower-body", [0, .98, 0], [width, 1.06, length], paint.body);
  box("window-shell", [0, (1.51 + roofY - .08) / 2, 0], [width, roofY - .08 - 1.51, length], paint.roof);
  box("roof", [0, roofY, 0], [width + .025, .16, length - .02], paint.roof);
  box("underbody", [0, .35, 0], [width - .18, .18, length - .35], RUBBER);
  const axles = compact ? [-2.15, 2.05] : [-3.25, 3.05], radius = compact ? .4 : .47;
  for (const side of [-1, 1]) {
    const x = side * (width / 2 + .012);
    box("side-windows", [x, windowY, .06], [.024, windowHeight, length - .48], GLASS);
    box("livery-stripe", [side * (width / 2 + .015), 1.22, 0], [.03, .16, length - .1], paint.stripe);
    const bays = compact ? 4 : 6;
    for (let i = 1; i < bays; i++)
      box("window-pillar", [side * (width / 2 + .03), windowY, front + .24 + i * (length - .48) / bays], [.025, windowHeight + .015, .07], paint.roof);
    box("mirror-arm", [side * (width / 2 + .05), windowY + .02, front + .38], [.09, .045, .09], RUBBER);
    box("mirror", [side * (size.width / 2 - .075), windowY - .05, front + .38], [.12, .29, .14], RUBBER);
    for (const z of axles) {
      wheels.push({ name: "tire", position: [side * (width / 2 - .015), radius, z], width: .2, radius, color: RUBBER });
      wheels.push({ name: "hub", position: [side * (width / 2 + .025), radius, z], width: .15, radius: radius * .52, color: METAL });
    }
    box("headlight", [side * width * .33, .91, front - .018], [.38, .15, .036], "#fff1c4");
    box("tail-light", [side * width * .4, 1.02, rear + .018], [.14, .43, .036], "#c33e43");
    box("indicator", [side * (width / 2 + .022), .97, front + .18], [.044, .09, .18], LED);
  }
  for (const z of compact ? [front + .82] : [front + .82, .5]) {
    const doorHeight = roofY - .42, doorY = .28 + doorHeight / 2;
    box("passenger-door", [width / 2 + .045, doorY, z], [.035, doorHeight, 1.13], GLASS);
    box("door-seam", [width / 2 + .071, doorY, z], [.017, doorHeight - .04, .04], paint.roof);
    box("entry-step", [width / 2 + .04, .3, z], [.06, .12, 1.1], METAL);
  }
  box("windshield", [0, windowY, front - .016], [width - .16, windowHeight, .032], GLASS);
  box("windshield-divider", [0, windowY - .13, front - .038], [.045, windowHeight - .28, .016], RUBBER);
  box("rear-window", [0, windowY, rear + .016], [width - .26, windowHeight - .18, .032], GLASS);
  box("front-bumper", [0, .51, front - .02], [width - .08, .14, .04], RUBBER);
  box("rear-bumper", [0, .51, rear + .02], [width - .08, .14, .04], RUBBER);
  for (const z of [front - .046, rear + .046])
    box("license-plate", [0, .69, z], [.35, .13, .018], "#7bb88a");
  for (const y of [.95, 1.03, 1.11])
    box("rear-vent", [0, y, rear + .026], [width * .54, .035, .023], RUBBER);
  box(compact ? "battery-pod" : "air-conditioning", [0, roofY + .19, compact ? .45 : .7], [width * .66, .28, compact ? 1.7 : 2.2], paint.roof);
  for (const z of [.2, .5, .8])
    box("roof-vent", [0, roofY + .335, z], [width * .47, .01, .09], METAL);

  const signY = roofY - .22, signZ = front - .029;
  box("route-display", [0, signY, signZ], [width - .34, .27, .032], RUBBER);
  // Small seven-segment route numbers reuse the body batch, without font textures.
  const segments: Record<string, [number, number, number, number]> = {
    a: [0, .085, .075, .016], b: [.048, .043, .016, .06], c: [.048, -.043, .016, .06],
    d: [0, -.085, .075, .016], e: [-.048, -.043, .016, .06], f: [-.048, .043, .016, .06], g: [0, 0, .075, .016],
  };
  [...(route ?? paint.route)].forEach((digit, i) => {
    for (const segment of DIGITS[Number(digit)]!) {
      const [x, y, w, h] = segments[segment]!;
      box("route-digit", [.55 - i * .16 - x, signY + y, signZ - .025], [w, h, .013], LED);
    }
  });
  for (const y of [signY - .045, signY + .045])
    box("destination-display", [-.22, y, signZ - .025], [.65, .026, .013], LED);
  return { boxes, wheels };
}

/** Cache the twelve models once; nearby vehicles only write shared instance matrices. */
export const BUS_MODELS: Record<BusKind, readonly BusModel[]> = {
  bus: BUS_LIVERIES.map((_, palette) => createBusModel("bus", palette)),
  minibus: BUS_LIVERIES.map((_, palette) => createBusModel("minibus", palette)),
};
