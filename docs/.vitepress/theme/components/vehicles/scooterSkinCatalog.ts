import { SCOOTER_SKINS } from "../../../game-reference/apps/dayun-kicker/src/game/skins";
import type { VehicleCatalogEntry } from "./vehicleCatalog";

export const SCOOTER_SKIN_CATALOG: readonly VehicleCatalogEntry[] = SCOOTER_SKINS.map(skin => ({
  id: `skin-${skin.id}`,
  name: skin.name,
  category: "playable",
  features: skin.description,
  tags: skin.features,
  image: `/scooter-skins/${skin.id}.svg`,
  paint: skin.sku ? "商店权益" : skin.unlockDeliveries !== undefined ? "配送任务" : "初始套装",
  usage: skin.sku
    ? "在线商店权益 · 价格以商品页面为准"
    : skin.unlockDeliveries !== undefined
      ? `骑手登记后完成 ${skin.unlockDeliveries} 单配送`
      : "初始可用",
}));
