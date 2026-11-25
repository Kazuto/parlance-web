<script setup lang="ts">
// The column names above an editor's translation rows, in the columns EditorPanes
// sets; see EditorTranslationRow.
defineProps<{
  /** The text column's name, e.g. "Translation". */
  textLabel: string;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="grid h-full grid-cols-(--translation-columns) text-xs font-semibold text-neutral-500 dark:text-neutral-400"
  >
    <span
      class="flex items-center border-r border-neutral-200 px-4 dark:border-white/5"
      >{{ t("common.language") }}</span
    >
    <span
      class="flex items-center border-r border-neutral-200 px-4 dark:border-white/5"
      >{{ textLabel }}</span
    >
    <span class="flex items-center px-3">{{ t("common.actions") }}</span>
  </div>
</template>
