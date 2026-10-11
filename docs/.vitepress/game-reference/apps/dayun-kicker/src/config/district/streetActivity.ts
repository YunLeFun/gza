/** Metres and seconds. Keep population and visible instance pools bounded. */
export const STREET_ACTIVITY = {
  pedestrians: 192,
  vehicles: 96,
  buses: 12,
  vans: 16,
  visiblePedestrians: 28,
  visibleVehicles: 14,
  viewDistance: 165,
  vehicleDetailDistance: 65,
  updateHz: 30,
  cellSize: 100,
  pedestriansPerCell: 4,
  vehiclesPerCell: 2,
  walkRange: 3,
  walkSpeed: 0.85,
  turnSeconds: 1.4,
} as const;

export const STREET_VEHICLE_SIZE = {
  car: { width: 1.64, length: 3.8, height: 1.38 },
  microvan: { width: 1.84, length: 4.42, height: 1.86 },
  van: { width: 2.12, length: 5.08, height: 2.18 },
  scooter: { width: 0.52, length: 1.6, height: 1.1 },
  bus: { width: 2.55, length: 10.4, height: 3.2 },
  minibus: { width: 2.25, length: 7.2, height: 2.9 },
} as const;

/** Everyday van paints; each body style shares these five fictional liveries. */
export const VAN_LIVERIES = [
  { name: "瓷白", body: "#eeeae2", trim: "#667478" },
  { name: "银灰", body: "#aeb7bb", trim: "#56646c" },
  { name: "米金", body: "#d5bf94", trim: "#786e5f" },
  { name: "雾蓝", body: "#7899ad", trim: "#475e70" },
  { name: "墨绿", body: "#54776a", trim: "#344f48" },
] as const;

/** Fictional liveries and route numbers; shared by parking and model previews. */
export const BUS_LIVERIES = [
  { name: "木棉红", body: "#d94b50", stripe: "#ffcf83", roof: "#f0e7d8", route: "12" },
  { name: "日落橙", body: "#e8883e", stripe: "#ffe3a1", roof: "#f2eadb", route: "28" },
  { name: "暖阳黄", body: "#e9bb3e", stripe: "#477e86", roof: "#f4efdb", route: "86" },
  { name: "榕荫绿", body: "#389779", stripe: "#bce28d", roof: "#e5efe5", route: "33" },
  { name: "珠江蓝", body: "#3f8cc7", stripe: "#a6deed", roof: "#e6edf0", route: "76" },
  { name: "晚霞紫", body: "#9370c1", stripe: "#efc4e8", roof: "#eee8f2", route: "90" },
] as const;
