<script setup lang="ts">
import { Chip, Icon } from "@thkzt/eunoia";

// A chip for a tag, marked with a tag icon so it reads apart from the scope chips beside it.
defineProps<{
  /** Emphasize the chip, e.g. while the tag is an active filter. */
  active?: boolean;
  dense?: boolean;
  removable?: boolean;
}>();
</script>

<template>
  <Chip :variant="active ? 'primary' : 'secondary'" :dense :removable>
    <Icon name="tag" size="xs" class="shrink-0 opacity-70" />
    <slot />
  </Chip>
</template>
