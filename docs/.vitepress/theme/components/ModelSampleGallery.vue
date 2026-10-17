<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, h, shallowRef } from 'vue';
import GameButton from '../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import { MODEL_CATALOG, modelCatalogBase, modelUrl } from './models/modelCatalog';
const Viewer = defineAsyncComponent({
  loader: () => import('./models/ModelSampleViewer.vue'),
  timeout: 15000,
  errorComponent: defineComponent({ setup: () => () => h('p', { role: 'alert' }, '3D 模块加载失败，模型资料仍可阅读 · Preview unavailable; model details remain available.') }),
});
const english = shallowRef(false), category = shallowRef('all'), selectedId = shallowRef(MODEL_CATALOG[0]!.id);
const categories = [['all', '全部', 'All'], ['characters', '角色', 'Characters'], ['vehicles', '载具', 'Vehicles'], ['weapons', '武器', 'Weapons'], ['props', '道具', 'Props']];
const filtered = computed(() => MODEL_CATALOG.filter(item => category.value === 'all' || item.category === category.value));
const selected = computed(() => filtered.value.find(item => item.id === selectedId.value) || filtered.value[0]!);
</script>
<template>
  <section class="model-gallery" :lang="english ? 'en' : 'zh-CN'">
    <div class="toolbar"><label>{{ english ? 'Category' : '分类' }} <select v-model="category"><option v-for="c in categories" :key="c[0]" :value="c[0]">{{ c[english ? 2 : 1] }}</option></select></label><GameButton size="sm" @click="english = !english">{{ english ? '中文' : 'English' }}</GameButton></div>
    <p role="status">{{ english ? '24 samples · COS publication pending · Not integrated into gameplay' : '24 件样品 · COS 发布待完成 · 均未接入游戏运行时' }}</p>
    <div class="layout"><nav :aria-label="english ? 'Select model' : '选择模型'"><GameButton v-for="item in filtered" :key="item.id" :aria-pressed="item.id === selected.id" @click="selectedId = item.id">{{ english ? item.englishName : item.name }}</GameButton></nav>
      <div class="detail"><h2>{{ selected.name }} · {{ selected.englishName }}</h2>
        <ClientOnly v-if="modelCatalogBase"><Viewer :item="selected" :english="english" /></ClientOnly>
        <p v-else>{{ english ? 'Online 3D preview is pending publication. Local preview setup is documented below.' : '在线 3D 预览待资源发布后启用；本地预览方法见下文。' }}</p>
        <dl><dt>{{ english ? 'Dimensions (X × Y × Z, m)' : '尺寸（X × Y × Z，米）' }}</dt><dd>{{ selected.sizeMeters.map(n => n.toFixed(3)).join(' × ') }}</dd>
          <dt>{{ english ? 'Triangles / Materials / Size' : '三角面 / 材质 / 大小' }}</dt><dd>{{ selected.triangles.toLocaleString() }} / {{ selected.materialCount }} / {{ (selected.bytes / 1024).toFixed(1) }} KiB</dd>
          <dt>{{ english ? 'Embedded clips (static preview)' : '内置动画片段（此页展示静态姿态）' }}</dt><dd>{{ selected.animations.join(', ') || (english ? 'None' : '无') }}</dd>
          <dt>GLB</dt><dd>{{ selected.package }}/{{ selected.file }} <a v-if="modelCatalogBase" :href="modelUrl(selected)">{{ english ? 'Open GLB' : '打开 GLB' }}</a></dd>
          <dt>{{ english ? 'Editable source / Generator' : '可编辑源文件 / 生成脚本' }}</dt><dd>{{ selected.sourceArchivePath }}<br>{{ selected.sourcePath }} · {{ selected.generatorPath }}</dd>
          <dt>SHA-256</dt><dd>{{ selected.sha256 }}</dd><dt>{{ english ? 'Rights' : '许可状态' }}</dt><dd>NOASSERTION · {{ english ? 'No public reuse license declared' : '尚未声明公开再分发许可' }}</dd>
        </dl>
      </div>
    </div>
  </section>
</template>
<style scoped>
.toolbar { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
select { color: var(--ui-text); background: var(--ui-panel); border: 1px solid var(--ui-line); padding: .5rem; }
.layout { display: grid; grid-template-columns: minmax(150px, .7fr) minmax(0, 2fr); gap: 1rem; }
nav { display: flex; flex-direction: column; gap: .4rem; }
nav button { text-align: left; }
nav button[aria-pressed='true'] { background: var(--ui-selected); color: var(--ui-on-selected); }
.detail { min-width: 0; border: 1px solid var(--ui-line); padding: 1rem; }
h2 { margin-top: 0; padding-top: 0; }
dt { font-weight: bold; margin-top: .8rem; } dd { margin: 0; overflow-wrap: anywhere; font-size: .9rem; }
@media(max-width:700px) { .layout { grid-template-columns: 1fr; } nav { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); } }
</style>
