<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import GameButton from '../../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import { useVehicleModelViewer } from '../vehicles/useVehicleModelViewer';
import { createWeaponPreviewModel, type WeaponModelSource } from './createWeaponPreviewModel';
import type { CatalogItem } from '../items/itemCatalog';
const props = defineProps<{ item: CatalogItem; english: boolean }>();
const viewport = useTemplateRef<HTMLElement>('viewport'), canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const source = shallowRef<WeaponModelSource>('game');
let loadGeneration = 0;
const { status, canvasKey, autoRotate, reset, retry, toggleAutoRotate } = useVehicleModelViewer(() => props.item.id, viewport, canvas, async id => {
  const generation = ++loadGeneration;
  return createWeaponPreviewModel(id, value => { if (generation === loadGeneration) source.value = value; });
});
</script>
<template>
  <div class="weapon-viewer" :data-weapon-viewer-status="status" :data-model-source="source">
    <div ref="viewport" class="viewport" :aria-busy="status === 'loading'">
      <canvas ref="canvas" :key="canvasKey" :class="{ hidden: status !== 'ready' }" :aria-label="`${item.name} 3D`" aria-describedby="weapon-viewer-help" :tabindex="status === 'ready' ? 0 : -1" />
      <div v-if="status !== 'ready'" class="fallback" role="status">
        <strong>{{ status === 'loading' ? (english ? 'Loading model…' : '正在加载模型…') : (english ? '3D preview unavailable' : '3D 预览不可用') }}</strong>
        <p>{{ english ? 'Weapon information remains available below.' : '下方武器资料仍可正常阅读' }}</p>
      </div>
    </div>
    <div class="toolbar">
      <GameButton v-if="status === 'error'" size="sm" @click="retry">{{ english ? 'Retry' : '重试' }}</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" @click="reset">{{ english ? 'Reset view' : '复位视角' }}</GameButton>
      <GameButton size="sm" :disabled="status !== 'ready'" :aria-pressed="autoRotate" @click="toggleAutoRotate">{{ english ? 'Auto rotate' : '自动旋转' }}</GameButton>
    </div>
    <p id="weapon-viewer-help">{{ english ? 'Drag to rotate · Scroll / pinch to zoom · Focus: arrow keys rotate, +/− zoom, 0 reset' : '拖动旋转 · 滚轮／双指缩放 · 聚焦后方向键旋转、+/− 缩放、0 复位' }}</p>
    <p v-if="status === 'ready'" role="status" class="source">{{ source === 'external' ? (english ? 'New low-poly model preview · Not yet integrated into gameplay' : '新低模方案预览 · 尚未接入游戏运行时') : source === 'fallback' ? (english ? 'New model unavailable. Showing the existing game model.' : '新模型未能加载，已回退到现有游戏程序模型') : (english ? 'Existing game model · SMG and shotgun share one model' : '现有游戏程序模型 · 冲锋枪与霰弹枪共用造型') }}</p>
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
