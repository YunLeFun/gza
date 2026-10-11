import { INVENTORY_ITEMS, createInventory } from '../../../game-reference/apps/dayun-kicker/src/district/inventory';
import { SCAVENGING_SITES } from '../../../game-reference/apps/dayun-kicker/src/district/scavenging';
import { ITEM_KINDS } from '../../../game-reference/apps/dayun-kicker/src/game/items';
import { ITEM_TUNING } from '../../../game-reference/apps/dayun-kicker/src/config/gameplay/items';
import { SIZE_SHIFT_DURATION } from '../../../game-reference/apps/dayun-kicker/src/config/gameplay/combat';
import { COOP_WEAPONS, COOP_WEAPON_ORDER, COOP_RESOURCE_EFFECTS } from '../../../game-reference/packages/dayun-kicker-coop/src/map';
import { CITY_MELEE_TOOLS, CITY_MELEE_ORDER, CITY_MELEE } from '../../../game-reference/packages/dayun-kicker-coop/src/cityMelee';

export const ITEM_CATEGORIES = ['全部', '武器', '补给', '任务物品', '随身物品', '竞速道具'] as const;
export type ItemCategory = typeof ITEM_CATEGORIES[number];
export interface CatalogItem {
  id: string; name: string; category: ItemCategory; modes: string; appearance: string;
  use: string; obtain: string; preview: boolean; modelNote: string; source: string;
}
const weaponLooks: Record<string, string> = {
  smg: '短枪身、弹匣与枪托；当前沿用后座射手的通用枪械外观',
  shotgun: '当前与冲锋枪共用后座射手的通用枪械外观，并非独立霰弹枪模型',
  'feather-duster': '木柄与暖色羽毛簇', 'gas-cylinder': '绿色金属罐身、顶部阀门与提环', slingshot: '木质 Y 形叉架、橡皮筋与弹丸',
  broom: '长木柄、宽扁黄色刷头', umbrella: '深色长柄与收拢的黄色伞面', 'frying-pan': '深色圆锅身与短柄', 'pot-lid': '金属圆盖与中央握把',
};
const raceInfo = {
  nitro: { name: '氮气', use: '触发冲刺并获得速度提升', appearance: '黄色问号箱' },
  shield: { name: '护盾', use: `抵挡一次载具撞击，最长持续 ${ITEM_TUNING.shieldDuration} 秒`, appearance: '青绿色问号箱' },
  giant: { name: '巨大化', use: `临时变大，持续 ${SIZE_SHIFT_DURATION} 秒`, appearance: '橙色问号箱' },
  mini: { name: '缩小', use: `临时缩小，持续 ${SIZE_SHIFT_DURATION} 秒`, appearance: '浅紫色问号箱' },
} satisfies Record<typeof ITEM_KINDS[number], { name: string; use: string; appearance: string }>;
const inventoryLooks = { water: '仅背包文字槽位，暂无独立水瓶模型', battery: '仅背包文字槽位，暂无独立电池模型', handbook: '仅背包文字槽位，暂无独立书本模型', firstAid: '仅背包文字槽位，暂无独立急救包模型' };
const initial = createInventory();
export const ITEM_CATALOG: readonly CatalogItem[] = [
  ...COOP_WEAPON_ORDER.map(id => {
    const spec = COOP_WEAPONS[id];
    return { id: `weapon:${id}`, name: spec.name, category: '武器' as const,
      modes: id === 'smg' || id === 'shotgun' ? '僵尸突围 / 旧双座路线兼容' : '旧双座路线兼容',
      appearance: weaponLooks[id]!, use: `${spec.mode === 'melee' ? '近战挥击' : spec.mode === 'area' ? '范围攻击' : '远程攻击'}；旧双座路线伤害 ${spec.damage}，射程 ${spec.range} 米${spec.consumesAmmo ? `，弹匣 ${spec.capacity}` : '，不消耗弹药'}。统一突围以城市规则为准。`,
      obtain: '进入合作模式后使用武器切换键选择；不属于街区商店商品', preview: true,
      modelNote: id === 'smg' || id === 'shotgun' ? '游戏共用枪械程序模型' : '游戏原始程序模型', source: 'packages/dayun-kicker-coop/src/map.ts' };
  }),
  ...CITY_MELEE_ORDER.map(id => {
    const spec = CITY_MELEE_TOOLS[id];
    return { id: `melee:${id}`, name: spec.name, category: '武器' as const, modes: '僵尸突围 · 步行', appearance: weaponLooks[id]!,
      use: `伤害 ${spec.damage}，范围 ${spec.range} 米，冷却 ${spec.cooldownMs / 1000} 秒${id === 'pot-lid' ? `；正面短暂格挡减伤 ${CITY_MELEE.guardReduction * 100}%` : ''}`,
      obtain: '僵尸突围中选择近战工具；不需要在街区搜查拾取', preview: true, modelNote: '游戏原始程序模型', source: 'packages/dayun-kicker-coop/src/cityMelee.ts' };
  }),
  ...Object.entries(INVENTORY_ITEMS).map(([key, spec]) => {
    const id = key as keyof typeof INVENTORY_ITEMS;
    const sources = SCAVENGING_SITES.filter(site => site.reward.id === id).map(site => `${site.name}搜查`);
    if (initial.slots.some(slot => slot?.id === id)) sources.unshift('新存档初始携带');
    if (spec.price) sources.push(`补给购买（${spec.price} 积分）`);
    return { id: `inventory:${id}`, name: spec.name, category: id === 'firstAid' ? '任务物品' as const : id === 'handbook' ? '随身物品' as const : '补给' as const,
      modes: '广州街区自由骑行', appearance: inventoryLooks[id], use: `${spec.description} 每格最多 ${spec.maxStack} 个。`, obtain: sources.join(' / '),
      preview: false, modelNote: '暂无独立 3D 模型 · 文字预览', source: 'apps/dayun-kicker/src/district/inventory.ts' };
  }),
  ...ITEM_KINDS.map(id => ({ id: `race:${id}`, ...raceInfo[id], category: '竞速道具' as const, modes: '道具赛',
    obtain: '驶过赛道上的对应问号箱；持有槽位为空时拾取', preview: true, modelNote: '游戏原始拾取箱模型（不是道具实体）', source: 'apps/dayun-kicker/src/game/items.ts' })),
  { id: 'resource:ammo', name: '弹药补给', category: '补给', modes: '广州双人合作配送', appearance: '路线上的弹药资源箱',
    use: `补充当前武器储备弹药：${COOP_WEAPON_ORDER.map(id => `${COOP_WEAPONS[id].name} ${COOP_RESOURCE_EFFECTS.ammo[id]}`).join(' / ')}`,
    obtain: '在路线资源点附近减速拾取；每个资源点仅能收集一次', preview: false, modelNote: '资源箱尚未接入独立预览 · 文字预览', source: 'packages/dayun-kicker-coop/src/map.ts' },
  { id: 'resource:repair', name: '维修补给', category: '补给', modes: '广州双人合作配送', appearance: '路线上的维修资源箱',
    use: `恢复载具 ${COOP_RESOURCE_EFFECTS.repair} 点耐久，不超过上限`, obtain: '在路线资源点附近减速拾取；每个资源点仅能收集一次',
    preview: false, modelNote: '资源箱尚未接入独立预览 · 文字预览', source: 'packages/dayun-kicker-coop/src/map.ts' },
  { id: 'cargo:delivery', name: '配送货物', category: '任务物品', modes: '街区配送 / 广州双人合作配送', appearance: '订单名称及外卖箱载货状态；不同订单没有独立货物模型',
    use: '运送到订单指定目的地；街区配送时预留一个背包格', obtain: '接受订单并到取货点完成取货', preview: false,
    modelNote: '暂无独立货物模型 · 文字预览', source: 'apps/dayun-kicker/src/district/delivery.ts' },
];
