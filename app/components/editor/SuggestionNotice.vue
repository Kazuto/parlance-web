<script setup lang="ts">
import { Tooltip } from "@thkzt/eunoia";
import type { TranslationSuggestion } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

// What to check in a machine translation. It shows while the field still holds
// the suggestion, or for a failed one, while the field is still empty.
const props = defineProps<{
  suggestion?: TranslationSuggestion;
  value: string;
}>();
const { t } = useI18n();

const problems = computed(() => {
  const suggestion = props.suggestion;
  if (!suggestion) return [];
  if (suggestion.errorCode) {
    return props.value.trim()
      ? []
      : [t(`entries.suggestionError.${suggestion.errorCode}`)];
  }
  if (!suggestion.translation || props.value !== suggestion.translation)
    return [];
  return (suggestion.warnings ?? []).map((warning) =>
    t(`entries.suggestionWarning.${warning.code}`, {
      placeholder: warning.detail ?? "",
    }),
  );
});

const failed = computed(() => !!props.suggestion?.errorCode);
</script>

<template>
  <Tooltip v-if="problems.length" :content="problems.join(' · ')">
    <span
      role="status"
      class="flex h-5 items-center gap-1.5 rounded-[8px] leading-none px-2 text-[10.5px] font-bold whitespace-nowrap squircle"
      :class="
        failed
          ? 'bg-red-100 text-red-700 dark:bg-rose-400/15 dark:text-rose-200'
          : 'bg-yellow-100 text-yellow-700 dark:bg-amber-400/15 dark:text-amber-200'
      "
    >
      <span class="size-[5px] rounded-full bg-current" />
      {{
        failed ? t("entries.suggestionFailed") : t("entries.suggestionCheck")
      }}
      <span class="sr-only">: {{ problems.join(", ") }}</span>
    </span>
  </Tooltip>
</template>
