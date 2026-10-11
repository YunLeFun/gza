import { COURIER_SKIN_TASKS } from "../config/progression";
import { zhCNSkinMessages } from "../config/skinMessages";
import type { CourierProgress } from "./courierCareer";

export type ScooterSkinId = "stock" | "yellow-robe" | "blue-memory" | "flash-racer" | "emerald-rush" | "night-express" | "guihuo";
export type ScooterSkinTheme = Exclude<ScooterSkinId, "stock">;

/** Read old selections without keeping duplicate models or storefront entries. */
export const LEGACY_SKIN_ALIASES: Readonly<Record<string, ScooterSkinId>> = {
  "courier-yellow": "yellow-robe", "delivery-gold": "yellow-robe",
  "courier-orange": "flash-racer", "neon-rush": "guihuo", "courier-green": "emerald-rush",
};

export interface ScooterRiderPalette {
  jacket: string;
  cuff: string;
  pants: string;
  footwear: string;
  torso?: string;
  helmet?: string;
  trim?: string;
  /** Keeps clothing trim light independent of a vehicle paint override. */
  trimEmissive?: string;
}

/** Sky blue passenger clothes pair with the stock driver's cloud white outfit. */
export const DEFAULT_PASSENGER_RIDER_PALETTE: ScooterRiderPalette = {
  torso: "#6aadd5", jacket: "#6aadd5", cuff: "#5b9ac1",
  pants: "#263744", footwear: "#333b40", helmet: "#6aadd5", trim: "#7db9dd",
};

export interface ScooterSkinPalette {
  theme?: ScooterSkinTheme;
  delivery?: { color: string; title: string; subtitle: string };
  /** Optional box paint; delivery.color still identifies the original outfit. */
  cargoColor?: string;
  shell: string;
  graphite: string;
  accent: string;
  emissive: string;
  rubber: string;
  rider: ScooterRiderPalette;
}

export interface ScooterSkinDefinition {
  id: ScooterSkinId;
  sku?: string;
  legacySkus?: readonly string[];
  name: string;
  description: string;
  features?: readonly string[];
  mark?: string;
  symbol?: string;
  unlockDeliveries?: number;
  palette: ScooterSkinPalette;
}

