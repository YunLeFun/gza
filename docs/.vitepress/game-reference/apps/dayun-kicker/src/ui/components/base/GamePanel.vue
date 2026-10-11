<script setup lang="ts">
withDefaults(defineProps<{
  as?: "div" | "section" | "aside";
  tone?: "normal" | "strong" | "hud";
}>(), { as: "section", tone: "normal" });
</script>

<template>
  <component :is="as" class="game-panel" :data-ui-tone="tone"><slot /></component>
</template>

<style scoped src="../../styles/panel.css"></style>
