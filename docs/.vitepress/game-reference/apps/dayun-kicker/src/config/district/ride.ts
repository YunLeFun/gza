/** Editable speed limits in km/h, shared by the motor and interface. */
export const RIDE_SPEEDS_KMH = {
  forward: 120,
  boost: 150,
  grass: 72,
  water: 50,
  reverse: 25,
  turnAround: 9,
} as const;

export const RIDE_TUNING = {
  // The simulation uses m/s; edit speed limits above.
  forwardSpeed: RIDE_SPEEDS_KMH.forward / 3.6,
  boostSpeed: RIDE_SPEEDS_KMH.boost / 3.6,
  grassSpeed: RIDE_SPEEDS_KMH.grass / 3.6,
  waterSpeed: RIDE_SPEEDS_KMH.water / 3.6,
  reverseSpeed: RIDE_SPEEDS_KMH.reverse / 3.6,
  turnAroundSpeed: RIDE_SPEEDS_KMH.turnAround / 3.6,

  // Acceleration and braking in m/s²; drag coefficients in 1/s.
  acceleration: 6.8,
  boostAcceleration: 9.2,
  grassAcceleration: 4.8,
  waterAcceleration: 2.2,
  waterDeceleration: 8,
  reverseAcceleration: 2.4,
  // Stop from 120 km/h in about 1.4 s, including the brake-then-reverse pedal.
  brake: 24,
  directionBrake: 24,
  overspeedDeceleration: 2.4,
  coastDeceleration: 1.1,
  roadDrag: 0.04,
  grassDrag: 0.065,
  waterDrag: 0.75,

  // Seconds; cooldown starts on activation.
  boostDuration: 6,
  boostCooldown: 18,
} as const;