export const SCOOTER_SKINS: readonly ScooterSkinDefinition[] = [
  {
    id: "stock",
    ...zhCNSkinMessages.stock,
    palette: {
      shell: "#697176",
      graphite: "#202528",
      accent: "#969fa3",
      emissive: "#000000",
      rubber: "#111516",
      cargoColor: "#202528",
      rider: {
        torso: "#f2f4ef",
        jacket: "#f2f4ef",
        cuff: "#cbd2d1",
        pants: "#162a32",
        footwear: "#333b40",
        helmet: "#f2f4ef",
        trim: "#a6b2b1",
      },
    },
  },
  {
    id: "yellow-robe",
    legacySkus: ["skin-delivery-gold"],
    unlockDeliveries: COURIER_SKIN_TASKS["yellow-robe"],
    ...zhCNSkinMessages["yellow-robe"],
    features: ["整套制服", "双耳头盔", "保温箱"],
    mark: "GOLD / DELIVERY",
    palette: {
      theme: "yellow-robe", shell: "#ffcf24", graphite: "#202329", accent: "#ffe777",
      emissive: "#ffb51b", rubber: "#14181e",
      delivery: { color: "#ffcf24", title: "黄袍加身", subtitle: "每一单都热乎" },
      rider: { jacket: "#ffcf24", cuff: "#202329", pants: "#202329", footwear: "#f4f0df", trim: "#e9f4df" },
    },
  },
  {
    id: "blue-memory",
    unlockDeliveries: COURIER_SKIN_TASKS["blue-memory"],
    ...zhCNSkinMessages["blue-memory"],
    features: ["蓝白制服", "云纹头盔", "波纹涂装"], mark: "BLUE / MEMORY", symbol: "≈",
    palette: {
      theme: "blue-memory", shell: "#168bee", graphite: "#172b43", accent: "#e6f5ff",
      emissive: "#49b9ff", rubber: "#101c2c",
      delivery: { color: "#168bee", title: "蓝色记忆", subtitle: "每一程都记得" },
      rider: { jacket: "#168bee", cuff: "#e6f5ff", pants: "#172b43", footwear: "#e6f5ff", trim: "#e6f5ff" },
    },
  },
  {
    id: "flash-racer",
    unlockDeliveries: COURIER_SKIN_TASKS["flash-racer"],
    ...zhCNSkinMessages["flash-racer"],
    features: ["橙黑制服", "闪电涂装", "速达货箱"],
    mark: "FLASH / EXPRESS", symbol: "ϟ",
    palette: {
      theme: "flash-racer", shell: "#ff5a1f", graphite: "#202329", accent: "#202329",
      emissive: "#ff883e", rubber: "#161b24",
      delivery: { color: "#ff5a1f", title: "橙风破浪", subtitle: "好物闪电到" },
      rider: { jacket: "#ff5a1f", cuff: "#202329", pants: "#202329", footwear: "#202329", trim: "#202329" },
    },
  },
  {
    id: "emerald-rush",
    unlockDeliveries: COURIER_SKIN_TASKS["emerald-rush"],
    ...zhCNSkinMessages["emerald-rush"],
    features: ["鲜绿制服", "象耳头盔", "生鲜货箱"], mark: "JADE / FRESH", symbol: "♧",
    palette: {
      theme: "emerald-rush", shell: "#29b85b", graphite: "#173c32", accent: "#efffe8",
      emissive: "#64e883", rubber: "#10271e",
      delivery: { color: "#29b85b", title: "翡翠疾送", subtitle: "新鲜一路直达" },
      rider: { jacket: "#29b85b", cuff: "#efffe8", pants: "#173c32", footwear: "#efffe8", trim: "#efffe8" },
    },
  },
  {
    id: "night-express",
    unlockDeliveries: COURIER_SKIN_TASKS["night-express"],
    ...zhCNSkinMessages["night-express"],
    features: ["炭黑制服", "反光肩线", "安全货箱"], mark: "NIGHT / EXPRESS", symbol: "»",
    palette: {
      theme: "night-express", shell: "#252a32", graphite: "#15191f", accent: "#bd344b",
      emissive: "#c54356", rubber: "#0e1116",
      delivery: { color: "#252a32", title: "曜夜速递", subtitle: "沉稳出发 极速抵达" },
      rider: { jacket: "#252a32", cuff: "#bd344b", pants: "#15191f", footwear: "#c4cbd3", trim: "#c4cbd3" },
    },
  },
  {
    id: "guihuo",
    sku: "skin-guihuo",
    legacySkus: ["skin-neon-rush"],
    ...zhCNSkinMessages.guihuo,
    features: ["黄毛墨镜", "RGB 灯效", "可播音乐"],
    mark: "RGB · ♫", symbol: "♫",
    palette: {
      theme: "guihuo", shell: "#982cff", graphite: "#16112a", accent: "#29f6e5",
      emissive: "#00eaca", rubber: "#0d101d",
      rider: { jacket: "#201830", cuff: "#ff47a9", pants: "#171329", footwear: "#d5ff4b", torso: "#201830", helmet: "#201830", trim: "#29f6e5" },
    },
  },
] as const;

export function getScooterSkin(id: string | null | undefined): ScooterSkinDefinition {
  const currentId = id && Object.hasOwn(LEGACY_SKIN_ALIASES, id) ? LEGACY_SKIN_ALIASES[id] : id;
  return SCOOTER_SKINS.find(skin => skin.id === currentId) ?? SCOOTER_SKINS[0];
}

/** Collection swatches identify the primary paint, rather than pale trim colors. */
export function getScooterSkinSwatch(id: string): string {
  const skin = getScooterSkin(id);
  return skin.id === "guihuo"
    ? "linear-gradient(145deg, #d5ff4b, #29f6e5 30%, #982cff 65%, #ff47a9)"
    : skin.palette.shell;
}

export function findScooterSkinBySku(sku: string): ScooterSkinDefinition | undefined {
  return SCOOTER_SKINS.find(skin => skin.sku === sku || skin.legacySkus?.includes(sku));
}

export function isScooterSkinId(value: string): value is ScooterSkinId {
  return SCOOTER_SKINS.some(skin => skin.id === value);
}

export function canEquipScooterSkin(id: string, entitlementSkus: readonly string[], courier: CourierProgress): boolean {
  const skin = getScooterSkin(id);
  if (skin.legacySkus?.some(sku => entitlementSkus.includes(sku))) return true;
  if (skin.sku) return entitlementSkus.includes(skin.sku);
  if (skin.unlockDeliveries !== undefined) return courier.registered && courier.deliveries >= skin.unlockDeliveries;
  return true;
}
