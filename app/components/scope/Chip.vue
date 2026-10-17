<script setup lang="ts">
import { Chip } from "@thkzt/eunoia";

// A chip tinted with the scope's color. Text keeps the normal color so any scope color stays readable.
const props = defineProps<{
  color?: string | null;
  /** Emphasize the chip, e.g. while the scope is an active filter. */
  active?: boolean;
  dense?: boolean;
  removable?: boolean;
}>();

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const tint = computed(() => {
  const color = props.color && HEX_COLOR.test(props.color) ? props.color : "";
  if (!color) return undefined;
  return {
    backgroundColor: `color-mix(in srgb, ${color} ${props.active ? 30 : 14}%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} ${props.active ? 100 : 45}%, transparent)`,
    "--scope-color": color,
  };
});
</script>

<template>
  <Chip
    :variant="active && !tint ? 'primary' : 'secondary'"
    :dense
    :removable
    :style="tint"
  >
    <span
      v-if="tint"
      class="h-2 w-2 shrink-0 rounded-full bg-(--scope-color)"
      aria-hidden="true"
    />
    <slot />
  </Chip>
</template>
