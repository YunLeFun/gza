import { STREET_VEHICLE_SIZE, VAN_LIVERIES } from "../config/district/streetActivity";

export type VanKind = "microvan" | "van";
export interface VanBoxPart {
  name: string; position: [number, number, number]; size: [number, number, number]; color: string; pitch?: number;
}
export interface VanWheelPart {
  name: string; position: [number, number, number]; width: number; radius: number; color: string;
}
export interface VanModel { boxes: VanBoxPart[]; wheels: VanWheelPart[] }

const GLASS = "#2d4652", RUBBER = "#263038", METAL = "#aab5bc";

/** Original utility vans: local -Z is forward; mirrors and trim fit the parking collider. */
export function createVanModel(kind: VanKind, palette: number): VanModel {
  const compact = kind === "microvan", size = STREET_VEHICLE_SIZE[kind], paint = VAN_LIVERIES[palette]!;
  const width = size.width - .24, length = size.length - .18;
  const front = -length / 2, rear = length / 2, roofY = size.height - .075;
  const radius = compact ? .29 : .34, beltY = compact ? 1.04 : 1.17;
  const cabinFront = compact ? front + 1.06 : front + .12, cabinRear = rear - .075;
  const cabinTop = roofY - .055, cabinBottom = beltY - .1;
  const windowY = compact ? 1.43 : 1.65, windowHeight = compact ? .51 : .65;
  const boxes: VanBoxPart[] = [], wheels: VanWheelPart[] = [];
  const box = (name: string, position: VanBoxPart["position"], dimensions: VanBoxPart["size"], color: string, pitch?: number) =>
    boxes.push({ name, position, size: dimensions, color, ...(pitch ? { pitch } : {}) });

  box("underbody", [0, radius + .025, 0], [width - .16, .15, length - .24], RUBBER);
  box("lower-body", [0, (radius + .12 + beltY) / 2, 0], [width, beltY - radius - .12, length], paint.body);
  box("cabin-shell", [0, (cabinBottom + cabinTop) / 2, (cabinFront + cabinRear) / 2],
    [width - .035, cabinTop - cabinBottom, cabinRear - cabinFront], paint.body);
  box("roof", [0, roofY, (cabinFront + cabinRear) / 2], [width - .015, .1, cabinRear - cabinFront + .05], paint.body);

  const windshieldZ = compact ? cabinFront - .125 : cabinFront - .022, windshieldPitch = compact ? .3 : 0;
  if (compact) {
    box("hood", [0, 1.075, front + .49], [width - .06, .16, .96], paint.body, -.08);
    for (const side of [-1, 1])
      box("a-pillar", [side * (width / 2 - .065), windowY, windshieldZ], [.075, .64, .05], paint.body, windshieldPitch);
  } else {
    box("front-cowl", [0, 1.22, front + .06], [width - .08, .15, .13], paint.body);
  }
  box("windshield", [0, windowY, windshieldZ], [width - .23, windowHeight + .04, .032], GLASS, windshieldPitch);
  box("rear-window", [0, windowY, cabinRear + .018], [width - .24, windowHeight - .035, .036], GLASS);

  const driverFront = cabinFront + .09, driverRear = compact ? -.36 : -1.14;
  const slidingFront = driverRear + .105, slidingRear = compact ? .96 : .95;
  const quarterFront = slidingRear + .105, quarterRear = cabinRear - .115;
  const sideX = width / 2 + .007;
  for (const side of [-1, 1]) {
    for (const [start, end] of [[driverFront, driverRear], [slidingFront, slidingRear], [quarterFront, quarterRear]])
      box("side-windows", [side * sideX, windowY, (start + end) / 2], [.028, windowHeight, end - start], GLASS);
    for (const z of [driverRear + .052, slidingRear + .052])
      box("window-pillar", [side * (sideX + .018), windowY, z], [.026, windowHeight + .025, .062], paint.body);
    box("belt-trim", [side * (sideX + .015), beltY + .055, .1], [.025, .045, length - .38], paint.trim);
    box("side-moulding", [side * (sideX + .017), .7, .12], [.03, .065, length - .44], paint.trim);
    box("sill", [side * (sideX + .009), .405, .22], [.025, .12, length - .56], paint.body);
    box("front-door-seam", [side * (sideX + .016), .78, driverRear + .04], [.022, .45, .018], paint.trim);
    for (const z of [slidingFront - .045, slidingRear + .05])
      box("sliding-door-seam", [side * (sideX + .018), .79, z], [.022, .43, .019], paint.trim);
    box("sliding-door-rail", [side * (sideX + .022), 1.01, .65], [.032, .025, compact ? 1.78 : 2.13], paint.trim);
    for (const z of [driverRear - .15, slidingFront + .17])
      box("door-handle", [side * (sideX + .036), 1.08, z], [.052, .04, .18], METAL);
    const mirrorZ = driverFront + .19;
    box("mirror-arm", [side * (width / 2 + .062), windowY - .11, mirrorZ], [.11, .035, .045], RUBBER);
    box("mirror", [side * (size.width / 2 - .045), windowY - .11, mirrorZ], [.085, .18, .16], paint.trim);
    box("headlight", [side * width * .335, compact ? .89 : 1.01, front - .023], [compact ? .33 : .38, compact ? .22 : .17, .046], "#f3e9c4");
    box("tail-light", [side * width * .407, .97, rear + .025], [.125, compact ? .41 : .49, .05], "#ba4545");
    box("indicator", [side * (sideX + .01), .95, driverFront + .03], [.028, .055, .13], "#e7b36b");
    for (const axle of compact ? [-1.37, 1.35] : [-1.61, 1.58]) {
      wheels.push({ name: "tire", position: [side * (width / 2 - .018), radius, axle], width: .18, radius, color: RUBBER });
      wheels.push({ name: "hub", position: [side * (width / 2 + .018), radius, axle], width: .13, radius: radius * .56, color: METAL });
      box("wheel-arch", [side * (sideX + .018), radius * 2 + .07, axle], [.033, .075, radius * 2 + .1], paint.trim);
    }
  }
  for (const z of [front - .024, rear + .024]) {
    box(z < 0 ? "front-bumper" : "rear-bumper", [0, .46, z], [width - .045, .18, .085], paint.trim);
    box("license-plate", [0, .62, z + Math.sign(z) * .036], [.34, .12, .018], "#426b8d");
  }
  box("grille", [0, compact ? .91 : 1.04, front - .027], [width * .43, compact ? .17 : .22, .04], RUBBER);
  for (const y of compact ? [.88, .94] : [.98, 1.05, 1.12])
    box("grille-slat", [0, y, front - .052], [width * .4, .018, .018], METAL);
  box("tailgate-seam", [0, .84, rear + .025], [width - .29, .019, .018], paint.trim);
  box("tailgate-handle", [0, 1.115, rear + .031], [.23, .04, .028], paint.trim);
  box("rear-wiper", [.12, windowY - .11, cabinRear + .045], [.34, .025, .015], RUBBER);
  return { boxes, wheels };
}

/** Ten models share the existing street body and wheel batches, with no downloaded assets. */
export const VAN_MODELS: Record<VanKind, readonly VanModel[]> = {
  microvan: VAN_LIVERIES.map((_, palette) => createVanModel("microvan", palette)),
  van: VAN_LIVERIES.map((_, palette) => createVanModel("van", palette)),
};
