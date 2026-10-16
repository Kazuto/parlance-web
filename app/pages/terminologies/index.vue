<script setup lang="ts">
import {
  Button,
  SplitView,
  type SplitViewItem,
  Textarea,
  Badge,
  Input,
  Chip,
  Tooltip,
} from "@thkzt/eunoia";
import {
  useTerminologyDetail,
  useTerminologyFeed,
} from "~/composables/terminology/useTerminologyFeed";
import { watchDebounced, useMediaQuery } from "@vueuse/core";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type { Definition } from "~/lib/api/schemas/parlance/v1/DefinitionSchema";

const { t } = useI18n();
const showCreateDialog = ref(false);
const deleteDialogItem = ref<Terminology>();
const editDialogItem = ref<Terminology>();

usePage({
  width: "extra-wide",
  layout: "workspace",
  title: t("nav.terminologies"),
  description: t("terminologies.description"),
  showHeader: false,
  primaryAction: {
    content: t("terminologies.create"),
    icon: "plus",
    onClick: () => (showCreateDialog.value = true),
  },
});

const {
  data,
  terminologies: feedTerminologies,
  total: terminologyTotal,
  isLoading,
  isFetching,
  error,
  refetch,
  search: feedSearch,
  targetLocaleIds,
} = useTerminologyFeed(100);

const { data: localeData, pagination } = useLocaleList();
pagination.value.perPage = 100;

const defaultLocale = computed(() =>
  localeData.value?.locales?.find((locale) => locale.isDefault),
);

const defaultLocaleIds = computed(() => {
  const locales = localeData.value?.locales ?? [];
  const id = (locales.find((locale) => locale.isDefault) ?? locales[0])?.id;
  return id ? [id] : [];
});

const selectedLocaleIds = ref<string[]>([]);

// Initialize selectedLocaleIds once when locales are loaded
watch(
  () => localeData.value?.locales,
  (locales) => {
    if (locales && selectedLocaleIds.value.length === 0) {
      selectedLocaleIds.value = [...defaultLocaleIds.value];
    }
  },
  { immediate: true },
);

watch(
  selectedLocaleIds,
  (ids) => {
    targetLocaleIds.value = [...ids];
  },
  { deep: true },
);

const languagesFiltered = computed(
  () =>
    selectedLocaleIds.value.length !== defaultLocaleIds.value.length ||
    selectedLocaleIds.value.some((id) => !defaultLocaleIds.value.includes(id)),
);
const activeFilterCount = computed(() => Number(languagesFiltered.value));
const selectedLanguageLabels = computed(() =>
  orderedSelectedLocaleIds.value
    .map((id) => localeOptions.value.find((locale) => locale.value === id))
    .filter((locale) => !!locale)
    .map((locale) => locale.label),
);

const MAX_LISTED_LANGUAGES = 3;
const languageSummary = computed(() => {
  const labels = selectedLanguageLabels.value;
  if (!labels.length) return t("entries.selectLocales");
  if (labels.length > 1 && labels.length === localeOptions.value.length)
    return t("entries.allLanguages");
  const listed = labels.slice(0, MAX_LISTED_LANGUAGES).join(", ");
  const hidden = labels.length - MAX_LISTED_LANGUAGES;
  return `${t("entries.languagesShort")}: ${listed}${hidden > 0 ? ` +${hidden}` : ""}`;
});

function clearFilters() {
  selectedLocaleIds.value = [...defaultLocaleIds.value];
}

const selectedTerminology = ref<SplitViewItem>();
const search = ref("");
const isSaving = ref(false);
const contextOpen = ref(false);
const narrowWorkspace = useMediaQuery("(max-width: 1100px)");
watch(
  narrowWorkspace,
  (narrow) => {
    if (narrow) contextOpen.value = false;
  },
  { immediate: true },
);
const activeLocaleId = ref<string>();
const activeLocaleName = computed(
  () =>
    localeOptions.value.find((item) => item.value === activeLocaleId.value)
      ?.label ?? "",
);

function openContext(localeId: string) {
  activeLocaleId.value = localeId;
  contextOpen.value = true;
}

