<script setup lang="ts">
import { Tooltip, useRelativeTime } from "@thkzt/eunoia";

// A time as "5 minutes ago" or "in 2 hours", kept current as time passes, with
// the date and time in a tooltip. Both follow the interface language.
const props = defineProps<{ timestamp: string }>();

const { locale } = useI18n();
const { relative, date, time } = useRelativeTime(() => props.timestamp, {
  locale,
});

const content = computed(() =>
  date.value ? `${date.value} ${time.value}` : "",
);
</script>

<template>
  <Tooltip :content :placement="'top'">
    <span>{{ relative }}</span>
  </Tooltip>
</template>
