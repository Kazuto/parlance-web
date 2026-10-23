<script setup lang="ts">
import { Alert, Button, Card, Icon, Switch, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Task } from "~/lib/api/schemas/parlance/v1/TaskSchema";
import { formToSettings, isActiveRun, taskToForm } from "~/lib/taskForm";
import { formatHour, parseSchedule } from "~/lib/taskSchedule";

const { t, locale } = useI18n();
const { can } = usePermission();
const { getErrorMessage, showError, showSuccess } = useErrorHelper();
const store = useTaskStore();

const { data, isLoading, error, refetch } = useQuery({
  ...api.tasks.list.use({}),
  // Follows the last run of each task while one is underway.
  refetchInterval: (query) =>
    query.state.data?.tasks?.some((task) => isActiveRun(task.lastRun?.status))
      ? 3000
      : false,
});
const tasks = computed(() => data.value?.tasks ?? []);

// Admins pause all tasks here; the setting is kept on the server.
const { data: settingsData } = useQuery(api.tasks.settings.use({}));
const paused = computed(() => !!settingsData.value?.settings?.paused);

async function setPaused(value: boolean) {
  try {
    await store.updateSettings.mutateAsync({ paused: value });
    showSuccess(t(value ? "tasks.pausedToast" : "tasks.resumedToast"));
  } catch (error) {
    showError(error);
  }
}

const formOpen = ref(false);
const editing = ref<Task>();
const deleting = ref<Task>();
const openRunId = ref<string>();
// Tasks whose runs are shown, by id.
const expanded = ref<Record<string, boolean>>({});

usePage(() => ({
  width: "wide",
  title: t("nav.tasks"),
  description: t("tasks.description"),
  showHeader: false,
  primaryAction: can.value("create_task")
    ? {
        content: t("tasks.add"),
        icon: "plus",
        onClick: () => openForm(),
      }
    : undefined,
}));

function openForm(task?: Task) {
  editing.value = task;
  formOpen.value = true;
}

const weekdayFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, { weekday: "long", timeZone: "UTC" }),
);

/** When the task runs, in words, e.g. "Daily at 03:00 UTC · after approvals". */
function describeTriggers(task: Task) {
  const schedule = parseSchedule(task.schedule);
  const time = formatHour(schedule.hour);
  const parts: string[] = [];

  switch (schedule.preset) {
    case "hourly":
      parts.push(t("tasks.describe.hourly"));

      break;
    case "daily":
      parts.push(t("tasks.describe.daily", { time }));

      break;
    case "weekly":
      parts.push(
        t("tasks.describe.weekly", {
          day: weekdayFormat.value.format(
            new Date(Date.UTC(2024, 0, 7 + schedule.weekday)),
          ),
          time,
        }),
      );

      break;
    case "custom":
      parts.push(t("tasks.describe.custom", { cron: schedule.custom }));

      break;
  }

  if (task.events?.includes("TASK_EVENT_TRANSLATIONS_APPROVED")) {
    parts.push(
      t(
        "tasks.describe.onApproval",
        { count: task.eventDelayMinutes ?? 0 },
        task.eventDelayMinutes ?? 0,
      ),
    );
  }

  return parts.length ? parts.join(" · ") : t("tasks.describe.manual");
}

/** What the task works on, e.g. the repository of a git export. */
function describeTarget(task: Task) {
  if (task.type === "TASK_TYPE_GIT_EXPORT") {
    const git = task.gitExport;

    return `${git?.repository ?? ""} · ${git?.baseBranch ?? ""} ← ${git?.branch ?? ""}`;
  }

  return t("tasks.ai.target");
}

async function setEnabled(task: Task, enabled: boolean) {
  if (!task.id) return;

  try {
    await store.update.mutateAsync({
      id: task.id,
      ...formToSettings({ ...taskToForm(task), enabled }),
    });
  } catch (error) {
    showError(error);
  }
}

async function runNow(task: Task) {
  if (!task.id) return;

  try {
    await store.run.mutateAsync({ id: task.id });
    expanded.value[task.id] = true;
    showSuccess(t("tasks.queued", { name: task.name ?? "" }));
  } catch (error) {
    showError(error);
  }
}
</script>

