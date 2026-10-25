<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { textDirection } from "~/lib/textDirection";

const props = defineProps<{
  entryId: string;
  localeId: string;
  localeName: string;
  localeCode?: string;
  sourceText: string;
  sourceLocaleId?: string;
  sourceLocaleName: string;
  sourceLocaleCode?: string;
  translation: string;
  isDefault: boolean;
  /** When the translation's default text first changed since; unset while current. */
  outdatedAt?: string | null;
  /** Whether an older text or a match from the memory may replace the field's text. */
  canUse?: boolean;
}>();
const emit = defineEmits<{ close: []; use: [text: string] }>();
const { t } = useI18n();
const tab = defineModel<string>("tab", { default: "terminology" });
const tabs = computed(() => [
  { value: "terminology", label: t("context.terminology") },
  { value: "memory", label: t("context.memory") },
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
      <!-- The default text first, then the glossary terms found in it. -->
      <div v-if="currentTab === 'terminology'" class="flex flex-col gap-3">
        <p
          v-if="isDefault"
          class="text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400"
        >
          {{ t("context.defaultHint") }}
        </p>
        <template v-else>
          <EntrySourceChange
            v-if="outdatedAt && sourceLocaleId"
            :entry-id="entryId"
            :source-locale-id="sourceLocaleId"
            :source-locale-name="sourceLocaleName"
            :source-locale-code="sourceLocaleCode"
            :outdated-at="outdatedAt"
            :source-text="sourceText"
          />
          <div
            v-else-if="sourceText.trim()"
            class="flex flex-col gap-1 border-b border-neutral-200 pb-3 dark:border-neutral-800"
          >
            <span
              class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
              >{{ t("context.source", { language: sourceLocaleName }) }}</span
            >
            <span
              class="text-[13px] leading-normal whitespace-pre-wrap dark:text-neutral-100"
              :dir="
                sourceLocaleCode ? textDirection(sourceLocaleCode) : undefined
              "
              >{{ sourceText }}</span
            >
          </div>
          <EntryTerminologyHints
            :key="`${entryId}-${localeId}`"
            :source-text="sourceText"
            :target-locale-id="localeId"
            :translation="translation"
          />
        </template>
      </div>
      <template v-else-if="currentTab === 'memory'">
        <p
          v-if="isDefault"
          class="text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400"
        >
          {{ t("context.memoryDefaultHint") }}
        </p>
        <EntryMemoryMatches
          v-else
          :entry-id="entryId"
          :source-text="sourceText"
          :source-locale-name="sourceLocaleName"
          :source-locale-code="sourceLocaleCode"
          :target-locale-id="localeId"
          :locale-name="localeName"
          :locale-code="localeCode"
          :current="translation"
          :can-use="canUse"
          @use="emit('use', $event)"
        />
      </template>
      <EditorHistoryList
        v-else
        v-model:page="page"
        :items="history"
        :loading="isFetching && !data"
        :failed="!!error && !data"
        :total-pages="data?.pagination?.totalPages ?? 0"
        :locale-code="localeCode"
        :can-use="canUse"
        :current="translation"
        @retry="refetch()"
        @use="emit('use', $event)"
      />
    </template>
  </BaseContextPanel>
</template>
