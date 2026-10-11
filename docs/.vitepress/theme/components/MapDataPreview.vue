<script setup lang="ts">
import { shallowRef } from 'vue';
import GameButton from '../../game-reference/apps/dayun-kicker/src/ui/components/base/GameButton.vue';
import type { PreviewData } from '../../mapPreviewData';
defineProps<{ data: PreviewData }>();
const roads = shallowRef(true), buildings = shallowRef(true), water = shallowRef(true);
</script>
<template>
  <section class="map-preview" aria-label="广州同源地图二维缩略">
    <p class="notice">2D 数据缩略图（4 m 显示简化） · 不是游戏实景截图 · 当前文档地图版本 {{ data.version }}</p>
    <div class="map-tools" role="group" aria-label="地图图层">
      <GameButton size="sm" :aria-pressed="roads" @click="roads = !roads">道路</GameButton>
      <GameButton size="sm" :aria-pressed="buildings" @click="buildings = !buildings">建筑轮廓</GameButton>
      <GameButton size="sm" :aria-pressed="water" @click="water = !water">水域</GameButton>
    </div>
    <svg :viewBox="data.viewBox" role="img" aria-labelledby="map-preview-title map-preview-description" class="map-svg">
      <title id="map-preview-title">广州塔中心 {{ data.radius / 1000 }} 公里游戏数据地图</title>
      <desc id="map-preview-description">从记录来源版本的游戏地图合成函数导出。白色为道路，灰色为建筑，蓝色为水域；橙色为当前游戏实际通行边界。范围覆盖不保证全部道路连通或建筑逐栋完整。</desc>
      <g v-show="water" class="water" data-map-layer="water"><path v-for="(path,index) in data.paths.water" :key="index" :d="path" fill-rule="evenodd" /></g>
      <path v-show="buildings" :d="data.paths.buildings" class="buildings" data-map-layer="buildings" />
      <path v-show="roads" :d="data.paths.roads" class="roads" data-map-layer="roads" />
      <path :d="data.paths.legacy" class="legacy" />
      <circle :cx="data.center.x" :cy="data.center.z" :r="data.radius" class="target" />
      <path :d="data.paths.boundary" class="boundary" />
      <circle :cx="data.center.x" :cy="data.center.z" r="70" class="tower" />
      <text :x="data.center.x + 120" :y="data.center.z - 100" class="map-label">广州塔</text>
      <text :x="data.center.x - data.radius + 180" :y="data.center.z - data.radius + 350" class="map-label">北 ↑</text>
      <path :d="`M${data.center.x - data.radius + 300} ${data.center.z + data.radius - 300}h1000`" class="scale" />
      <text :x="data.center.x - data.radius + 300" :y="data.center.z + data.radius - 450" class="map-label">1 km</text>
    </svg>
    <ul class="legend">
      <li>白色：游戏道路数据，包含尚未与起点连通的路段</li>
      <li>灰色 / 蓝色：建筑轮廓 / 水域（保留水域内洞）</li>
      <li>橙色实线：当前构建的实际通行边界，直接复用游戏边界算法</li>
      <li>灰色虚线：塔心 {{ data.radius / 1000 }} km 目标范围；与实际边界重合时会被实线覆盖</li>
      <li>绿色点线：扩建前的数据范围，仅供对照</li>
    </ul>
    <p>合成数据：{{ data.counts.roads.toLocaleString() }} 条道路记录 · {{ data.counts.buildings.toLocaleString() }} 个建筑轮廓 · {{ data.counts.waters }} 个水域</p>
    <h2>连通性提示</h2>
    <p>TIT 起点可骑行图的同一连通分量包含 {{ data.counts.connectedNodes.toLocaleString() }} 个节点。下面是塔心 4.3 km 四向目标，到该分量最近节点的距离；这不是不可通行区域的精确边界。</p>
    <ul class="diagnostics"><li v-for="row in data.diagnostics" :key="row.direction" :class="{ limited: row.limited }">{{ row.direction }}侧：{{ row.gapMetres }} m{{ row.limited ? ' · 存在明显连接缺口' : '' }}</li></ul>
    <p>新高架、隧道、部分跨江道路与缺测建筑未据此补全。地图中的线条相交不一定意味着节点相连；完整的 5 km 圆不代表全区域已精细建成。</p>
    <details>
      <summary>版本、来源与一致性校验</summary>
      <dl><dt>地图版本</dt><dd>{{ data.version }}</dd><dt>数据快照</dt><dd>{{ data.snapshot }}</dd><dt>原始来源 SHA-256</dt><dd>{{ data.sourceSha256 }}</dd><dt>实际输入集合 SHA-256</dt><dd>{{ data.inputsSha256 }}</dd><dt>合成地图与边界 SHA-256</dt><dd>{{ data.geometrySha256 }}</dd></dl>
      <p>文档每次构建校验固定导出快照；资源版本、字节数或 SHA-256 不匹配会中止构建。更新游戏地图或边界代码后，需要重新导出、校验并发布文档快照；已发布的旧页面不会自动变成新版本。</p>
      <ul><li v-for="entry in data.inputs" :key="entry.path">{{ entry.path.split('/').slice(-2).join('/') }} · {{ entry.bytes.toLocaleString() }} bytes · {{ entry.sha256 }}</li></ul>
    </details>
    <p class="attribution">{{ data.attribution }} · {{ data.license }} · <a href="https://www.openstreetmap.org/copyright">地图数据许可与署名</a></p>
  </section>
</template>
<style scoped>
.map-tools { display: flex; flex-wrap: wrap; gap: var(--ui-space-2); margin: var(--ui-space-3) 0; }
.notice { color: var(--ui-warning); font-size: var(--ui-text-sm); }
.map-svg { display: block; width: 100%; aspect-ratio: 1; background: var(--ui-panel-strong); border: 1px solid var(--ui-line); }
.water { fill: var(--ui-info); opacity: .45; }
.buildings { fill: var(--ui-text-subtle); opacity: .5; }
.roads { fill: none; stroke: var(--ui-text); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: .7; }
.target { fill: none; stroke: var(--ui-text-muted); stroke-dasharray: 8 6; stroke-width: 2; vector-effect: non-scaling-stroke; }
.boundary { fill: none; stroke: var(--ui-warning); stroke-width: 2; vector-effect: non-scaling-stroke; }
.legacy { fill: none; stroke: var(--ui-success); stroke-dasharray: 2 5; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.tower { fill: var(--ui-warning); }
.map-label { font: 260px var(--ui-font); fill: var(--ui-text); paint-order: stroke; stroke: var(--ui-panel-strong); stroke-width: 36; }
.scale { stroke: var(--ui-text); stroke-width: 3; vector-effect: non-scaling-stroke; }
.legend, .diagnostics, .attribution { font-size: var(--ui-text-sm); }
.limited { color: var(--ui-warning); }
details { border: 1px solid var(--ui-line); padding: var(--ui-space-3); }
summary { cursor: pointer; min-height: var(--ui-control-small); }
dd, details li { margin-left: 0; overflow-wrap: anywhere; font: var(--ui-text-xs)/1.7 var(--ui-font-number); }
@media (max-width: 700px) { .map-label { font-size: 350px; } }
</style>
