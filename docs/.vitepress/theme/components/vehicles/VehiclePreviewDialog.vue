<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";
import GameButton from "../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue";
import GamePanel from "../../../game-reference/apps/dayun-kicker/src/ui/components/base/GamePanel.vue";
import VehicleModelViewer from "./VehicleModelViewer.vue";
import type { VehicleCatalogEntry } from "./vehicleCatalog";

defineProps<{ vehicle: VehicleCatalogEntry }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <DialogRoot :open="true" @update:open="open => { if (!open) $emit('close'); }">
    <DialogPortal>
      <DialogOverlay class="vehicle-preview-overlay" />
      <DialogContent class="vehicle-preview-dialog" @close-auto-focus.prevent>
        <GamePanel tone="strong" class="vehicle-preview-panel">
          <header class="vehicle-preview-header">
            <div>
              <DialogTitle class="vehicle-preview-title">{{ vehicle.name }} · 3D 预览</DialogTitle>
              <DialogDescription class="vehicle-preview-description">{{ vehicle.features }}</DialogDescription>
            </div>
            <DialogClose as-child><GameButton size="sm" aria-label="关闭 3D 预览">关闭 ×</GameButton></DialogClose>
          </header>
          <VehicleModelViewer :key="vehicle.id" :id="vehicle.id" :name="vehicle.name" :image="vehicle.image" />
        </GamePanel>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.vehicle-preview-overlay {
  position: fixed;
  inset: 0;
  background: var(--ui-scrim);
  z-index: var(--ui-layer-dialog);
}
.vehicle-preview-dialog {
  position: fixed;
  inset: var(--ui-space-5);
  width: min(960px, calc(100% - 2 * var(--ui-space-5)));
  max-height: calc(100dvh - 2 * var(--ui-space-5));
  margin: auto;
  z-index: var(--ui-layer-dialog);
  color: var(--ui-text);
  font-family: var(--ui-font);
}
.vehicle-preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-3);
  --ui-panel-padding: var(--ui-space-4);
  box-sizing: border-box;
  overflow: auto;
}
.vehicle-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-space-3);
  padding-bottom: var(--ui-space-3);
  border-bottom: 1px solid var(--ui-line);
}
.vehicle-preview-header > div { min-width: 0; }
.vehicle-preview-header button { flex-shrink: 0; }
.vehicle-preview-title {
  margin: 0;
  font-size: var(--ui-text-lg);
  line-height: 1.4;
}
.vehicle-preview-description {
  margin: var(--ui-space-1) 0 0;
  font-size: var(--ui-text-sm);
  color: var(--ui-text-muted);
}
@media (max-width: 700px), (max-height: 520px) {
  .vehicle-preview-dialog {
    inset: max(var(--ui-space-2), env(safe-area-inset-top)) var(--ui-space-2) max(var(--ui-space-2), env(safe-area-inset-bottom));
    width: auto;
    max-height: none;
  }
  .vehicle-preview-panel { --ui-panel-padding: var(--ui-space-3); }
  .vehicle-preview-title { font-size: var(--ui-text-md); }
}
</style>
