export const VEHICLE_CATEGORIES = [
  { id: "street", label: "街头日常" },
  { id: "freight", label: "货运卡车" },
  { id: "municipal", label: "城市服务" },
  { id: "construction", label: "工程车辆" },
  { id: "playable", label: "可驾驶载具" },
] as const;

export type VehicleCategory = typeof VEHICLE_CATEGORIES[number]["id"];
export interface VehicleCatalogEntry {
  id: string;
  name: string;
  category: VehicleCategory;
  features: string;
  usage: string;
  paint?: string;
  image?: string;
  tags?: readonly string[];
}

export const VEHICLE_CATALOG: readonly VehicleCatalogEntry[] = [
  { id: "microvan", name: "紧凑面包车", category: "street", features: "五菱风格的短车头、滑门与三段侧窗。", usage: "广州街区 · 路边停放", paint: "5 种车漆" },
  { id: "van", name: "平头轻客", category: "street", features: "金杯风格的方头、长车身与高车顶。", usage: "广州街区 · 路边停放", paint: "5 种车漆" },
  { id: "bus", name: "标准城市公交", category: "street", features: "10.4 米车身，前后双门、窗带与车顶空调。", usage: "广州街区 · 停放 / 社区接驳", paint: "6 种涂装" },
  { id: "minibus", name: "电动接驳车", category: "street", features: "7.2 米短轴车身，单门与车顶电池舱。", usage: "广州街区 · 停放 / 社区接驳", paint: "6 种涂装" },
  { id: "car", name: "城市轿车", category: "street", features: "低矮车身、独立车顶与前后灯组。", usage: "比赛 · 路口横向车流；街区另有简化停车模型" },
  { id: "cargo", name: "厢式货车", category: "freight", features: "封闭货箱与独立驾驶室，是常见货运轮廓。", usage: "比赛 · 交通车辆" },
  { id: "tanker", name: "罐车", category: "freight", features: "横卧罐体、环形束带与底盘支架。", usage: "比赛 · 交通车辆 / 特定干扰车辆" },
  { id: "flatbed", name: "平板货车", category: "freight", features: "低平载货平台与堆放货箱。", usage: "比赛 · 交通车辆" },
  { id: "sprinkler", name: "洒水车", category: "municipal", features: "椭圆水罐、尾部喷杆、侧喷头与后爬梯，白车身配绿色腰线。", usage: "比赛 · 城市服务交通车辆" },
  { id: "sanitation", name: "压缩式环卫车", category: "municipal", features: "高箱体、斜置后装填斗、翻桶架与尾部警示条。", usage: "比赛 · 城市服务交通车辆" },
  { id: "heavy", name: "重型货车", category: "freight", features: "高顶导流罩、多轴轮组与排气管。", usage: "比赛 · 交通车辆" },
  { id: "dump", name: "自卸卡车", category: "construction", features: "敞口高边货斗与后部卸料门。", usage: "比赛 · 工程交通车辆" },
  { id: "mixer", name: "混凝土搅拌车", category: "construction", features: "倾斜搅拌罐、支撑架与后部出料结构。", usage: "比赛 · 工程交通车辆" },
  { id: "crane", name: "随车吊", category: "construction", features: "货车底盘上的折叠吊臂与支腿。", usage: "比赛 · 工程交通车辆" },
  { id: "excavator", name: "挖机运输车", category: "construction", features: "平板货车搭载小型履带挖机，铲臂收折。", usage: "比赛 · 工程交通车辆" },
  { id: "roller", name: "压路机", category: "construction", features: "宽钢滚筒、后轮与操作驾驶室。", usage: "比赛 · 工程交通车辆" },
  { id: "loader", name: "装载机", category: "construction", features: "前铲斗、升降臂与四轮底盘。", usage: "比赛 · 工程交通车辆" },
  { id: "scooter", name: "玩家电驴", category: "playable", features: "踏板车身、坐垫与双轮，图示为默认车辆外观。", usage: "主要骑行载具 · 可更换套装" },
  { id: "tank", name: "彩蛋坦克", category: "playable", features: "履带底盘、独立炮塔与长炮管。", usage: "广州街区 · 彩蛋驾驶与战斗" },
];
