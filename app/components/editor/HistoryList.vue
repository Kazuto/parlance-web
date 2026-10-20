<script setup lang="ts">
import { Pagination } from "@thkzt/eunoia";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

// Change history of one language, shared by the entry and glossary context panels.
type HistoryItem = {
  id?: string | null;
  userId?: string | null;
  translation?: string | null;
  action?: string | null;
  changedAt?: string | null;
  user?: User | null;
};

defineProps<{
  items: HistoryItem[];
  loading: boolean;
  failed: boolean;
  totalPages: number;
}>();
const emit = defineEmits<{ retry: [] }>();
const page = defineModel<number>("page", { required: true });
const { t } = useI18n();

function actionLabel(action: string | null | undefined) {
  return ["created", "updated", "deleted"].includes(action ?? "")
    ? t(`context.action.${action}`)
    : (action ?? "");
}

function changedBy(item: HistoryItem) {
  return (
    item.user?.name ||
    item.user?.email ||
    (item.userId ? t("context.unknownUser") : t("context.systemUser"))
  );
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ t("context.historyHint") }}
    </p>
    <p
      v-if="loading"
      role="status"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.loadingHistory") }}
    </p>
    <p v-else-if="failed" role="alert" class="text-sm text-red-600">
      {{ t("context.historyFailed") }}
      <button
        type="button"
        class="cursor-pointer underline"
        @click="emit('retry')"
      >
        {{ t("common.retry") }}
      </button>
    </p>
    <template v-else>
      <p
        v-if="!items.length"
        class="text-sm text-neutral-500 dark:text-neutral-400"
      >
        {{ t("context.noHistory") }}
      </p>
      <ol class="flex flex-col gap-2">
        <li
          v-for="item in items"
          :key="item.id ?? undefined"
          class="flex flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3 squircle dark:border-white/5 dark:bg-neutral-800"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400"
          >
            <span class="font-semibold">{{ actionLabel(item.action) }}</span>
            <RelativeTime v-if="item.changedAt" :timestamp="item.changedAt" />
          </div>
          <p
            class="truncate text-xs text-neutral-500 dark:text-neutral-400"
            :title="changedBy(item)"
          >
            {{ t("context.changedBy", { name: changedBy(item) }) }}
          </p>
          <p
            class="text-sm break-words whitespace-pre-wrap dark:text-neutral-100"
          >
            {{ item.translation || t("context.emptyTranslation") }}
          </p>
        </li>
      </ol>
    </template>
    <Pagination
      v-if="totalPages > 1"
      :current="page"
      :per-page="25"
      :total="totalPages"
      @update:current="page = $event"
    />
  </div>
</template>
