/** Courier delivery cargo reserves a slot; carried supplies live in the inventory. */
export const INVENTORY_CAPACITY = 10;
const LEGACY_INVENTORY_CAPACITY = 8;
export const INVENTORY_ITEMS = {
  water: { name: "饮用水", label: "补给", description: "恢复 40 点踢击体力，体力充足时不会消耗。", maxStack: 5, price: 15 },
  battery: { name: "备用电池", label: "补给", description: "重置电动车加速冷却；加速期间不能更换。", maxStack: 3, price: 40 },
  handbook: { name: "骑手手册", label: "随身物品", description: "大云的上路手册。留在箱中，也可以丢弃腾出空间。", maxStack: 1, price: 0 },
  firstAid: { name: "急救包", label: "委托物资", description: "带回驿站交付的委托物资，不能使用或丢弃。", maxStack: 1, price: 0 },
} as const;
export type InventoryItemId = keyof typeof INVENTORY_ITEMS;
export interface ItemStack { id: InventoryItemId; quantity: number }
export interface InventoryState { slots: (ItemStack | null)[]; spent: number }
export const createInventory = (): InventoryState => ({
  slots: [{ id: "water", quantity: 2 }, { id: "battery", quantity: 1 }, { id: "handbook", quantity: 1 }, ...Array(INVENTORY_CAPACITY - 3).fill(null)], spent: 0,
});
export const copyInventory = (state: InventoryState): InventoryState => ({ slots: state.slots.map(s => s ? { ...s } : null), spent: state.spent });
export const inventoryUsed = (state: InventoryState, carrying = false) => state.slots.filter(Boolean).length + Number(carrying);
export const cargoSlot = (state: InventoryState, carrying: boolean) => carrying ? state.slots.lastIndexOf(null) : -1;
export function inventoryItem(id: unknown): InventoryItemId | null {
  return typeof id === "string" && Object.hasOwn(INVENTORY_ITEMS, id) ? id as InventoryItemId : null;
}
export function parseInventory(value: unknown): InventoryState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as InventoryState;
  if (!Number.isSafeInteger(state.spent) || state.spent < 0 || !Array.isArray(state.slots)
    || (state.slots.length !== INVENTORY_CAPACITY && state.slots.length !== LEGACY_INVENTORY_CAPACITY)) return null;
  const slots: InventoryState["slots"] = [];
  for (const slot of state.slots) {
    if (slot === null) { slots.push(null); continue; }
    if (!slot || typeof slot !== "object") return null;
    const id = inventoryItem(slot.id);
    if (!id || !Number.isSafeInteger(slot.quantity) || slot.quantity < 1 || slot.quantity > INVENTORY_ITEMS[id].maxStack) return null;
    slots.push({ id, quantity: slot.quantity });
  }
  // Older eight-slot saves retain their item positions and gain two empty slots.
  while (slots.length < INVENTORY_CAPACITY) slots.push(null);
  return { slots, spent: state.spent };
}
/** Capacity checks happen before mutation; a failed deposit never loses items. */
export function storeItem(state: InventoryState, id: InventoryItemId, quantity = 1, carrying = false): boolean {
  const key = inventoryItem(id);
  if (!key || !Number.isSafeInteger(quantity) || quantity <= 0) return false;
  const item = INVENTORY_ITEMS[key];
  const reserved = cargoSlot(state, carrying);
  if (carrying && reserved < 0) return false;
  const available = state.slots.reduce((n, s, i) => n + (i === reserved ? 0 : s === null ? item.maxStack : s.id === id ? item.maxStack - s.quantity : 0), 0);
  if (quantity > available) return false;
  for (let i = 0; i < state.slots.length && quantity > 0; i++) {
    const slot = state.slots[i];
    if (slot?.id !== id) continue;
    const added = Math.min(quantity, item.maxStack - slot.quantity); slot.quantity += added; quantity -= added;
  }
  for (let i = 0; i < state.slots.length && quantity > 0; i++) {
    if (i === reserved || state.slots[i] !== null) continue;
    const added = Math.min(quantity, item.maxStack); state.slots[i] = { id, quantity: added }; quantity -= added;
  }
  return true;
}
export function removeItem(state: InventoryState, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= INVENTORY_CAPACITY || !state.slots[index]) return false;
  const slot = state.slots[index]!;
  if (--slot.quantity === 0) state.slots[index] = null;
  return true;
}
/** Keep the one-off clinic reward safe until the station consumes it. */
export function canDiscardItem(state: InventoryState, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < INVENTORY_CAPACITY
    && Boolean(state.slots[index]) && state.slots[index]!.id !== "firstAid";
}
export interface InventoryRider { energy: number; boostCooldown: number; boostRemaining: number; scooter: boolean }
export function canUseItem(id: InventoryItemId, rider: InventoryRider): boolean {
  return id === "water" ? rider.energy < 100 : id === "battery" && rider.scooter && rider.boostCooldown > 0 && rider.boostRemaining <= 0;
}
export function useItem(state: InventoryState, index: number, rider: InventoryRider): InventoryRider | null {
  const slot = state.slots[index];
  if (!slot || !canUseItem(slot.id, rider)) return null;
  const next = { ...rider, ...(slot.id === "water" ? { energy: Math.min(100, rider.energy + 40) } : { boostCooldown: 0 }) };
  return removeItem(state, index) ? next : null;
}
export function buySupply(state: InventoryState, id: InventoryItemId, balance: number, carrying: boolean): boolean {
  const key = inventoryItem(id), price = key ? INVENTORY_ITEMS[key].price : 0;
  if (!price || !Number.isFinite(balance) || balance < price || !Number.isSafeInteger(state.spent + price)) return false;
  if (!storeItem(state, id, 1, carrying)) return false;
  state.spent += price;
  return true;
}
