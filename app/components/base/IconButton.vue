<script setup lang="ts">
import { Button, Tooltip } from "@thkzt/eunoia";

// Clicks and other listeners pass through to the button.
defineOptions({ inheritAttrs: false });

defineProps<{
  icon: string;
  /** Shown as tooltip and used as the accessible name. */
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  dense?: boolean;
}>();
</script>

<template>
  <Tooltip :content="label">
    <Button
      v-bind="$attrs"
      type="button"
      ghost
      :destructive
      :dense
      :icon
      :disabled
      :aria-label="label"
    />
  </Tooltip>
</template>
