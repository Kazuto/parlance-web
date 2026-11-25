<script setup lang="ts">
import { Tooltip } from "@thkzt/eunoia";

// What the colors of the counts beside each item in the list stand for; see
// EditorListItem.
const props = defineProps<{
  /** The list counts outdated translations too. */
  outdated?: boolean;
}>();

const { t } = useI18n();

const kinds = computed(() => [
  {
    label: t("entries.filterReview"),
    class: "bg-yellow-500 dark:bg-amber-300",
  },
  ...(props.outdated
    ? [
        {
          label: t("entries.filterOutdated"),
          class: "bg-orange-500 dark:bg-orange-300",
        },
      ]
    : []),
  {
    label: t("entries.missingTranslations"),
    class: "bg-red-400 dark:bg-rose-300",
  },
]);
</script>

<template>
  <span class="flex items-center gap-1.5">
    <Tooltip v-for="kind in kinds" :key="kind.label" :content="kind.label">
      <span
        role="img"
        :aria-label="kind.label"
        class="block size-2 rounded-full"
        :class="kind.class"
      />
    </Tooltip>
  </span>
</template>
