<script setup lang="ts">
import { Tooltip, useRelativeTime } from "@thkzt/eunoia";

const props = defineProps<{
  timestamp: string;
}>();

const { relative, date, time } = useRelativeTime(new Date(props.timestamp), {
  locale: "en",
  interval: 60000,
});

const content = computed(() => {
  return `${date.value} ${time.value}`;
});
</script>

<template>
  <Tooltip :content :placement="'top'">
    <span>{{ relative }}</span>
  </Tooltip>
</template>