watchDebounced(
  search,
  (value) => {
    feedSearch.value = value;
  },
  { debounce: 350 },
);

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !search.value) return;
  event.preventDefault();
  search.value = "";
}

feedSearch.value = search.value || undefined;

const pinnedTerminologyId = ref<string>();

async function handleCreated(terminology: Terminology) {
  search.value = "";
  feedSearch.value = undefined;
  if (!terminology.id) return;
  knownTerminologies.value[terminology.id] = terminology;
  pinnedTerminologyId.value = terminology.id;
  selectedTerminology.value = {
    key: terminology.id,
    label: terminology.term ?? "",
  };
}

function selectTerminology(item: SplitViewItem) {
  if (isSaving.value) return;
  pinnedTerminologyId.value = undefined;
  selectedTerminology.value = item;
}

async function handleDeleted(id: string) {
  Reflect.deleteProperty(definitionForms.value, id);
  Reflect.deleteProperty(savedDefinitions.value, id);
  Reflect.deleteProperty(knownTerminologies.value, id);
  pinnedTerminologyId.value = undefined;
  selectedTerminology.value = undefined;
  await refetch();
}

const orderedSelectedLocaleIds = computed(() => {
  const id = defaultLocale.value?.id;
  return id && selectedLocaleIds.value.includes(id)
    ? [id, ...selectedLocaleIds.value.filter((localeId) => localeId !== id)]
    : selectedLocaleIds.value;
});

const localeOptions = computed(
  () =>
    localeData.value?.locales
      ?.filter((locale) => !!locale.id)
      .toSorted((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault))
      .map((locale: Locale) => ({
        label: locale.name ?? locale.code ?? "",
        value: locale.id ?? "",
      })) ?? [],
);

const knownTerminologies = ref<Record<string, Terminology>>({});

const splitViewItems = computed((): SplitViewItem[] => {
  const activeLocales = localeData.value?.locales?.filter(
    (locale) => !locale.deletedAt && locale.id,
  );
  const activeLocaleIds =
    activeLocales?.map((locale) => locale.id!).filter(Boolean) ?? [];

  return feedTerminologies.value
    .filter((terminology) => !!terminology.id)
    .map((terminology: Terminology) => {
      // Use knownTerminologies if available (has full definitions), otherwise use feed data
      const known = terminology.id
        ? knownTerminologies.value[terminology.id]
        : undefined;
      const source = known ?? terminology;

      const definedLocaleIds = new Set(
        (source.definitions ?? [])
          .filter((def) => def.localeId && !def.deletedAt)
          .map((def) => def.localeId!),
      );
      const missingLocaleIds = activeLocaleIds.filter(
        (id) => !definedLocaleIds.has(id),
      );

      return {
        key: terminology.id ?? "",
        label: terminology.term ?? "",
        missingLocaleIds,
      };
    });
});

function isMissingDefinitions(item: SplitViewItem) {
  const missing = (item.missingLocaleIds as string[] | undefined) ?? [];
  return selectedLocaleIds.value.some((id) => missing.includes(id));
}

watch(
  splitViewItems,
  (items) => {
    const id = selectedTerminology.value?.key;
    if (id !== undefined && id === pinnedTerminologyId.value) return;
    if (!items.some((item) => item.key === id)) {
      selectedTerminology.value = items[0];
    }
  },
  { immediate: true },
);

const selectedTerminologyId = computed(() =>
  selectedTerminology.value ? String(selectedTerminology.value.key) : undefined,
);
const {
  data: detailData,
  isLoading: isDetailLoading,
  error: detailError,
  refetch: refetchDetail,
} = useTerminologyDetail(selectedTerminologyId);

const definitionForms = ref<Record<string, Record<string, string>>>({});
const savedDefinitions = ref<Record<string, Record<string, string>>>({});

function handleTerminologyUpdated(terminology: Terminology) {
  if (terminology.id) {
    const known = knownTerminologies.value[terminology.id];
    knownTerminologies.value[terminology.id] = {
      ...terminology,
      definitions: terminology.definitions?.length
        ? terminology.definitions
        : known?.definitions,
    };
    if (terminology.id === selectedTerminologyId.value) refetchDetail();
  }
  if (terminology.id && selectedTerminology.value?.key === terminology.id) {
    selectedTerminology.value = {
      key: terminology.id,
      label: terminology.term ?? "",
    };
  }
}

