<script setup lang="ts">
import { Pagination } from "@thkzt/eunoia";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

// Change history of one language, shared by the entry and glossary context panels.
type HistoryItem = {
  id?: string | null;
  userId?: string | null;
  translation?: string | null;
  action?: string | null;
  /** A reviewer's comment, when sending the text back. */
  comment?: string | null;
  changedAt?: string | null;
  user?: User | null;
};

const props = defineProps<{
  items: HistoryItem[];
  loading: boolean;
  failed: boolean;
  totalPages: number;
  /** Whether an older text may be put back into the field. */
  canUse?: boolean;
  /** The field's text now, which needs no button to bring back. */
  current?: string;
}>();

const emit = defineEmits<{ retry: []; use: [text: string] }>();
const page = defineModel<number>("page", { required: true });
const { t } = useI18n();

function usable(item: HistoryItem) {
  return (
    props.canUse && !!item.translation && item.translation !== props.current
  );
}

function actionLabel(action: string | null | undefined) {
  return ["created", "updated", "deleted", "approved", "rejected"].includes(
    action ?? "",
  )
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
            <span class="flex items-center gap-1">
              <RelativeTime v-if="item.changedAt" :timestamp="item.changedAt" />
              <BaseIconButton
                v-if="usable(item)"
                dense
                icon="arrow-counter-clockwise"
                :label="t('context.useVersion')"
                @click="emit('use', item.translation ?? '')"
              />
            </span>
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
          <p
            v-if="item.comment"
            class="rounded-xl bg-red-50 px-2.5 py-1.5 text-xs text-red-700 squircle dark:bg-rose-500/10 dark:text-rose-200"
          >
            {{ t("review.commentLabel", { comment: item.comment }) }}
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
