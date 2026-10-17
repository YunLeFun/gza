<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, h, shallowRef } from 'vue';
import GameButton from '../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import { WEAPON_CATALOG, weaponEnglishNames } from './weapons/weaponCatalog';
const WeaponModelViewer = defineAsyncComponent({
  loader: () => import('./weapons/WeaponModelViewer.vue'),
  timeout: 15000,
  errorComponent: defineComponent({ setup: () => () => h('p', { role: 'alert' }, '3D 模块加载失败，请刷新重试 · Preview failed to load. Reload to retry.') }),
});
const english = shallowRef(false), selectedId = shallowRef(WEAPON_CATALOG[0]!.id);
const selected = computed(() => WEAPON_CATALOG.find(item => item.id === selectedId.value)!);
const displayName = (id: string, name: string) => english.value ? weaponEnglishNames[id.split(':')[1]!] || name : name;
</script>
<template>
  <section class="weapon-gallery" :lang="english ? 'en' : 'zh-CN'" aria-label="Weapon model gallery">
    <div class="heading"><p>{{ english ? `${WEAPON_CATALOG.length} weapons · Household tools first` : `${WEAPON_CATALOG.length} 种武器 · 生活工具优先` }}</p><GameButton size="sm" :aria-pressed="english" @click="english = !english">{{ english ? '中文' : 'English' }}</GameButton></div>
    <div class="layout">
      <nav :aria-label="english ? 'Select weapon' : '选择武器'" class="weapon-list">
        <GameButton v-for="item in WEAPON_CATALOG" :key="item.id" :aria-pressed="selectedId === item.id" :data-weapon-id="item.id" @click="selectedId = item.id">
          <span>{{ displayName(item.id, item.name) }}</span><small>{{ item.id.split(':')[1] }}</small>
        </GameButton>
      </nav>
      <div class="preview">
        <h2>{{ displayName(selected.id, selected.name) }}</h2>
        <ClientOnly><Suspense><WeaponModelViewer :item="selected" :english="english" /><template #fallback><p role="status">{{ english ? 'Loading 3D viewer…' : '正在加载 3D 预览器…' }}</p></template></Suspense></ClientOnly>
        <details open><summary>{{ english ? 'Game reference (Chinese source)' : '游戏资料与获取方式' }}</summary><p>{{ selected.modes }}</p><p>{{ selected.use }}</p><p>{{ selected.obtain }}</p><small>{{ selected.source }}</small></details>
      </div>
    </div>
  </section>
</template>
<style scoped>
.weapon-gallery { font-family: var(--ui-font); color: var(--ui-text); }
.heading { display: flex; align-items: center; justify-content: space-between; gap: var(--ui-space-3); }
.layout { display: grid; grid-template-columns: minmax(150px, 0.7fr) minmax(0, 2fr); gap: var(--ui-space-4); margin-top: var(--ui-space-3); }
.weapon-list { display: flex; flex-direction: column; gap: var(--ui-space-2); }
.weapon-list button { display: flex; flex-direction: column; align-items: start; text-align: left; padding: var(--ui-space-3); }
.weapon-list button[aria-pressed='true'] { background: var(--ui-selected); color: var(--ui-on-selected); }
small { font-size: var(--ui-text-xs); overflow-wrap: anywhere; }
.preview { min-width: 0; padding: var(--ui-space-4); border: 1px solid var(--ui-line); background: var(--ui-panel); }
h2 { margin: 0 0 var(--ui-space-3); padding: 0; border: 0; }
details { font-size: var(--ui-text-sm); overflow-wrap: anywhere; }
summary { cursor: pointer; min-height: var(--ui-control-height); }
@media(max-width: 700px) { .layout { grid-template-columns: 1fr; } .weapon-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); } .weapon-list button { padding: var(--ui-space-2); } }
</style>
