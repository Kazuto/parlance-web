<script setup lang="ts">
import type { TaskRunStatus } from "~/lib/api/schemas/parlance/v1/TaskSchema";

// A run's state as a small colored chip.
const props = defineProps<{ status?: TaskRunStatus | null }>();
const { t } = useI18n();

const styles: Record<string, string> = {
  TASK_RUN_STATUS_QUEUED:
    "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
  TASK_RUN_STATUS_RUNNING:
    "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200",
  TASK_RUN_STATUS_SUCCEEDED:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-200",
  TASK_RUN_STATUS_FAILED:
    "bg-red-100 text-red-700 dark:bg-rose-400/15 dark:text-rose-200",
  TASK_RUN_STATUS_CANCELED:
    "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400",
};
const status = computed(() => String(props.status ?? "TASK_RUN_STATUS_QUEUED"));
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
    :class="styles[status]"
  >
    <span
      v-if="status === 'TASK_RUN_STATUS_RUNNING'"
      class="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
    />
    {{ t(`tasks.status.${status}`) }}
  </span>
</template>
