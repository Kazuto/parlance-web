<script setup lang="ts">
import { Button, Tabs } from "@thkzt/eunoia";

defineProps<{
  localeName: string;
  tabs?: { value: string; label: string }[];
}>();
const emit = defineEmits<{ close: [] }>();
defineSlots<{
  default(props: { tab: string | undefined }): unknown;
}>();
const { t } = useI18n();

const tab = defineModel<string | undefined>("tab");
</script>

<template>
  <aside
    class="flex h-full min-h-0 flex-col border-l border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
    :aria-label="t('context.title')"
  >
    <header class="shrink-0 px-4 pt-4">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t("context.title") }}
          </p>
          <h3 class="truncate font-semibold dark:text-neutral-100">
            {{ localeName }}
          </h3>
        </div>
        <Button
          type="button"
          ghost
          icon="x"
          :aria-label="t('context.close')"
          @click="emit('close')"
        />
      </div>
    </header>
    <Tabs
      v-if="tabs && tabs.length"
      v-model="tab"
      :items="tabs"
      :aria-label="t('context.title')"
      class="flex min-h-0 flex-1 flex-col"
      list-class="shrink-0 border-b border-neutral-200 px-4 pt-3 pb-4 dark:border-neutral-700"
      panel-class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
    >
      <slot :tab="tab" />
    </Tabs>
    <div v-else class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <slot :tab="tab" />
    </div>
  </aside>
</template>
