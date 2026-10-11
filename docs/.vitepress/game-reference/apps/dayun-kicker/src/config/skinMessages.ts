/** Shared skin names and themes for the catalog, shop, and garage. */
export const zhCNSkinMessages = {
  stock: { name: "原厂灰黑", description: "灰黑车身，平常模样；陪你走过每条熟悉的街巷。" },
  "yellow-robe": { name: "黄袍加身", description: "黄袍一披，使命在身；把这一城的热饭准时送达。" },
  "blue-memory": { name: "蓝色记忆", description: "曾经穿梭街头的蓝，留在了城市的记忆里。" },
  "flash-racer": { name: "橙风破浪", description: "橙风掠过街角，带着一箱好物奔向下一站。" },
  "emerald-rush": { name: "翡翠疾送", description: "把清晨的鲜绿装进货箱，把新鲜送到每一扇门前。" },
  "night-express": { name: "曜夜速递", description: "穿过城市的灯火与夜色，把最后一单稳稳送达。" },
  guihuo: { name: "霓虹鬼火", description: "霓虹点亮车轮，音响带上节拍；今晚，街头就是舞台。" },
} as const;

export const enUSSkinMessages = {
  stock: { name: "Factory Gray", description: "Quiet gray and black paint, familiar streets, and a scooter that stays by your side." },
  "yellow-robe": { name: "Golden Courier", description: "Wear the golden robe, carry the mission: hot meals, delivered on time." },
  "blue-memory": { name: "Blue Memory", description: "The blue that once crossed these streets lives on in the city's memory." },
  "flash-racer": { name: "Orange Rush", description: "An orange streak rounds the corner, a box of good things bound for the next stop." },
  "emerald-rush": { name: "Emerald Rush", description: "Pack the morning's green into your cargo box and bring freshness to every door." },
  "night-express": { name: "Night Express", description: "Through city lights and midnight streets, bring the last delivery safely home." },
  guihuo: { name: "Neon Ghostfire", description: "Neon wheels, a rolling beat. Tonight, the streets are your stage." },
} as const satisfies Record<keyof typeof zhCNSkinMessages, { name: string; description: string }>;
