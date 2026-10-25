<script setup lang="ts">
import { Tooltip } from "@thkzt/eunoia";
import { checkTranslation } from "~/lib/qa";

// What to check in a translation against the source text, whether a person or the
// translation model wrote it. It follows the field as it is typed.
const props = defineProps<{
  source: string;
  value: string;
}>();
const { t } = useI18n();

const problems = computed(() =>
  checkTranslation(props.source, props.value).map((warning) =>
    t(`entries.suggestionWarning.${warning.code}`, {
      placeholder: warning.detail ?? "",
    }),
  ),
);
</script>

<template>
  <Tooltip v-if="problems.length" :content="problems.join(' · ')">
    <span
      role="status"
      class="flex h-5 items-center gap-1.5 rounded-[8px] leading-none px-2 text-[10.5px] font-bold whitespace-nowrap squircle bg-yellow-100 text-yellow-700 dark:bg-amber-400/15 dark:text-amber-200"
    >
      <span class="size-[5px] rounded-full bg-current" />
      {{ t("entries.suggestionCheck") }}
      <span class="sr-only">: {{ problems.join(", ") }}</span>
    </span>
  </Tooltip>
</template>
