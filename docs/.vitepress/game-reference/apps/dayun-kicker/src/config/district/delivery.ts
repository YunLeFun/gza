/** Delivery distances in metres, speeds in m/s, and durations in seconds. */
export const DELIVERY_RULES = {
  radius: 9,
  restaurantPickupRadius: 1.25,
  stopSpeed: 1.2,
  stopSeconds: 1.25,
  cleanBonus: 75,
  minRouteLength: 25,
  scheduledSpeed: 9,
  timeBuffer: 45,
  basePoints: 100,
  metresPerPoint: 10,
  maxTimeBonus: 120,
  timeBonusPerSecond: 2,
} as const;
