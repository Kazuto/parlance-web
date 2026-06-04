<script setup lang="ts">
import { tv } from "tailwind-variants";

defineOptions({
  inheritAttrs: false,
});

const { classAttr, forwardedAttrs } = useForwardedAttrs();

withDefaults(
  defineProps<{
    variant?: "primary" | "secondary";
  }>(),
  {
    variant: "secondary",
  },
);

const variants = tv({
  base: "px-4 py-2 text-sm transition rounded-sm cursor-pointer",
  variants: {
    variant: {
      primary: "bg-teal-500 hover:bg-teal-600 text-white",
      secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    },
  },
});
</script>

<template>
  <button
    :class="variants({ variant, class: classAttr })"
    v-bind="forwardedAttrs"
  >
    <slot />
  </button>
</template>
