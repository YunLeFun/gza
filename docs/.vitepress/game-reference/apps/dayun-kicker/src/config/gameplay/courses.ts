/** Course rules shared by sampling, races, records, scenery and UI. */
export const RACE_COURSES = {
  loop: { length: 1600, laps: 2, gates: 4, duration: 210, closed: true },
  commute: { length: 3400, laps: 1, gates: 4, duration: 240, closed: false },
} as const;