watch(
  () => detailData.value?.terminology,
  (detail) => {
    for (const terminology of detail ? [detail] : []) {
      if (!terminology.id) continue;
      knownTerminologies.value[terminology.id] = {
        ...terminology,
        definitions: [...(terminology.definitions ?? [])],
      };
      const saved = Object.fromEntries(
        (terminology.definitions ?? [])
          .filter((definition) => !!definition.localeId)
          .map((definition) => [
            String(definition.localeId),
            definition.translation ?? "",
          ]),
      );
      const previous = savedDefinitions.value[terminology.id] ?? {};
      const drafts = definitionForms.value[terminology.id] ?? {};
      const next = { ...saved };
      for (const [localeId, value] of Object.entries(drafts)) {
        if (value !== (previous[localeId] ?? "")) next[localeId] = value;
      }
      definitionForms.value[terminology.id] = next;
      savedDefinitions.value[terminology.id] = saved;
    }
  },
  { immediate: true },
);

function isDefinitionDirty(terminologyId: string, localeId: string) {
  return (
    (definitionForms.value[terminologyId]?.[localeId] ?? "") !==
    (savedDefinitions.value[terminologyId]?.[localeId] ?? "")
  );
}

function hasUnsavedDefinitions(terminologyId: string) {
  return Object.keys(definitionForms.value[terminologyId] ?? {}).some(
    (localeId) => isDefinitionDirty(terminologyId, localeId),
  );
}

const unsavedLocaleIds = computed(() => {
  const id = selectedTerminology.value?.key;
  return id == null
    ? []
    : Object.keys(definitionForms.value[String(id)] ?? {}).filter((localeId) =>
        isDefinitionDirty(String(id), localeId),
      );
});

const selectedUnsavedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter((localeId) =>
    unsavedLocaleIds.value.includes(localeId),
  ),
);

const allUnsavedDefinitions = computed(() =>
  Object.entries(definitionForms.value).flatMap(
    ([terminologyId, definitions]) =>
      Object.entries(definitions)
        .filter(([localeId]) => isDefinitionDirty(terminologyId, localeId))
        .map(([localeId, translation]) => ({
          terminologyId,
          localeId,
          translation,
        })),
  ),
);
const allUnsavedCount = computed(() => allUnsavedDefinitions.value.length);
registerUnsavedChanges("terminology-definitions", allUnsavedCount, isSaving);

const selectedTerminologyData = computed(() =>
  selectedTerminologyId.value
    ? knownTerminologies.value[selectedTerminologyId.value]
    : undefined,
);

const isEditorLoading = computed(
  () =>
    !!selectedTerminologyId.value &&
    !selectedTerminologyData.value &&
    isDetailLoading.value,
);

const currentTerminologyForms = computed(() => {
  const key = selectedTerminology.value?.key;
  if (!key) return {};
  return definitionForms.value[key] ?? {};
});

const emptySelectedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter(
    (id) =>
      id !== defaultLocale.value?.id &&
      !(currentTerminologyForms.value[id] ?? "").trim(),
  ),
);

const canFillEmptyDefinitions = computed(() => {
  const id = defaultLocale.value?.id;
  return (
    !isSaving.value &&
    !!selectedTerminology.value &&
    !!id &&
    !!currentTerminologyForms.value[id]?.trim() &&
    emptySelectedLocaleIds.value.length > 0
  );
});

function fillEmptyDefinitions() {
  const sourceId = defaultLocale.value?.id;
  const terminologyId = selectedTerminology.value?.key;
  if (!canFillEmptyDefinitions.value || !sourceId || terminologyId == null)
    return;
  const source = currentTerminologyForms.value[sourceId] ?? "";
  for (const localeId of emptySelectedLocaleIds.value) {
    setDefinitionForm(String(terminologyId), localeId, source);
  }
}

function setDefinitionForm(
  terminologyId: string,
  localeId: string,
  value: string | undefined,
) {
  if (value === undefined) return;
  if (!definitionForms.value[terminologyId]) {
    definitionForms.value[terminologyId] = {};
  }
  definitionForms.value[terminologyId][String(localeId)] = value;
}