<template>
  <Card dense class="mb-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-1">
        <div class="font-semibold">{{ t("tasks.runTasks") }}</div>
        <Text muted size="sm">{{
          paused ? t("tasks.pausedHint") : t("tasks.runTasksHint")
        }}</Text>
      </div>
      <Switch
        :model-value="!paused"
        :aria-label="t('tasks.runTasks')"
        :disabled="!can('update_task') || store.updateSettings.isPending"
        @update:model-value="setPaused(!$event)"
      />
    </div>
  </Card>

  <div
    v-if="isLoading"
    class="flex items-center justify-center py-12 text-neutral-600"
  >
    {{ t("tasks.loading") }}
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("tasks.listFailed", { error: getErrorMessage(error) }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <Card v-else-if="!tasks.length">
    <div class="space-y-1 py-6 text-center">
      <Text>{{ t("tasks.empty") }}</Text>
      <Text muted size="sm">{{ t("tasks.emptyHint") }}</Text>
    </div>
  </Card>

  <div v-else class="space-y-3">
    <Card v-for="task in tasks" :key="task.id ?? ''">
      <div class="space-y-3">
        <div class="flex flex-wrap items-start gap-3">
          <div
            class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-200"
          >
            <Icon
              :name="
                task.type === 'TASK_TYPE_GIT_EXPORT'
                  ? 'git-pull-request'
                  : 'sparkle'
              "
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">{{ task.name }}</span>
              <span
                class="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
                >{{ t(`tasks.type.${task.type}`) }}</span
              >
              <span
                v-if="!task.enabled"
                class="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
                >{{ t("tasks.inactive") }}</span
              >
            </div>
            <div
              class="truncate text-xs text-neutral-500 dark:text-neutral-400"
              :class="{ 'font-mono': task.type === 'TASK_TYPE_GIT_EXPORT' }"
            >
              {{ describeTarget(task) }}
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ describeTriggers(task) }}
              <template v-if="task.enabled && task.nextRunAt">
                · {{ t("tasks.nextRun") }}
                <RelativeTime :timestamp="task.nextRunAt" />
              </template>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Switch
              v-if="can('update_task')"
              dense
              :model-value="!!task.enabled"
              :aria-label="t('tasks.enableFor', { name: task.name ?? '' })"
              :disabled="store.update.isPending"
              @update:model-value="setEnabled(task, $event)"
            />
            <Button
              v-can="'run_task'"
              dense
              ghost
              :disabled="store.run.isPending"
              @click="runNow(task)"
            >
              {{ t("tasks.runNow") }}
            </Button>
            <BaseActionButtons
              :edit-label="t('tasks.editFor', { name: task.name ?? '' })"
              :delete-label="t('tasks.deleteFor', { name: task.name ?? '' })"
              edit-permission="update_task"
              delete-permission="delete_task"
              @edit="openForm(task)"
              @delete="deleting = task"
            />
          </div>
        </div>

        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-200 pt-3 dark:border-neutral-800"
        >
          <template v-if="task.lastRun">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">{{
              t("tasks.lastRun")
            }}</span>
            <TaskRunStatus :status="task.lastRun.status" />
            <RelativeTime
              v-if="task.lastRun.startedAt || task.lastRun.createdAt"
              class="text-xs text-neutral-500 dark:text-neutral-400"
              :timestamp="
                task.lastRun.startedAt || task.lastRun.createdAt || ''
              "
            />
            <TaskRunSummary :run="task.lastRun" class="flex-1" />
          </template>
          <span
            v-else
            class="flex-1 text-xs text-neutral-500 dark:text-neutral-400"
          >
            {{ t("tasks.neverRun") }}
          </span>
          <Button
            v-if="task.id"
            dense
            ghost
            :aria-expanded="!!expanded[task.id]"
            @click="expanded[task.id] = !expanded[task.id]"
          >
            {{ expanded[task.id] ? t("tasks.hideRuns") : t("tasks.showRuns") }}
          </Button>
        </div>

        <TaskRunList
          v-if="task.id && expanded[task.id]"
          :task-id="task.id"
          @open="openRunId = $event"
        />
      </div>
    </Card>
  </div>

  <TaskFormDialog :open="formOpen" :item="editing" @close="formOpen = false" />
  <TaskDeleteDialog
    :open="!!deleting"
    :item="deleting"
    @close="deleting = undefined"
  />
  <TaskRunDialog :run-id="openRunId" @close="openRunId = undefined" />
</template>
