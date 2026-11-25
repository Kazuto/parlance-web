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
  <!-- Beside the editor it takes the third column of EditorPanes, and lines its title
       and tabs up with the header rows there. Narrower, it lies over the editor's
       right side with rows of its own; out of the column, as that column's width
       would bound it. -->
  <aside
    :class="
      sheet
        ? 'flex min-h-[50dvh] min-h-0 flex-col'
        : 'col-start-3 row-span-3 row-start-1 grid w-80 min-w-0 grid-rows-subgrid border-l border-neutral-200 bg-white max-[1100px]:absolute max-[1100px]:col-auto max-[1100px]:row-auto max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:z-20 max-[1100px]:w-[min(340px,100%)] max-[1100px]:grid-rows-[auto_auto_minmax(0,1fr)] max-[1100px]:shadow-[-8px_0_24px_rgb(0_0_0/0.08)] dark:border-white/5 dark:bg-neutral-900'
    "
    :aria-label="t('context.title')"
  >
    <header
      v-if="!sheet"
      class="flex min-h-13 items-center justify-between gap-2 border-b border-neutral-200 py-2 pr-3 pl-4 dark:border-white/5"
    >
      <div class="flex min-w-0 flex-col gap-0.5">
        <p
          class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
        >
          {{ t("context.title") }}
        </p>
        <h3 class="truncate text-[14px] font-bold dark:text-neutral-50">
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
    </header>
    <Tabs
      v-if="tabs && tabs.length"
      v-model="tab"
      :items="tabs"
      dense
      divided
      :aria-label="t('context.title')"
      :class="
        sheet
          ? 'flex min-h-0 flex-1 flex-col'
          : 'row-span-2 grid min-h-0 grid-rows-subgrid'
      "
      list-class="shrink-0"
      :panel-class="
        sheet
          ? 'min-h-0 flex-1 py-4'
          : 'min-h-0 overflow-y-auto overscroll-contain p-4'
      "
    >
      <slot :tab="tab" />
    </Tabs>
    <div
      v-else
      class="min-h-0 overscroll-contain py-4"
      :class="sheet ? 'flex-1' : 'row-span-2 overflow-y-auto px-4'"
    >
      <slot :tab="tab" />
    </div>
  </aside>
</template>
