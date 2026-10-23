<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

const props = defineProps<{
  entryId: string;
  localeId: string;
  localeName: string;
  sourceText: string;
  sourceLocaleName: string;
  translation: string;
  isDefault: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const tab = defineModel<string>("tab", { default: "terminology" });
const tabs = computed(() => [
  { value: "terminology", label: t("context.terminology") },
  { value: "history", label: t("context.history") },
]);
const page = ref(1);
const entryId = computed(() => props.entryId);
const localeId = computed(() => props.localeId);
const options = api.entries.history.use({
  entryId,
  localeId,
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

watch([entryId, localeId], () => {
  page.value = 1;
});

const history = computed(() => data.value?.history ?? []);
</script>

<template>
  <BaseContextPanel
    v-model:tab="tab"
    :locale-name="localeName"
    :tabs="tabs"
    @close="emit('close')"
  >
    <template #default="{ tab: currentTab }">
      <div v-if="currentTab === 'terminology'" class="flex flex-col gap-4">
        <p
          v-if="isDefault"
          class="text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400"
        >
          {{ t("context.defaultHint") }}
        </p>
        <template v-else>
          <EntryTerminologyHints
            :key="`${entryId}-${localeId}`"
            :source-text="sourceText"
            :target-locale-id="localeId"
            :translation="translation"
          />
          <div
            v-if="sourceText.trim()"
            class="flex flex-col gap-1.5 rounded-2xl bg-neutral-100 px-3.5 py-3 squircle dark:bg-neutral-950"
          >
            <span
              class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
              >{{ t("context.source", { language: sourceLocaleName }) }}</span
            >
            <span
              class="text-[13px] leading-normal whitespace-pre-wrap dark:text-neutral-100"
              >{{ sourceText }}</span
            >
          </div>
        </template>
      </div>
      <EditorHistoryList
        v-else
        v-model:page="page"
        :items="history"
        :loading="isFetching && !data"
        :failed="!!error && !data"
        :total-pages="data?.pagination?.totalPages ?? 0"
        @retry="refetch()"
      />
    </template>
  </BaseContextPanel>
</template>
