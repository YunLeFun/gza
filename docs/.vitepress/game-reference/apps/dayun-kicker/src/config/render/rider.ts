/** Art-directed local dimensions; the same rig is used in the game and showroom. */
export const RIDER_LAYOUT = {
  upperArm: 0.36,
  forearm: 0.32,
  thigh: 0.42,
  shin: 0.4,
  shoulderX: 0.33,
  shoulderY: -0.12,
  shoulderZ: 0.18,
} as const;

export const SCOOTER_LAYOUT = {
  rideHeight: 1.27,
  headlightY: -0.48,
  headlightZ: -0.824,
  gripX: 0.49,
  gripY: -0.16,
  gripZ: -0.5,
  gripLength: 0.18,
  gripRadius: 0.035,
  dashboardY: -0.22,
  dashboardZ: -0.46,
  dashboardScale: 0.72,
  frontAxleZ: -0.94,
  rearAxleZ: 0.64,
  axleY: -1.04,
  deckZ: -0.34,
  deckLength: 0.68,
  deckWidth: 0.74,
} as const;

export type ScooterSeating = "single" | "double";

/** Seat surfaces share the chassis coordinates, independent of viewport/FOV. */
export const SCOOTER_SEATING_LAYOUT = {
  driver: [0, -0.65, 0.22],
  passenger: [0, -0.65, 0.9],
  doubleSeat: { width: 0.55, height: 0.14, length: 1.12, z: 0.52 },
  passengerFoot: { x: 0.32, y: -1.2375, z: 0.78 },
  rearFixtureOffset: 0.26,
} as const;
