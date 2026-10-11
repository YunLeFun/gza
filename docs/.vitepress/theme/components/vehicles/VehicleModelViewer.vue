<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { withBase } from "vitepress";
import GameButton from "../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue";
import GameNotice from "../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameNotice.vue";
import { useVehicleModelViewer } from "./useVehicleModelViewer";

const props = defineProps<{ id: string; name: string; image?: string }>();
const viewport = useTemplateRef<HTMLElement>("viewport");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const { status, errorMessage, autoRotate, canvasKey, reset, retry, toggleAutoRotate } =
  useVehicleModelViewer(() => props.id, viewport, canvas);
const imageUrl = computed(() => withBase(props.image ?? `/vehicle-models/${props.id}.svg`));
const helpId = computed(() => `vehicle-preview-help-${props.id}`);
</script>

<template>
  <div class="vehicle-viewer" :data-vehicle-viewer-status="status" :data-vehicle-preview-id="id">
    <div ref="viewport" class="vehicle-viewport" :aria-busy="status === 'loading'">
      <canvas
        ref="canvas"
        :key="canvasKey"
        class="vehicle-canvas"
        :class="{ 'vehicle-canvas-hidden': status !== 'ready' }"
        :aria-label="`${name}的 3D 模型预览`"
        :aria-describedby="helpId"
        :tabindex="status === 'ready' ? 0 : -1"
      />
      <img
        v-if="status !== 'ready'"
        class="vehicle-fallback"
        :src="imageUrl"
        :alt="`${name}的模型展示图`"
        width="480"
        height="300"
      />
      <span v-if="status === 'loading'" class="vehicle-loading" role="status">正在载入 3D 模型…</span>
    </div>
    <GameNotice v-if="status === 'error'" class="vehicle-error" tone="warning">
      {{ errorMessage }}
      <GameButton size="sm" @click="retry">重试 3D 预览</GameButton>
    </GameNotice>
    <div class="vehicle-toolbar">
      <GameButton size="sm" :disabled="status !== 'ready'" @click="reset">复位视角</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" :aria-pressed="autoRotate" @click="toggleAutoRotate">自动旋转</GameButton>
      <a class="vehicle-static-link" :href="imageUrl" target="_blank" rel="noopener">查看模型图片 ↗</a>
    </div>
    <p :id="helpId" class="vehicle-help">拖动旋转 · 滚轮缩放 · 触屏单指旋转、双指缩放<br />聚焦模型后：方向键旋转，+ / − 缩放，0 复位</p>
  </div>
</template>

<style scoped>
.vehicle-viewer {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  color: var(--ui-text);
}
.vehicle-viewport {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 180px;
  overflow: hidden;
  background: var(--ui-background);
  border: 1px solid var(--ui-line);
}
.vehicle-canvas,
.vehicle-fallback {
  display: block;
  width: 100%;
  height: 100%;
}
.vehicle-canvas {
  touch-action: none;
}
.vehicle-canvas:focus-visible {
  outline: var(--ui-focus-width) solid var(--ui-focus);
  outline-offset: calc(-1 * var(--ui-focus-width));
}
.vehicle-canvas-hidden {
  visibility: hidden;
}
.vehicle-fallback {
  position: absolute;
  inset: 0;
  object-fit: contain;
  pointer-events: none;
}
.vehicle-loading {
  position: absolute;
  bottom: var(--ui-space-3);
  left: var(--ui-space-3);
  padding: var(--ui-space-1) var(--ui-space-2);
  color: var(--ui-text-muted);
  background: var(--ui-panel);
  font-size: var(--ui-text-sm);
}
.vehicle-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ui-space-2);
  margin-top: var(--ui-space-3);
}
.vehicle-static-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--ui-control-small);
  padding: var(--ui-space-1) var(--ui-space-2);
  color: var(--ui-text-muted);
  font-size: var(--ui-text-sm);
}
.vehicle-static-link:hover {
  color: var(--ui-text);
}
.vehicle-static-link:focus-visible {
  outline: var(--ui-focus-width) solid var(--ui-focus);
  outline-offset: var(--ui-space-1);
}
.vehicle-error {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--ui-space-2);
  margin-top: var(--ui-space-3);
}
.vehicle-help {
  margin: var(--ui-space-3) 0 0;
  color: var(--ui-text-subtle);
  font: var(--ui-text-xs)/1.7 var(--ui-font);
}
@media (max-height: 520px) {
  .vehicle-viewport { min-height: 120px; }
}
</style>
