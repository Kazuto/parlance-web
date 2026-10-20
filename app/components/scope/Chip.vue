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
  // Strengths come from --tint/--edge, set per color mode by tintClass.
  return {
    backgroundColor: `color-mix(in srgb, ${color} var(--tint), transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} var(--edge), transparent)`,
    "--scope-color": color,
  };
});

// Light mode needs a softer tint than dark to look equally calm.
const tintClass = computed(() => {
  if (!tint.value) return undefined;
  return [
    props.active
      ? "[--edge:80%] [--tint:22%] dark:[--edge:100%] dark:[--tint:30%]"
      : "[--edge:30%] [--tint:10%] dark:[--edge:45%] dark:[--tint:14%]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 focus-visible:outline-solid",
  ];
});
</script>

<template>
  <!-- The tint's inline box-shadow hides the Chip's focus ring (also a box-shadow),
       so tinted chips show keyboard focus with an outline instead. -->
  <Chip
    :variant="active && !tint ? 'primary' : 'secondary'"
    :dense
    :removable
    :style="tint"
    :class="tintClass"
  >
    <span
      v-if="tint"
      class="h-2 w-2 shrink-0 rounded-full bg-(--scope-color)"
      aria-hidden="true"
    />
    <slot />
  </Chip>
</template>
