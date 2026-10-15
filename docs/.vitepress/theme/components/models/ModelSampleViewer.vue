<script setup lang="ts">
import { useTemplateRef } from 'vue';
import GameButton from '../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import { useVehicleModelViewer } from '../vehicles/useVehicleModelViewer';
import { loadModelSample } from './loadModelSample';
import type { ModelSample } from './modelCatalog';
const props = defineProps<{ item: ModelSample; english: boolean }>();
const viewport = useTemplateRef<HTMLElement>('viewport'), canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const { status, canvasKey, autoRotate, reset, retry, toggleAutoRotate } = useVehicleModelViewer(() => props.item.id, viewport, canvas, loadModelSample);
</script>
<template>
  <div class="sample-viewer" :data-sample-viewer-status="status">
    <div ref="viewport" class="viewport" :aria-busy="status === 'loading'">
      <canvas ref="canvas" :key="canvasKey" :class="{ hidden: status !== 'ready' }" :aria-label="`${item.name} 3D`" aria-describedby="sample-viewer-help" :tabindex="status === 'ready' ? 0 : -1" />
      <div v-if="status !== 'ready'" class="fallback" role="status">
        <strong>{{ status === 'loading' ? (english ? 'Loading model…' : '正在加载模型…') : (english ? '3D preview unavailable' : '3D 预览不可用') }}</strong>
        <p>{{ english ? 'Model information remains available below.' : '下方模型资料仍可正常阅读' }}</p>
      </div>
    </div>
    <div class="toolbar">
      <GameButton v-if="status === 'error'" size="sm" @click="retry">{{ english ? 'Retry' : '重试' }}</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" @click="reset">{{ english ? 'Reset view' : '复位视角' }}</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" :aria-pressed="autoRotate" @click="toggleAutoRotate">{{ english ? 'Auto rotate' : '自动旋转' }}</GameButton>
    </div>
    <p id="sample-viewer-help">{{ english ? 'Drag to rotate · Scroll / pinch to zoom · Focus: arrow keys rotate, +/− zoom, 0 reset' : '拖动旋转 · 滚轮／双指缩放 · 聚焦后方向键旋转、+/− 缩放、0 复位' }}</p>

  </div>
</template>
<style scoped>
.viewport { position: relative; height: min(48dvh, 420px); min-height: 220px; background: var(--ui-background); border: 1px solid var(--ui-line); }
canvas { width: 100%; height: 100%; display: block; touch-action: none; }
canvas:focus-visible { outline: var(--ui-focus-width) solid var(--ui-focus); outline-offset: -3px; }
.hidden { visibility: hidden; }
.fallback { position: absolute; inset: 0; display: grid; align-content: center; padding: var(--ui-space-5); text-align: center; }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--ui-space-2); margin-top: var(--ui-space-3); }
p { color: var(--ui-text-muted); font-size: var(--ui-text-sm); }
.source { border-left: 2px solid var(--ui-info); padding-left: var(--ui-space-3); }
</style>
