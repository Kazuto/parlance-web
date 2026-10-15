<script setup lang="ts">
import { Pagination } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

const props = defineProps<{
  entryId: string;
  localeId: string;
  localeName: string;
  sourceText: string;
  translation: string;
  isDefault: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const tab = ref("terminology");
const tabs = computed(() => [
  { value: "terminology", label: t("context.terminology") },
  { value: "history", label: t("context.history") },
]);
const page = ref(1);
const entryId = computed(() => props.entryId);
const options = api.entries.history.use({
  entryId,
  pagination: { page, perPage: 25 },
});
const { data, isFetching, error, refetch } = useQuery({
  ...options,
  enabled: computed(
    () =>
      toValue(options.enabled) && tab.value === "history" && !!entryId.value,
  ),
  staleTime: 10000,
});
watch(entryId, () => {
  page.value = 1;
});
const history = computed(() =>
  (data.value?.history ?? []).filter(
    (item) => item.localeId === props.localeId,
  ),
);
</script>

<template>
  <BaseContextPanel
    v-model:tab="tab"
    :locale-name="localeName"
    :tabs="tabs"
    @close="emit('close')"
  >
    <template #default="{ tab: currentTab }">
      <template v-if="currentTab === 'terminology'">
        <p v-if="isDefault" class="text-sm text-neutral-500">
          {{ t("context.defaultHint") }}
        </p>
        <EntryTerminologyHints
          v-else
          :key="`${entryId}-${localeId}`"
          panel
          :source-text="sourceText"
          :target-locale-id="localeId"
          :translation="translation"
        />
      </template>
      <template v-else>
        <p class="mb-3 text-xs text-neutral-500">
          {{ t("context.historyHint") }}
        </p>
        <p
          v-if="isFetching && !data"
          role="status"
          class="text-sm text-neutral-500"
        >
          {{ t("context.loadingHistory") }}
        </p>
        <p v-else-if="error && !data" role="alert" class="text-sm text-red-600">
          {{ t("context.historyFailed") }}
          <button
            type="button"
            class="cursor-pointer underline"
            @click="() => refetch()"
          >
            {{ t("common.retry") }}
          </button>
        </p>
        <template v-else>
          <p v-if="!history.length" class="text-sm text-neutral-500">
            {{ t("context.noHistory") }}
          </p>
          <ol class="space-y-3">
            <li
              v-for="item in history"
              :key="item.id ?? undefined"
              class="rounded-md border border-neutral-200 p-3 dark:border-neutral-700"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500"
              >
                <span>{{
                  ["created", "updated", "deleted"].includes(item.action ?? "")
                    ? t(`context.action.${item.action}`)
                    : item.action
                }}</span>
                <RelativeTime
                  v-if="item.changedAt"
                  :timestamp="item.changedAt"
                />
              </div>
              <p
                class="mt-2 truncate text-xs text-neutral-500"
                :title="
                  item.user?.name ||
                  item.user?.email ||
                  item.userId ||
                  t('context.systemUser')
                "
              >
                {{
                  t("context.changedBy", {
                    name:
                      item.user?.name ||
                      item.user?.email ||
                      (item.userId
                        ? t("context.unknownUser")
                        : t("context.systemUser")),
                  })
                }}
              </p>
              <p class="mt-2 whitespace-pre-wrap break-words text-sm">
                {{ item.translation || t("context.emptyTranslation") }}
              </p>
            </li>
          </ol>
        </template>
        <Pagination
          v-if="(data?.pagination?.totalPages ?? 0) > 1"
          class="mt-4"
          :current="page"
          :per-page="25"
          :total="data?.pagination?.totalPages ?? 0"
          @update:current="page = $event"
        />
      </template>
    </template>
  </BaseContextPanel>
</template>
