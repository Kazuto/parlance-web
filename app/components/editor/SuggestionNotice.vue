<script setup lang="ts">
import { Tooltip } from "@thkzt/eunoia";
import type { TranslationSuggestion } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

// Why a machine translation failed, while the field is still empty. What to check
// in a translation that came through is the QA notice's job, suggested or not.
const props = defineProps<{
  suggestion?: TranslationSuggestion;
  value: string;
}>();
const { t } = useI18n();

const problem = computed(() => {
  const code = props.suggestion?.errorCode;

  return code && !props.value.trim()
    ? t(`entries.suggestionError.${code}`)
    : undefined;
});
</script>

<template>
  <Tooltip v-if="problem" :content="problem">
    <span
      role="status"
      class="flex h-5 items-center gap-1.5 rounded-[8px] leading-none px-2 text-[10.5px] font-bold whitespace-nowrap squircle bg-red-100 text-red-700 dark:bg-rose-400/15 dark:text-rose-200"
    >
      <span class="size-[5px] rounded-full bg-current" />
      {{ t("entries.suggestionFailed") }}
      <span class="sr-only">: {{ problem }}</span>
    </span>
  </Tooltip>
</template>
