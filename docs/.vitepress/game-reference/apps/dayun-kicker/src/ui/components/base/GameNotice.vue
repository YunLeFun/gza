<script setup lang="ts">
withDefaults(defineProps<{
  as?: "div" | "section" | "aside";
  tone?: "info" | "success" | "warning" | "danger";
  role?: "status" | "alert" | "none";
}>(), { as: "div", tone: "info", role: "status" });
</script>

<template>
  <component :is="as" class="game-notice" :data-ui-tone="tone" :role="role === 'none' ? undefined : role"><slot /></component>
</template>

<style scoped>
.game-notice { --notice-color: var(--ui-info); padding: var(--ui-space-2) var(--ui-space-3); border-left: 3px solid var(--notice-color); border-radius: var(--ui-radius); color: var(--ui-text); background: var(--ui-panel-hud); font: var(--ui-text-sm)/1.5 var(--ui-font); }
.game-notice[data-ui-tone="success"] { --notice-color: var(--ui-success); }
.game-notice[data-ui-tone="warning"] { --notice-color: var(--ui-warning); }
.game-notice[data-ui-tone="danger"] { --notice-color: var(--ui-danger); }
</style>
