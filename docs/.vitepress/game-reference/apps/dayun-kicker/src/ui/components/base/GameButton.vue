<script setup lang="ts">
import "../../styles/button.css";
withDefaults(defineProps<{
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}>(), { variant: "secondary", size: "md", type: "button" });
// One native root forwards IDs, ARIA, data attributes, keyboard and click listeners.
</script>

<template>
  <button class="game-button" :data-ui-variant="variant" :data-ui-size="size" :type="type" :disabled="disabled"><slot /></button>
</template>
