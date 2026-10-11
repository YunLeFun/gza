<script setup lang="ts">
import { computed } from "vue";
import { data } from "../../../clientReleases.data";

const availableDownloads = computed(() => data.entries.filter((item) => item.release));

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}
</script>

<template>
  <div v-if="data.provider === 'steam'" class="client-downloads">
    <p v-if="data.steamUrl"><a :href="data.steamUrl">在 Steam 查看 GZA：暴力电驴</a></p>
    <p v-else>Steam 商店地址尚未公布。</p>
  </div>
  <div v-else class="client-downloads">
    <p>预览版本：<strong>{{ data.releaseVersion }}</strong></p>
    <table>
      <thead>
        <tr><th scope="col">系统</th><th scope="col">架构</th><th scope="col">安装包</th></tr>
      </thead>
      <tbody>
        <tr v-for="entry in data.entries" :key="entry.id">
          <th scope="row">{{ entry.platform }}</th>
          <td>{{ entry.architecture }}</td>
          <td v-if="entry.release">
            <a :href="entry.release.url">下载 {{ entry.platform }} 预览版</a>
            <span class="download-size">{{ formatBytes(entry.release.bytes) }}</span>
          </td>
          <td v-else>待发布</td>
        </tr>
      </tbody>
    </table>
    <details v-for="entry in availableDownloads" :key="entry.id" class="download-checksum">
      <summary>{{ entry.platform }} 安装包 SHA-256 校验值</summary>
      <code>{{ entry.release?.sha256 }}</code>
    </details>
  </div>
</template>

<style scoped>
.download-size {
  display: block;
  color: var(--ui-text-muted);
  font-size: var(--ui-text-sm);
}

.download-checksum {
  margin-top: var(--ui-space-4);
  border: 1px solid var(--ui-line);
  padding: var(--ui-space-3) var(--ui-space-4);
}

.download-checksum summary {
  cursor: pointer;
  min-height: var(--ui-control-small);
  display: flex;
  align-items: center;
}

.download-checksum code {
  display: block;
  overflow-wrap: anywhere;
  white-space: normal;
  margin-top: var(--ui-space-2);
}
</style>
