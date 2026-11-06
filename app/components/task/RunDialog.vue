<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { isActiveRun } from "~/lib/taskForm";

// One run with its log, refreshed while it is queued or running.
const props = defineProps<{ runId?: string }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { can } = usePermission();
const { showError } = useErrorHelper();
const store = useTaskStore();

const runId = computed(() => props.runId ?? "");
const options = api.tasks.getRun.use({ id: runId });
const { data } = useQuery({
  ...options,
  enabled: computed(() => toValue(options.enabled) && !!props.runId),
  refetchInterval: (query) => {
    const status = query.state.data?.run?.status;

    return isActiveRun(status) ? 2000 : false;
  },
});
const run = computed(() => data.value?.run);
const active = computed(() => isActiveRun(run.value?.status));

async function cancelRun() {
  if (!run.value?.id) return;

  try {
    await store.cancelRun.mutateAsync({ id: run.value.id });
  } catch (error) {
    showError(error);
  }
}
</script>

<template>
  <Dialog :open="!!runId" :title="t('tasks.runTitle')" @close="emit('close')">
    <div v-if="run" class="space-y-4">
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("common.status") }}
        </dt>
        <dd><TaskRunStatus :status="run.status" /></dd>
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("tasks.trigger") }}
        </dt>
        <dd><TaskRunTrigger :run /></dd>
        <template v-if="run.startedAt">
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("tasks.started") }}
          </dt>
          <dd><RelativeTime :timestamp="run.startedAt" /></dd>
        </template>
        <template
          v-else-if="run.runAfter && run.status === 'TASK_RUN_STATUS_QUEUED'"
        >
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("tasks.startsAt") }}
          </dt>
          <dd><RelativeTime :timestamp="run.runAfter" /></dd>
        </template>
        <template v-if="run.finishedAt">
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("tasks.finished") }}
          </dt>
          <dd><RelativeTime :timestamp="run.finishedAt" /></dd>
        </template>
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("tasks.result") }}
        </dt>
        <dd><TaskRunSummary :run /></dd>
      </dl>

      <div v-if="run.summary?.changedFiles?.length" class="space-y-1">
        <div class="text-sm font-medium">{{ t("tasks.changedFiles") }}</div>
        <ul class="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          <li v-for="file in run.summary.changedFiles" :key="file">
            {{ file }}
          </li>
        </ul>
      </div>

      <div class="space-y-1">
        <div class="text-sm font-medium">{{ t("tasks.log") }}</div>
        <pre
          class="max-h-80 overflow-auto rounded-xl bg-neutral-100 p-3 font-mono text-xs leading-5 whitespace-pre-wrap dark:bg-white/5"
          >{{ run.log || t("tasks.noLog") }}</pre
        >
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button
          v-if="active && can('run_task')"
          type="button"
          ghost
          destructive
          :disabled="store.cancelRun.isPending || !!run?.cancelRequested"
          @click="cancelRun"
        >
          {{
            run?.cancelRequested ? t("tasks.canceling") : t("tasks.cancelRun")
          }}
        </Button>
        <Button type="button" @click="emit('close')">
          {{ t("common.close") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
