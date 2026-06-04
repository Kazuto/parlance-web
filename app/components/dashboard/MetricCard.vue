<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <CoreCard>
    <div class="flex items-center">
      <div class="shrink-0 bg-gray-200/60 rounded-lg p-3">
        <slot name="icon" />
      </div>
      <div class="ml-4">
        <p class="text-sm font-medium text-gray-600">{{ title }}</p>
        <p class="text-2xl font-semibold text-gray-900">
          {{ description }}
        </p>
      </div>
    </div>
  </CoreCard>
</template>
