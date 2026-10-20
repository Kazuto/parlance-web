<script setup lang="ts">
import { Tooltip } from "@thkzt/eunoia";

// A row in the editor's list: the item's label, plus how many of the selected
// languages are still missing.
defineProps<{
  label: string;
  missingCount: number;
  unsaved?: boolean;
  missingLabel: string;
}>();
const { t } = useI18n();
</script>

<template>
  <span class="flex w-full min-w-0 items-center gap-2">
    <span class="min-w-0 flex-1 truncate" :title="label">{{ label }}</span>
    <span
      v-if="unsaved"
      class="shrink-0 text-xs font-medium text-yellow-700 dark:text-amber-300"
      :title="t('entries.unsavedTranslations')"
      >{{ t("common.unsaved") }}</span
    >
    <Tooltip v-else-if="missingCount > 0" :content="missingLabel">
      <span
        class="grid h-4 min-w-4 shrink-0 place-items-center rounded-[6px] bg-red-50 px-1 text-[10px] font-bold text-red-500 squircle dark:bg-rose-500/15 dark:text-rose-300"
        :aria-label="missingLabel"
        >{{ missingCount }}</span
      >
    </Tooltip>
  </span>
</template>
