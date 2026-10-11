<script setup lang="ts">
import { computed, nextTick, onUnmounted, shallowRef, type Component, type ShallowRef } from "vue";
import GameButton from "../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue";
import GameNotice from "../../game-reference/apps/dayun-kicker/src/ui/components/base/GameNotice.vue";
import VehicleModelCard from "./vehicles/VehicleModelCard.vue";
import { VEHICLE_CATALOG, VEHICLE_CATEGORIES, type VehicleCatalogEntry, type VehicleCategory } from "./vehicles/vehicleCatalog";

const props = withDefaults(defineProps<{
  vehicles?: readonly VehicleCatalogEntry[];
  label?: string;
  itemLabel?: string;
  showFilters?: boolean;
}>(), {
  vehicles: () => VEHICLE_CATALOG,
  label: "车辆模型图鉴",
  itemLabel: "车型",
  showFilters: true,
});
const selectedCategory = shallowRef<VehicleCategory | "all">("all");
const visibleVehicles = computed(() => !props.showFilters || selectedCategory.value === "all"
  ? props.vehicles : props.vehicles.filter(vehicle => vehicle.category === selectedCategory.value));
const filters = [{ id: "all", label: "全部车型" }, ...VEHICLE_CATEGORIES] as const;
const previewVehicle = shallowRef<VehicleCatalogEntry | null>(null);
const previewComponent: ShallowRef<Component | null> = shallowRef(null);
const loadingPreview = shallowRef(false);
const previewError = shallowRef("");
let previewTrigger: HTMLElement | null = null;
let disposed = false;

async function openPreview(vehicle: VehicleCatalogEntry, trigger: HTMLElement) {
  previewTrigger = trigger;
  previewVehicle.value = vehicle;
  previewError.value = "";
  if (previewComponent.value || loadingPreview.value) return;
  loadingPreview.value = true;
  try {
    const component = (await import("./vehicles/VehiclePreviewDialog.vue")).default;
    if (!disposed) previewComponent.value = component;
  } catch {
    if (!disposed) {
      previewVehicle.value = null;
      previewError.value = `3D 预览暂时无法加载，请再次点击${props.itemLabel}重试，也可以查看静态大图。`;
    }
  } finally {
    if (!disposed) loadingPreview.value = false;
  }
}
function closePreview() {
  previewVehicle.value = null;
  void nextTick(() => { if (previewTrigger?.isConnected) previewTrigger.focus({ preventScroll: true }); });
}
onUnmounted(() => { disposed = true; });
</script>

<template>
  <section class="vehicle-gallery" :aria-label="label">
    <div v-if="showFilters" class="vehicle-filters" role="group" aria-label="按用途筛选车辆">
      <GameButton v-for="filter in filters" :key="filter.id" :aria-pressed="selectedCategory === filter.id" size="sm" @click="selectedCategory = filter.id">
        {{ filter.label }}
      </GameButton>
    </div>
    <p class="vehicle-count" role="status">显示 {{ visibleVehicles.length }} 款{{ itemLabel }} · 点图片旋转查看 3D 模型</p>
    <GameNotice v-if="loadingPreview">正在打开 3D 预览…</GameNotice>
    <GameNotice v-if="previewError" tone="warning">{{ previewError }}</GameNotice>
    <ul class="vehicle-grid">
      <li v-for="vehicle in visibleVehicles" :key="vehicle.id" class="vehicle-item">
        <VehicleModelCard :vehicle="vehicle" @preview="openPreview" />
      </li>
    </ul>
    <component :is="previewComponent" v-if="previewVehicle && previewComponent" :vehicle="previewVehicle" @close="closePreview" />
  </section>
</template>

<style scoped>
.vehicle-gallery {
  margin: var(--ui-space-5) 0 var(--ui-space-6);
}
.vehicle-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-2);
}
.vehicle-count {
  margin: var(--ui-space-3) 0;
  color: var(--ui-text-subtle);
  font-size: var(--ui-text-sm);
}
.vehicle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ui-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.vehicle-item {
  min-width: 0;
  margin: 0;
  padding: 0;
}
@media (max-width: 600px) {
  .vehicle-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
