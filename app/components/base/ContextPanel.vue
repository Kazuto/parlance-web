<script setup lang="ts">
import { Tabs } from "@thkzt/eunoia";

defineProps<{
  localeName: string;
  tabs?: { value: string; label: string }[];
  /** Inside a bottom sheet, which brings its own title and close button. */
  sheet?: boolean;
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
    class="flex min-h-0 flex-col"
    :class="
      sheet
        ? 'min-h-[50dvh]'
        : 'h-full border-l border-neutral-200 bg-white dark:border-white/5 dark:bg-neutral-900'
    "
    :aria-label="t('context.title')"
  >
    <header v-if="!sheet" class="shrink-0 px-[18px] pt-[18px]">
      <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 flex-col gap-0.5">
          <p
            class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
          >
            {{ t("context.title") }}
          </p>
          <h3 class="truncate text-[15px] font-bold dark:text-neutral-50">
            {{ localeName }}
          </h3>
        </div>
        <BaseIconButton
          dense
          icon="x"
          :label="t('context.close')"
          class="bg-neutral-100 dark:bg-white/5"
          @click="emit('close')"
        />
      </div>
    </header>
    <Tabs
      v-if="tabs && tabs.length"
      v-model="tab"
      :items="tabs"
      dense
      :aria-label="t('context.title')"
      class="flex min-h-0 flex-1 flex-col"
      :list-class="sheet ? 'shrink-0' : 'mx-[18px] mt-4 shrink-0'"
      :panel-class="
        sheet
          ? 'min-h-0 flex-1 py-4'
          : 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] py-4'
      "
    >
      <slot :tab="tab" />
    </Tabs>
    <div
      v-else
      class="min-h-0 flex-1 overscroll-contain py-4"
      :class="sheet ? '' : 'overflow-y-auto px-[18px]'"
    >
      <slot :tab="tab" />
    </div>
  </aside>
</template>
