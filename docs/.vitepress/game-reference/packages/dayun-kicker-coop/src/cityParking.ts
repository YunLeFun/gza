/** Shared, plain city coordinates for playable and decorative parked scooters. */
export interface CityScooterParkingSite {
  id: 'liyuan' | 'liying' | 'seven';
  name: string;
  slots: readonly { id: string; x: number; z: number; yaw: number }[];
}

/** Guangzhou street-side bays vetted against the composed map and collision geometry. */
export const CITY_SCOOTER_PARKING_SITES = [
  { id: 'liyuan', name: '丽园雅庭', slots: [
    { id: '1', x: 110, z: -61.88, yaw: Math.PI / 3 },
    { id: '2', x: 113, z: -61.88, yaw: Math.PI / 3 },
    { id: '3', x: 116, z: -61.88, yaw: Math.PI / 3 },
  ] },
  { id: 'liying', name: '丽影广场', slots: [
    { id: '1', x: -403, z: 95.7, yaw: 2 * Math.PI / 3 },
    { id: '2', x: -400, z: 95.7, yaw: 2 * Math.PI / 3 },
    { id: '3', x: -397, z: 95.7, yaw: 2 * Math.PI / 3 },
  ] },
  { id: 'seven', name: '7号电动车', slots: [
    { id: '1', x: 241.54834115555974, z: 158.25695984200385, yaw: 2.988457214121708 },
    { id: '2', x: 241.51180519754885, z: 155.21579803707272, yaw: 2.988457214121708 },
    { id: '3', x: 241.47526923953797, z: 152.17463623214152, yaw: 2.988457214121708 },
  ] },
] as const satisfies readonly CityScooterParkingSite[];
