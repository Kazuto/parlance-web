<script setup lang="ts">
import { Card, Skeleton } from "@thkzt/eunoia";

defineProps<{
  title: string;
  description: string;
  loading?: boolean;
  to?: string;
}>();
</script>

<template>
  <NuxtLink v-if="to" :to="to" class="block transition-all hover:scale-[1.02]">
    <Card
      class="h-full cursor-pointer hover:border-primary-500 dark:hover:border-primary-600 transition-colors"
    >
      <div class="flex items-center">
        <div
          class="shrink-0 bg-neutral-200/60 dark:bg-neutral-700/60 rounded-lg p-3"
        >
          <slot name="icon" />
        </div>
        <div v-if="loading" class="ml-4">
          <Skeleton class="h-6 w-32" />
          <Skeleton class="h-4 w-32" />
        </div>
        <div v-else class="ml-4">
          <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {{ title }}
          </p>
          <p
            class="text-2xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ description }}
          </p>
        </div>
      </div>
    </Card>
  </NuxtLink>
  <Card v-else>
    <div class="flex items-center">
      <div
        class="shrink-0 bg-neutral-200/60 dark:bg-neutral-700/60 rounded-lg p-3"
      >
        <slot name="icon" />
      </div>
      <div v-if="loading" class="ml-4">
        <Skeleton class="h-6 w-32" />
        <Skeleton class="h-4 w-32" />
      </div>
      <div v-else class="ml-4">
        <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {{ title }}
        </p>
        <p
          class="text-2xl font-semibold text-neutral-900 dark:text-neutral-100"
        >
          {{ description }}
        </p>
      </div>
    </div>
  </Card>
</template>
