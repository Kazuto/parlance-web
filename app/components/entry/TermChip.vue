<script setup lang="ts">
import { useTerminologySuggestions } from "~/composables/terminology/useTerminologySuggestions";

// Glossary terms in the source text, colored by how this translation uses them.
const props = defineProps<{
  sourceText: string;
  localeId: string;
  translation: string;
}>();
const emit = defineEmits<{ open: [] }>();
const { t } = useI18n();

const { matches, status } = useTerminologySuggestions(
  () => props.sourceText,
  () => props.localeId,
  () => props.translation,
);

const STATUS_CLASSES = {
  untranslated:
    "bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-200",
  unused:
    "bg-yellow-100 text-yellow-700 dark:bg-amber-400/15 dark:text-amber-200",
  used: "bg-green-100 text-green-600 dark:bg-green-400/15 dark:text-green-200",
};
</script>

<template>
  <button
    v-if="matches.length"
    type="button"
    class="flex h-5 cursor-pointer items-center gap-1.5 rounded-[8px] leading-none px-2 text-[10.5px] font-bold whitespace-nowrap squircle focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
    :class="STATUS_CLASSES[status]"
    :title="t(`terminologyHints.status.${status}`)"
    @click="emit('open')"
  >
    <span class="size-[5px] rounded-full bg-current" />
    {{
      t("terminologyHints.termCount", { count: matches.length }, matches.length)
    }}
  </button>
</template>
