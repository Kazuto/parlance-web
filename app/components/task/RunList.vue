<script setup lang="ts">
import { Pagination } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { isActiveRun } from "~/lib/taskForm";

// A task's runs, newest first. While one is queued or running, the list refreshes.
const props = defineProps<{ taskId: string }>();
const emit = defineEmits<{ open: [runId: string] }>();

const { t } = useI18n();
const page = ref(1);
const taskId = computed(() => props.taskId);
const { data, isFetching } = useQuery({
  ...api.tasks.runs.use({ taskId, pagination: { page, perPage: 10 } }),
  refetchInterval: (query) =>
    query.state.data?.runs?.some((run) => isActiveRun(run.status))
      ? 3000
      : false,
});
const runs = computed(() => data.value?.runs ?? []);
const totalPages = computed(() => data.value?.pagination?.totalPages ?? 1);

watch(taskId, () => (page.value = 1));
</script>

<template>
  <div class="space-y-2">
    <p
      v-if="!runs.length && !isFetching"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("tasks.noRuns") }}
    </p>
    <ul v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
      <li v-for="run in runs" :key="run.id ?? ''">
        <button
          type="button"
          class="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:hover:bg-white/5"
          @click="run.id && emit('open', run.id)"
        >
          <TaskRunStatus :status="run.status" />
          <TaskRunTrigger
            :run
            class="text-xs text-neutral-600 dark:text-neutral-300"
          />
          <RelativeTime
            v-if="run.startedAt || run.createdAt"
            class="text-xs text-neutral-500 dark:text-neutral-400"
            :timestamp="run.startedAt || run.createdAt || ''"
          />
          <TaskRunSummary :run class="basis-full sm:basis-auto sm:flex-1" />
        </button>
      </li>
    </ul>
    <Pagination
      v-if="totalPages > 1"
      :current="page"
      :per-page="10"
      :total="totalPages"
      @update:current="page = $event"
    />
  </div>
</template>
