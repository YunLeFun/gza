<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
import GameButton from "../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue";
import GamePanel from "../../../game-reference/apps/dayun-kicker/src/ui/components/base/GamePanel.vue";
import type { VehicleCatalogEntry } from "./vehicleCatalog";

const props = defineProps<{ vehicle: VehicleCatalogEntry }>();
const imageUrl = computed(() => withBase(props.vehicle.image ?? `/vehicle-models/${props.vehicle.id}.svg`));
const emit = defineEmits<{ preview: [vehicle: VehicleCatalogEntry, trigger: HTMLElement] }>();
function preview(event: MouseEvent) {
  emit("preview", props.vehicle, event.currentTarget as HTMLElement);
}
</script>

<template>
  <GamePanel class="vehicle-card" :aria-labelledby="`vehicle-title-${vehicle.id}`">
    <GameButton class="vehicle-image-link" :data-vehicle-preview="vehicle.id" :aria-label="`旋转查看${vehicle.name}的 3D 模型`" aria-haspopup="dialog" @click="preview">
      <img class="vehicle-image" :src="imageUrl" :alt="`${vehicle.name}的游戏模型，前侧方视角`" width="480" height="300" loading="lazy" decoding="async" />
      <span class="vehicle-image-hint" aria-hidden="true">3D 旋转预览 ↻</span>
    </GameButton>
    <div class="vehicle-caption">
      <div class="vehicle-heading">
        <h3 :id="`vehicle-title-${vehicle.id}`" class="vehicle-name">{{ vehicle.name }}</h3>
        <span v-if="vehicle.paint" class="vehicle-paint">{{ vehicle.paint }}</span>
      </div>
      <p class="vehicle-features">{{ vehicle.features }}</p>
      <ul v-if="vehicle.tags?.length" class="vehicle-tags" aria-label="套装特征">
        <li v-for="tag in vehicle.tags" :key="tag" class="vehicle-tag">{{ tag }}</li>
      </ul>
      <p class="vehicle-usage">{{ vehicle.usage }}</p>
      <a class="vehicle-static-link" :href="imageUrl" target="_blank" rel="noopener" :aria-label="`查看${vehicle.name}静态大图（新标签页）`">静态大图 ↗</a>
    </div>
  </GamePanel>
</template>

<style scoped>
.vehicle-card {
  --ui-panel-padding: 0;
  overflow: hidden;
  height: 100%;
  padding: 0;
}
.vehicle-image-link {
  position: relative;
  display: block;
  width: 100%;
  min-height: 0;
  padding: 0;
  border: 0;
  background: var(--ui-surface-raised);
  color: var(--ui-text-muted);
}
.vehicle-image-link:focus-visible {
  outline-offset: calc(-1 * var(--ui-focus-width));
}
.vehicle-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 8 / 5;
  object-fit: contain;
}
.vehicle-image-hint {
  position: absolute;
  right: var(--ui-space-3);
  bottom: var(--ui-space-2);
  padding: var(--ui-space-1) var(--ui-space-2);
  background: var(--ui-panel);
  font-size: var(--ui-text-xs);
}
.vehicle-caption {
  padding: var(--ui-space-4);
}
.vehicle-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--ui-space-2);
}
.vehicle-name {
  margin: 0;
  font-size: var(--ui-text-lg);
  line-height: 1.4;
}
.vehicle-paint {
  flex-shrink: 0;
  color: var(--ui-text-subtle);
  font-size: var(--ui-text-xs);
}
.vehicle-features {
  margin: var(--ui-space-2) 0 var(--ui-space-3);
  color: var(--ui-text-muted);
  font-size: var(--ui-text-sm);
}
.vehicle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-2);
  margin: 0 0 var(--ui-space-3);
  padding: 0;
  list-style: none;
}
.vehicle-tag {
  margin: 0;
  padding: var(--ui-space-1) var(--ui-space-2);
  border: 1px solid var(--ui-line);
  color: var(--ui-text-muted);
  font-size: var(--ui-text-xs);
}
.vehicle-usage {
  margin: 0;
  padding-top: var(--ui-space-2);
  border-top: 1px solid var(--ui-line);
  color: var(--ui-text-subtle);
  font-size: var(--ui-text-xs);
}
.vehicle-static-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--ui-control-small);
  color: var(--ui-text-muted);
  font-size: var(--ui-text-xs);
}
</style>
