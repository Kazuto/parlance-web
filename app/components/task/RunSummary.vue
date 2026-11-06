<script setup lang="ts">
import type { TaskRun } from "~/lib/api/schemas/parlance/v1/TaskSchema";

// What a run did, in one line: its counts, message, or why it failed.
defineProps<{ run: TaskRun }>();

const { t } = useI18n();
</script>

<template>
  <span class="min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
    <template v-if="run.status === 'TASK_RUN_STATUS_FAILED' && run.error">
      <span class="text-red-600 dark:text-rose-300">{{ run.error }}</span>
    </template>
    <template v-else-if="run.summary?.translated || run.summary?.failed">
      {{
        t("tasks.summary.translated", {
          translated: run.summary.translated ?? 0,
          failed: run.summary.failed ?? 0,
        })
      }}
      <template v-if="run.summary.redone">
        · {{ t("tasks.summary.redone", { count: run.summary.redone }) }}
      </template>
      <template v-if="run.summary.remaining">
        ·
        {{ t("tasks.summary.remaining", { count: run.summary.remaining }) }}
      </template>
    </template>
    <template v-else-if="run.summary?.outcome">{{
      t(`tasks.outcome.${run.summary.outcome}`, {
        count: run.summary.changedFiles?.length ?? 0,
      })
    }}</template>
    <a
      v-if="run.summary?.pullRequestUrl"
      :href="run.summary.pullRequestUrl"
      target="_blank"
      rel="noopener"
      class="ml-1 font-semibold text-primary-600 hover:underline dark:text-primary-300"
      >{{ t("tasks.summary.pullRequest") }}</a
    >
  </span>
</template>
