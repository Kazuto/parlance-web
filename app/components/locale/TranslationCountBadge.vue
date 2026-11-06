<script setup lang="ts">
import { Badge, Tooltip } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import { api } from "~/lib/api";

const props = defineProps<{
  item: Locale;
  /**
   * Makes the badge a link to the locale's entries: those still missing a
   * translation, or all of them once nothing is missing.
   */
  entriesUrl?: (status?: "missing") => string;
}>();

const { t } = useI18n();

// Get stats from backend
const { data: statsData } = useQuery({
  ...api.stats.get.use({}),
});

// Find the stats for this specific locale
const localeStats = computed(() => {
  return statsData.value?.byLocale?.find(
    (stats) => stats.localeId === props.item.id,
  );
});

const percentage = computed(() => {
  return localeStats.value?.percentage ?? 0;
});

const variant = computed(() => {
  if (percentage.value === 100) return "success";
  if (percentage.value >= 75) return "primary";
  if (percentage.value >= 50) return "warning";

  return "secondary";
});

const isComplete = computed(() => percentage.value === 100);
const link = computed(() =>
  props.entriesUrl?.(isComplete.value ? undefined : "missing"),
);
const linkLabel = computed(() =>
  t(isComplete.value ? "locales.showEntries" : "locales.showMissing"),
);
</script>

<template>
  <Tooltip v-if="link" :content="linkLabel" placement="top">
    <NuxtLink
      :to="link"
      :aria-label="`${linkLabel} (${percentage}%)`"
      class="inline-flex rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    >
      <Badge :variant="variant" dense> {{ percentage }}% </Badge>
    </NuxtLink>
  </Tooltip>
  <Badge v-else :variant="variant" dense> {{ percentage }}% </Badge>
</template>
