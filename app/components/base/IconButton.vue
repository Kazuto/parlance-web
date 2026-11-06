<script setup lang="ts">
import { Button, Tooltip } from "@thkzt/eunoia";
import type { RouteLocationRaw } from "vue-router";
import { NuxtLink } from "#components";

// Clicks and other listeners pass through to the button.
defineOptions({ inheritAttrs: false });

defineProps<{
  icon: string;
  /** Shown as tooltip and used as the accessible name. */
  label: string;
  /** Makes it a link, so it can also be opened in a new tab. */
  to?: RouteLocationRaw;
  destructive?: boolean;
  disabled?: boolean;
  dense?: boolean;
}>();
</script>

<template>
  <Tooltip :content="label">
    <Button
      v-bind="$attrs"
      :as="to ? NuxtLink : undefined"
      :to
      :type="to ? undefined : 'button'"
      ghost
      :destructive
      :dense
      :icon
      :disabled
      :aria-label="label"
    />
  </Tooltip>
</template>
