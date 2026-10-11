<script setup lang="ts">
import { useTemplateRef } from 'vue';
import GameButton from '../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import { useVehicleModelViewer } from '../vehicles/useVehicleModelViewer';
import { createItemPreviewModel } from './createItemPreviewModel';
import type { CatalogItem } from './itemCatalog';
const props = defineProps<{ item: CatalogItem }>();
const viewport = useTemplateRef<HTMLElement>('viewport'), canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const { status, canvasKey, autoRotate, reset, retry, toggleAutoRotate } = useVehicleModelViewer(() => props.item.id, viewport, canvas, createItemPreviewModel);
</script>
<template>
  <div class="item-viewer" :data-item-viewer-status="status">
    <div ref="viewport" class="item-viewport" :aria-busy="status === 'loading'">
      <canvas ref="canvas" :key="canvasKey" :class="{ hidden: status !== 'ready' }" :aria-label="`${item.name}的 3D 模型`" aria-describedby="item-viewer-help" :tabindex="status === 'ready' ? 0 : -1" />
      <div v-if="status !== 'ready'" class="fallback" role="status">
        <strong>{{ status === 'loading' ? '正在加载模型…' : '3D 预览不可用' }}</strong>
        <p>{{ item.appearance }}</p><p>文字资料仍可正常阅读</p>
      </div>
    </div>
    <div class="toolbar">
      <GameButton v-if="status === 'error'" size="sm" @click="retry">重试 3D 预览</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" @click="reset">复位视角</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" :aria-pressed="autoRotate" @click="toggleAutoRotate">自动旋转</GameButton>
    </div>
    <p id="item-viewer-help">拖动旋转 · 滚轮或双指缩放 · 聚焦后方向键旋转、+/− 缩放、0 复位</p>
    <p>{{ item.modelNote }}</p>
  </div>
</template>
<style scoped>
.item-viewport { position: relative; height: min(48dvh, 400px); min-height: 180px; background: var(--ui-background); border: 1px solid var(--ui-line); }
canvas { width: 100%; height: 100%; display: block; touch-action: none; }
canvas:focus-visible { outline: var(--ui-focus-width) solid var(--ui-focus); outline-offset: -3px; }
.hidden { visibility: hidden; }
.fallback { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: var(--ui-space-5); text-align: center; }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--ui-space-2); margin-top: var(--ui-space-3); }
p { color: var(--ui-text-muted); font-size: var(--ui-text-sm); }
</style>