const definitionStore = useDefinitionStore();
const { create: createDefinitionEndpoint, update: updateDefinitionEndpoint } =
  definitionStore;
const { mutateAsync: createDefinition } = createDefinitionEndpoint;
const { mutateAsync: updateDefinition } = updateDefinitionEndpoint;

const toast = useToast();

async function handleSave() {
  const terminology = selectedTerminologyData.value;
  if (!terminology?.id || isSaving.value) return;

  const terminologyId = terminology.id;
  const localeIds = [...selectedUnsavedLocaleIds.value];
  if (!localeIds.length) return;
  await saveDefinitions(
    localeIds.map((localeId) => ({
      terminologyId,
      localeId,
      translation: definitionForms.value[terminologyId]?.[localeId] ?? "",
    })),
    t("terminologies.definitionLabel", { term: terminology.term ?? "" }),
  );
}

async function saveDefinitions(
  changes: {
    terminologyId: string;
    localeId: string;
    translation: string;
  }[],
  label: string,
) {
  if (!changes.length || isSaving.value) return;

  isSaving.value = true;
  try {
    const results = await Promise.allSettled(
      changes.map(async ({ terminologyId, localeId, translation }) => {
        const existing = knownTerminologies.value[
          terminologyId
        ]?.definitions?.find(
          (definition: Definition) => definition.localeId === String(localeId),
        );

        if (existing) {
          const response = await updateDefinition({
            id: existing.id ?? "",
            translation,
          });
          return response.definition;
        } else {
          const response = await createDefinition({
            terminologyId,
            localeId: String(localeId),
            translation,
          });
          return response.definition;
        }
      }),
    );

    for (const [index, result] of results.entries()) {
      const change = changes[index];
      if (result.status === "fulfilled" && change) {
        const { terminologyId, localeId: id, translation } = change;
        savedDefinitions.value[terminologyId] ??= {};
        savedDefinitions.value[terminologyId][id] = translation;
        if (result.value?.id && knownTerminologies.value[terminologyId]) {
          const terminology = knownTerminologies.value[terminologyId];
          terminology.definitions = [
            ...(terminology.definitions ?? []).filter(
              (item) => item.localeId !== id,
            ),
            result.value,
          ];
        }
      }
    }

    const failedLanguages = results.flatMap((result, index) => {
      if (result.status !== "rejected") return [];
      const change = changes[index];
      if (!change) return [];
      const { terminologyId, localeId } = change;
      return [
        `${knownTerminologies.value[terminologyId]?.term ?? terminologyId}: ${localeOptions.value.find((locale) => locale.value === localeId)?.label ?? localeId}`,
      ];
    });
    const failed = failedLanguages.length;
    if (failed === 0) {
      toast.add(t("terminologies.saved", { label }), { variant: "success" });
    } else {
      toast.add(
        t("terminologies.partialSave", {
          saved: results.length - failed,
          total: results.length,
          failures: failedLanguages.join(", "),
        }),
        { variant: failed === results.length ? "danger" : "warning" },
      );
    }

    await Promise.all([refetch(), refetchDetail()]);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="isLoading && !data" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">{{ t("terminologies.loading") }}</div>
  </div>

  <div
    v-else-if="error && !data"
    class="bg-red-50 border border-red-200 rounded-lg p-4"
  >
    <p class="text-red-800">
      {{ t("terminologies.loadFailed", { error: error.message }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </div>

  <section
    v-else-if="data"
    class="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
    :aria-label="t('terminologies.workspace')"
    :aria-busy="isFetching"
  >
    <div
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-700"
    >
      <div class="w-full sm:w-72" @keydown="onSearchKeydown">
        <Input
          v-model="search"
          dense
          type="search"
          :placeholder="t('terminologies.searchTerms')"
          :aria-label="t('terminologies.searchTerms')"
          shortcut="/"
        />
      </div>
      <TerminologyFiltersPopover
        v-model:locale-ids="selectedLocaleIds"
        :locale-options="localeOptions"
        :active-count="activeFilterCount"
        :disabled="isSaving"
        @clear="clearFilters"
      />
      <Chip
        dense
        variant="secondary"
        :title="selectedLanguageLabels.join(', ')"
      >
        {{ languageSummary }}
      </Chip>
      <span
        v-if="isFetching && !isSaving"
        role="status"
        class="ml-auto text-xs text-neutral-500"
      >
        {{ t("common.refreshing") }}
      </span>
      <span v-else-if="error" role="alert" class="ml-auto text-xs text-red-600">
        {{ t("common.refreshFailed") }}
        <button
          type="button"
          class="cursor-pointer underline"
          @click="() => refetch()"
        >
          {{ t("common.retry") }}
        </button>
      </span>
    </div>
    <div class="relative flex flex-1 min-h-0 overflow-hidden">
      <SplitView
        :items="splitViewItems"
        :selected="selectedTerminology"
        :total="terminologyTotal"
        class="editor-split-view w-full flex-1 min-w-0 gap-0 border-0 rounded-none grid-cols-[minmax(200px,250px)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:grid-rows-[150px_minmax(0,1fr)]"
        @select="selectTerminology"
      >
        <template #empty>
          <p class="px-4 py-2 text-sm text-neutral-500">
            {{ t("terminologies.noMatches") }}
          </p>
        </template>
        <template #item="{ item }">
          <span class="flex min-w-0 w-full items-center justify-between gap-3">
            <span class="truncate" :title="item.label">{{ item.label }}</span>
            <span
              v-if="hasUnsavedDefinitions(String(item.key))"
              class="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-300"
              :title="t('terminologies.unsavedDefinitions')"
              >{{ t("common.unsaved") }}</span
            >
            <Tooltip
              v-else-if="
                !hasUnsavedDefinitions(String(item.key)) &&
                isMissingDefinitions(item)
              "
              :content="t('entries.missingTranslations')"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full bg-rose-400"
                :aria-label="t('entries.missingTranslations')"
              />
            </Tooltip>
          </span>
        </template>
        <template #header="{ item }">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="min-w-0 font-semibold break-all">
                {{ item?.label ?? t("terminologies.selectTerminology") }}
              </h2>
              <p
                v-if="selectedTerminologyData?.description"
                class="mt-1 line-clamp-2 text-sm text-neutral-500"
              >
                {{ selectedTerminologyData.description }}
              </p>
            </div>
            <BaseActionButtons
              v-if="selectedTerminologyData"
              :key="selectedTerminologyData.id ?? undefined"
              :disabled="isSaving"
              :edit-label="t('terminologies.edit')"
              :delete-label="t('terminologies.delete')"
              @edit="editDialogItem = selectedTerminologyData"
              @delete="deleteDialogItem = selectedTerminologyData"
            />
          </div>
        </template>
        <template #default="{ item }">
          <div
            v-if="item && isEditorLoading"
            role="status"
            class="flex h-full items-center justify-center text-sm text-neutral-500"
          >
            {{ t("terminologies.loadingTerminology") }}
          </div>
          <div
            v-else-if="item && detailError && !selectedTerminologyData"
            role="alert"
            class="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-600"
          >
            {{ t("terminologies.terminologyLoadFailed") }}
            <Button ghost dense @click="() => refetchDetail()">{{
              t("common.retry")
            }}</Button>
          </div>
          <div
            v-else-if="item && selectedLocaleIds.length > 0"
            class="mx-auto flex w-full flex-col gap-6"
          >
            <div
              v-for="localeId in orderedSelectedLocaleIds"
              :key="localeId"
              :class="
                localeId === defaultLocale?.id
                  ? 'rounded-lg border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800 dark:bg-primary-950/30'
                  : ''
              "
            >
              <div
                class="flex flex-wrap items-center h-10 justify-between gap-2"
              >
                <label
                  :for="`terminology-${item.key}-${localeId}`"
                  class="flex items-center gap-2 text-sm"
                >
                  {{
                    localeOptions.find((locale) => locale.value === localeId)
                      ?.label
                  }}
                  <Badge v-if="localeId === defaultLocale?.id">{{
                    t("common.default")
                  }}</Badge>
                  <span
                    v-if="isDefinitionDirty(String(item.key), localeId)"
                    class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    >{{ t("common.unsaved") }}</span
                  >
                </label>
                <div class="flex items-center gap-2">
                  <Button
                    v-if="localeId === defaultLocale?.id"
                    type="button"
                    ghost
                    dense
                    icon="copy"
                    :disabled="!canFillEmptyDefinitions"
                    @click="fillEmptyDefinitions"
                  >
                    {{ t("entries.copyEmpty") }}
                  </Button>
                  <Button
                    v-if="!contextOpen || activeLocaleId !== localeId"
                    type="button"
                    ghost
                    icon="sidebar"
                    :aria-label="
                      t('context.openFor', {
                        language:
                          localeOptions.find(
                            (locale) => locale.value === localeId,
                          )?.label ?? '',
                      })
                    "
                    @click="openContext(localeId)"
                  />
                  <span
                    v-else
                    class="inline-flex shrink-0 items-center gap-2 rounded-md text-xs font-medium text-primary-600"
                    aria-live="polite"
                  >
                    {{ t("context.active") }}
                  </span>
                </div>
              </div>
              <Textarea
                :id="`terminology-${item.key}-${localeId}`"
                :aria-label="
                  localeOptions.find((locale) => locale.value === localeId)
                    ?.label
                "
                :readonly="isSaving"
                :model-value="currentTerminologyForms[String(localeId)] ?? ''"
                :placeholder="t('terminologies.definitionPlaceholder')"
                @update:model-value="
                  setDefinitionForm(String(item.key), localeId, $event)
                "
                @focusin="activeLocaleId = localeId"
              />
            </div>
          </div>

          <div
            v-else
            class="flex h-full items-center justify-center text-center text-neutral-500 text-sm"
          >
            {{
              item
                ? t("terminologies.selectLanguagesHint")
                : t("terminologies.selectTerminologyHint")
            }}
          </div>
        </template>
      </SplitView>
      <TerminologyContextPanel
        v-if="contextOpen && activeLocaleId && selectedTerminology"
        class="flex-[0_0_320px] min-w-0 max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:w-[min(340px,100%)] max-[1100px]:z-20 max-[1100px]:shadow-[-8px_0_24px_rgb(0_0_0/0.08)]"
        :terminology-id="String(selectedTerminology.key)"
        :locale-id="activeLocaleId"
        :locale-name="activeLocaleName"
        @close="contextOpen = false"
      />
    </div>
    <div
      class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-2 dark:border-neutral-700"
    >
      <span class="text-sm text-neutral-500">
        <template v-if="terminologyTotal !== undefined"
          >{{
            t(
              "terminologies.count",
              { count: terminologyTotal },
              terminologyTotal,
            )
          }}
          ·
        </template>
        {{
          t(
            "terminologies.selectedLanguages",
            { count: selectedLocaleIds.length },
            selectedLocaleIds.length,
          )
        }}
        <span
          v-if="unsavedLocaleIds.length"
          class="ml-2 text-amber-700 dark:text-amber-300"
          >{{ t("common.unsavedCount", { count: unsavedLocaleIds.length })
          }}{{
            unsavedLocaleIds.length > selectedUnsavedLocaleIds.length
              ? t("common.hiddenLanguages")
              : ""
          }}</span
        >
      </span>
      <div class="flex shrink-0 items-center gap-2">
        <Button
          primary
          :disabled="
            !selectedTerminologyData ||
            !selectedUnsavedLocaleIds.length ||
            isSaving
          "
          @click="handleSave"
        >
          {{ isSaving ? t("common.saving") : t("common.saveChanges") }}
        </Button>
      </div>
    </div>
  </section>

  <TerminologyFormDialog
    :open="showCreateDialog"
    @close="showCreateDialog = false"
    @created="handleCreated"
  />
  <TerminologyFormDialog
    :open="!!editDialogItem"
    :item="editDialogItem"
    @close="editDialogItem = undefined"
    @updated="handleTerminologyUpdated"
  />
  <TerminologyDeleteDialog
    :open="!!deleteDialogItem"
    :item="deleteDialogItem"
    @close="deleteDialogItem = undefined"
    @deleted="handleDeleted"
  />
</template>

<style scoped>
.editor-split-view :deep(> *) {
  grid-column: span 1;
}
</style>
