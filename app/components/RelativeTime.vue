<script setup lang="ts">
import { Tooltip, useRelativeTime } from "@thkzt/eunoia";

const props = withDefaults(
  defineProps<{
    timestamp: string;
    interval?: number;
  }>(),
  {
    interval: 1000 * 60 * 5,
  },
);

const date = computed(() => new Date(props.timestamp));
const {
  relative,
  date: dateStr,
  time,
} = useRelativeTime(date, {
  locale: "en",
  interval: props.interval,
});

const content = computed(() => {
  return `${dateStr.value} ${time.value}`;
});
</script>

<template>
  <Tooltip :content :placement="'top'">
    <span>{{ relative }}</span>
  </Tooltip>
</template>
