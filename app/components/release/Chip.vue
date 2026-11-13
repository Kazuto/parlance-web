<script setup lang="ts">
import { Chip, Icon } from "@thkzt/eunoia";

// A chip for a release, marked with a rocket so it reads apart from scope and tag chips.
defineProps<{
  /** Emphasize the chip, e.g. while the release is an active filter. */
  active?: boolean;
  dense?: boolean;
  removable?: boolean;
}>();
</script>

<template>
  <Chip :variant="active ? 'primary' : 'secondary'" :dense :removable>
    <Icon name="rocket-launch" size="xs" class="shrink-0 opacity-70" />
    <slot />
  </Chip>
</template>
