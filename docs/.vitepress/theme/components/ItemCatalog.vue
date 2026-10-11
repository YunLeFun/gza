<script setup lang="ts">
import { computed, shallowRef, nextTick, onUnmounted, type Component } from 'vue';
import GameButton from '../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import { ITEM_CATALOG, ITEM_CATEGORIES, type CatalogItem, type ItemCategory } from './items/itemCatalog';
const category = shallowRef<ItemCategory>('全部'), query = shallowRef('');
const visible = computed(() => ITEM_CATALOG.filter(item => (category.value === '全部' || item.category === category.value)
  && `${item.name} ${item.modes} ${item.use}`.includes(query.value.trim())));
const selected = shallowRef<CatalogItem | null>(null), dialog = shallowRef<Component | null>(null), error = shallowRef('');
let generation = 0, trigger: HTMLElement | null = null;
async function open(item: CatalogItem, event: Event) {
  const request = ++generation;
  trigger = event.currentTarget as HTMLElement;
  error.value = ''; selected.value = item;
  try {
    const component = (await import('./items/ItemPreviewDialog.vue')).default;
    if (request === generation) dialog.value = component;
  } catch { if (request === generation) { selected.value = null; error.value = '3D 模块加载失败，请重试；所有文字资料仍可阅读。'; } }
}
function close() { generation++; selected.value = null; void nextTick(() => trigger?.isConnected && trigger.focus()); }
onUnmounted(() => { generation++; });
</script>
<template>
  <section aria-label="物品图鉴" class="item-catalog">
    <label class="search">搜索物品或模式<input v-model="query" type="search" placeholder="例如：扫把、城市、补给" /></label>
    <div class="filters" role="group" aria-label="物品分类">
      <GameButton v-for="value in ITEM_CATEGORIES" :key="value" size="sm" :aria-pressed="category === value" @click="category = value">{{ value }}</GameButton>
    </div>
    <p role="status">显示 {{ visible.length }} / {{ ITEM_CATALOG.length }} 项 · 仅点击预览后加载 3D</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="selected && !dialog" role="status">正在打开 {{ selected.name }}… <GameButton size="sm" @click="close">取消</GameButton></p>
    <p v-if="!visible.length">没有匹配的物品，试试其他关键词或分类</p>
    <ul class="item-grid">
      <li v-for="item in visible" :key="item.id" :data-item-id="item.id">
        <div class="item-label">{{ item.category }} · {{ item.modes }}</div>
        <h2>{{ item.name }}</h2>
        <p class="appearance">{{ item.appearance }}</p>
        <dl><dt>用途</dt><dd>{{ item.use }}</dd><dt>获取</dt><dd>{{ item.obtain }}</dd></dl>
        <p class="model-note">{{ item.modelNote }}</p>
        <GameButton v-if="item.preview" size="sm" :aria-label="`预览${item.name}的 3D 模型`" @click="open(item, $event)">旋转查看 3D ↗</GameButton>
        <span v-else class="model-note">当前提供文字外观预览</span>
      </li>
    </ul>
    <component :is="dialog" v-if="selected && dialog" :item="selected" @close="close" />
  </section>
</template>
<style scoped>
.item-catalog { font-family: var(--ui-font); color: var(--ui-text); }
.search { display: grid; gap: var(--ui-space-2); font-size: var(--ui-text-sm); }
input { min-height: var(--ui-control-height); border: 1px solid var(--ui-line); background: var(--ui-panel); padding: var(--ui-space-2) var(--ui-space-3); color: var(--ui-text); font: inherit; }
input:focus-visible { outline: var(--ui-focus-width) solid var(--ui-focus); }
.filters { display: flex; flex-wrap: wrap; gap: var(--ui-space-2); margin-top: var(--ui-space-4); }
.item-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ui-space-3); padding: 0; list-style: none; }
.item-grid > li { margin: 0; padding: var(--ui-space-4); background: var(--ui-panel); border: 1px solid var(--ui-line); min-width: 0; overflow-wrap: anywhere; }
h2 { margin: var(--ui-space-2) 0; padding: 0; border: 0; font-size: var(--ui-text-lg); }
.item-label, .model-note { font-size: var(--ui-text-xs); color: var(--ui-text-subtle); }
.appearance { min-height: 3em; color: var(--ui-text-muted); }
dt { font-weight: bold; font-size: var(--ui-text-sm); }
dd { margin: 0 0 var(--ui-space-3); font-size: var(--ui-text-sm); }
@media(max-width: 700px) { .item-grid { grid-template-columns: 1fr; } }
</style>
