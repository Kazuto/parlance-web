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
defineSlots<{
  /** Shown when the pointer rests on the label; replaces the plain title. */
  tooltip?: () => unknown;
}>();
const { t } = useI18n();
</script>

<template>
  <span class="flex w-full min-w-0 items-center gap-2">
    <!-- A short delay, so moving through the list does not open each row's tooltip.
         The list is virtualized and moves its rows, which would clip the tooltip
         and place it under later rows, so it renders at the end of the page.
         The tooltip anchors to the label's text, not the whole row, so it sits
         right above the key however short it is. -->
    <template v-if="$slots.tooltip">
      <Tooltip
        :delay="300"
        placement="top-start"
        teleport-to="body"
        class="min-w-0"
      >
        <span class="min-w-0 truncate">{{ label }}</span>
        <template #content><slot name="tooltip" /></template>
      </Tooltip>
      <span class="flex-1" aria-hidden="true" />
    </template>
    <span v-else class="min-w-0 flex-1 truncate" :title="label">{{
      label
    }}</span>
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
