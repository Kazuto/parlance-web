<script setup lang="ts">
import { Badge } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import { api } from "~/lib/api";

const props = defineProps<{
  item: Locale;
}>();

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
</script>

<template>
  <Badge :variant="variant" dense> {{ percentage }}% </Badge>
</template>
