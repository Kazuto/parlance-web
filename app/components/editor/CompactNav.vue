<script setup lang="ts">
import { Button } from "@thkzt/eunoia";

// Above the open item on narrow screens, where the list doesn't show beside it:
// back to the list, and on to the previous or next item without a keyboard.
defineProps<{
  backLabel: string;
  previousLabel: string;
  nextLabel: string;
  hasPrevious: boolean;
  hasNext: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{ back: []; previous: []; next: [] }>();
</script>

<template>
  <div class="mb-3 flex items-center justify-between gap-2">
    <Button type="button" ghost dense icon="arrow-left" @click="emit('back')">
      {{ backLabel }}
    </Button>
    <div class="flex items-center gap-1">
      <BaseIconButton
        icon="caret-left"
        :label="previousLabel"
        :disabled="disabled || !hasPrevious"
        @click="emit('previous')"
      />
      <BaseIconButton
        icon="caret-right"
        :label="nextLabel"
        :disabled="disabled || !hasNext"
        @click="emit('next')"
      />
    </div>
  </div>
</template>
