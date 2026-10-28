<script setup lang="ts">
import { Drawer } from "@thkzt/eunoia";

// Where an editor's context panel shows: beside the editor, or on phones in a
// bottom sheet, so it doesn't cover the fields it is about.
defineProps<{ compact: boolean; open: boolean; title: string }>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Drawer v-if="compact" :open side="bottom" :title @close="emit('close')">
    <slot v-if="open" />
  </Drawer>
  <slot v-else-if="open" />
</template>
