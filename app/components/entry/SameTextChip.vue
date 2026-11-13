<script setup lang="ts">
import { useSimilarEntries } from "~/composables/editor/useSimilarEntries";

// How many other entries have the default text being written, so a twin shows before
// it is saved. A click lists them in the context panel.
const props = defineProps<{
  text: string;
  entryId: string;
}>();
const emit = defineEmits<{ open: [] }>();
const { t } = useI18n();

const { sameTextCount } = useSimilarEntries(
  () => props.text,
  () => props.entryId,
);
</script>

<template>
  <button
    v-if="sameTextCount"
    type="button"
    class="flex h-5 cursor-pointer items-center gap-1.5 rounded-[8px] leading-none px-2 text-[10.5px] font-bold whitespace-nowrap squircle bg-yellow-100 text-yellow-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:bg-amber-400/15 dark:text-amber-200"
    :title="t('entries.sameTextHint')"
    @click="emit('open')"
  >
    <span class="size-[5px] rounded-full bg-current" />
    {{ t("entries.sameText", { count: sameTextCount }, sameTextCount) }}
  </button>
</template>
