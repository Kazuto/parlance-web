<script setup lang="ts">
import {
  Alert,
  Button,
  SplitView,
  type SplitViewItem,
  Input,
  Chip,
} from "@thkzt/eunoia";
import { useEditorLocales } from "~/composables/editor/useEditorLocales";
import {
  useTerminologyDetail,
  useTerminologyFeed,
} from "~/composables/terminology/useTerminologyFeed";
import { watchDebounced, useMediaQuery } from "@vueuse/core";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";
import type { Definition } from "~/lib/api/schemas/parlance/v1/DefinitionSchema";

const { t } = useI18n();
const showCreateDialog = ref(false);
const deleteDialogItem = ref<Terminology>();
const editDialogItem = ref<Terminology>();

usePage(() => ({
  width: "extra-wide",
  layout: "workspace",
  title: t("nav.glossary"),
  description: t("terminologies.description"),
  showHeader: false,
  primaryAction: {
    content: t("terminologies.create"),
    icon: "plus",
    onClick: () => (showCreateDialog.value = true),
  },
}));

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

const selectedLocaleIds = ref<string[]>([]);
const {
  defaultLocale,
  defaultLocaleIds,
  localeOptions,
  localeOption,
  orderedSelectedLocaleIds,
  selectedLanguageLabels,
  languageSummary,
  languagesFiltered,
} = useEditorLocales(() => localeData.value?.locales, selectedLocaleIds);
const storedFilters = useStoredFilters();

// Initialize selectedLocaleIds once when locales are loaded, with the languages
// last picked here or on the entries page.
watch(
  () => localeData.value?.locales,
  (locales) => {
    if (locales && selectedLocaleIds.value.length === 0) {
      const stored = localeIdsFromCodes(locales, storedFilters.languages.value);
      selectedLocaleIds.value = stored.length
        ? stored
        : [...defaultLocaleIds.value];
    }
  },
  { immediate: true },
);

watch(
  selectedLocaleIds,
  (ids) => {
    const locales = localeData.value?.locales ?? [];
    storedFilters.languages.value = ids
      .map((id) => locales.find((locale) => locale.id === id)?.code)
      .filter((code): code is string => !!code);
  },
  { deep: true },
);

watch(
  selectedLocaleIds,
  (ids) => {
    targetLocaleIds.value = [...ids];
  },
  { deep: true },
);

const activeFilterCount = computed(() => Number(languagesFiltered.value));

function clearFilters() {
  selectedLocaleIds.value = [...defaultLocaleIds.value];
}

const selectedTerminology = ref<SplitViewItem>();
// Links (e.g. from the dashboard activity) can open the page with a search via ?q=.
const route = useRoute();
const search = ref(typeof route.query.q === "string" ? route.query.q : "");
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
  () => localeOption(activeLocaleId.value)?.label ?? "",
);

// The row button toggles: on the language already shown it closes the panel.
function toggleContext(localeId: string) {
  if (contextOpen.value && activeLocaleId.value === localeId) {
    contextOpen.value = false;
    return;
  }
  activeLocaleId.value = localeId;
  contextOpen.value = true;
}

// Typing in another language moves an open panel along, without opening it.
function onRowFocus(localeId: string) {
  if (contextOpen.value) activeLocaleId.value = localeId;
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

function missingCount(item: SplitViewItem) {
  const missing = (item.missingLocaleIds as string[] | undefined) ?? [];
  return selectedLocaleIds.value.filter((id) => missing.includes(id)).length;
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

const showDiscardDialog = ref(false);

function discardChanges() {
  showDiscardDialog.value = false;
  for (const terminologyId of Object.keys(definitionForms.value)) {
    definitionForms.value[terminologyId] = {
      ...(savedDefinitions.value[terminologyId] ?? {}),
    };
  }
}

// Changes on the open term go right away; others are out of sight, so confirm.
function requestDiscardAll() {
  const onlyCurrent = allUnsavedDefinitions.value.every(
    (change) => change.terminologyId === selectedTerminologyId.value,
  );
  if (onlyCurrent) discardChanges();
  else showDiscardDialog.value = true;
}

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

// Counts what is typed, not only what is saved, so the header follows along.
const definedCount = computed(
  () =>
    selectedLocaleIds.value.filter((id) =>
      (currentTerminologyForms.value[id] ?? "").trim(),
    ).length,
);

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

const { showSuccess, showError } = useErrorHelper();

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
        `${knownTerminologies.value[terminologyId]?.term ?? terminologyId}: ${localeOption(localeId)?.label ?? localeId}`,
      ];
    });
    const failed = failedLanguages.length;
    if (failed === 0) {
      showSuccess(t("terminologies.saved", { label }));
    } else {
      const message = t("terminologies.partialSave", {
        saved: results.length - failed,
        total: results.length,
        failures: failedLanguages.join(", "),
      });
      if (failed === results.length) {
        showError(message);
      } else {
        showSuccess(message);
      }
    }

    await Promise.all([refetch(), refetchDetail()]);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="isLoading && !data" class="flex items-center justify-center py-12">
    <div class="text-neutral-600 dark:text-neutral-400">
      {{ t("terminologies.loading") }}
    </div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("terminologies.loadFailed", { error: error.message }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <section
    v-else-if="data"
    class="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white squircle dark:border-white/5 dark:bg-neutral-900"
    :aria-label="t('terminologies.workspace')"
    :aria-busy="isFetching"
  >
    <div
      class="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 px-3.5 py-2 dark:border-white/5"
    >
      <div class="w-full sm:w-56" @keydown="onSearchKeydown">
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
        class="ml-auto text-xs text-neutral-500 dark:text-neutral-400"
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
        class="editor-split-view w-full flex-1 min-w-0 gap-0 border-0 rounded-none bg-transparent dark:bg-transparent grid-cols-[minmax(200px,250px)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:grid-rows-[150px_minmax(0,1fr)]"
        @select="selectTerminology"
      >
        <template #empty>
          <p class="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
            {{ t("terminologies.noMatches") }}
          </p>
        </template>
        <template #item="{ item }">
          <EditorListItem
            :label="item.label"
            :missing-count="missingCount(item)"
            :unsaved="hasUnsavedDefinitions(String(item.key))"
            :missing-label="
              t(
                'entries.missingCount',
                { count: missingCount(item) },
                missingCount(item),
              )
            "
          />
        </template>
        <template #header="{ item }">
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <h2 class="min-w-0 font-semibold break-all">
                {{ item?.label ?? t("terminologies.selectTerminology") }}
              </h2>
              <p
                v-if="selectedTerminologyData?.description"
                class="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400"
              >
                {{ selectedTerminologyData.description }}
              </p>
            </div>
            <div
              v-if="selectedTerminologyData"
              class="flex shrink-0 items-center gap-2"
            >
              <span
                class="mr-1.5 text-[11.5px] font-semibold whitespace-nowrap text-neutral-500 dark:text-neutral-400"
                >{{
                  t("terminologies.definedCount", {
                    done: definedCount,
                    total: selectedLocaleIds.length,
                  })
                }}</span
              >
              <BaseIconButton
                icon="pencil-simple"
                :label="t('terminologies.edit')"
                :disabled="isSaving"
                class="bg-neutral-100 dark:bg-white/5"
                @click="editDialogItem = selectedTerminologyData"
              />
              <BaseIconButton
                icon="trash"
                destructive
                :label="t('terminologies.delete')"
                :disabled="isSaving"
                class="bg-red-50 text-red-500 dark:bg-rose-500/15 dark:text-rose-300"
                @click="deleteDialogItem = selectedTerminologyData"
              />
            </div>
          </div>
        </template>
        <template #default="{ item }">
          <div
            v-if="item && isEditorLoading"
            role="status"
            class="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400"
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
            class="flex w-full flex-col gap-0.5 rounded-[22px] bg-neutral-100 p-1 squircle dark:bg-neutral-950"
          >
            <EditorTranslationRow
              v-for="localeId in orderedSelectedLocaleIds"
              :key="localeId"
              :input-id="`terminology-${item.key}-${localeId}`"
              :locale-name="localeOption(localeId)?.label ?? localeId"
              :locale-code="localeOption(localeId)?.code ?? ''"
              :is-default="localeId === defaultLocale?.id"
              :translated="!!(currentTerminologyForms[localeId] ?? '').trim()"
              :dirty="isDefinitionDirty(String(item.key), localeId)"
              :active="contextOpen && activeLocaleId === localeId"
              :readonly="isSaving"
              :placeholder="t('terminologies.definitionPlaceholder')"
              :model-value="currentTerminologyForms[localeId] ?? ''"
              @update:model-value="
                setDefinitionForm(String(item.key), localeId, $event)
              "
              @focus="onRowFocus(localeId)"
              @revert="
                setDefinitionForm(
                  String(item.key),
                  localeId,
                  savedDefinitions[String(item.key)]?.[localeId] ?? '',
                )
              "
              @open-context="toggleContext(localeId)"
            >
              <template v-if="localeId === defaultLocale?.id" #meta>
                <EditorCopyEmptyChip
                  :disabled="!canFillEmptyDefinitions"
                  @click="fillEmptyDefinitions"
                />
              </template>
            </EditorTranslationRow>
          </div>

          <div
            v-else
            class="flex h-full items-center justify-center text-center text-neutral-500 dark:text-neutral-400 text-sm"
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
        class="flex-[0_0_280px] min-w-0 max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:w-[min(340px,100%)] max-[1100px]:z-20 max-[1100px]:shadow-[-8px_0_24px_rgb(0_0_0/0.08)]"
        :terminology-id="String(selectedTerminology.key)"
        :locale-id="activeLocaleId"
        :locale-name="activeLocaleName"
        @close="contextOpen = false"
      />
    </div>
    <div
      class="flex min-h-13 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-2 pr-3.5 pl-5 dark:border-white/5"
    >
      <span class="text-xs text-neutral-500 dark:text-neutral-400">
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
          class="ml-2 text-yellow-700 dark:text-amber-300"
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
          type="button"
          ghost
          :disabled="!allUnsavedCount || isSaving"
          @click="requestDiscardAll"
        >
          {{ t("common.discardAll") }}
        </Button>
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

  <EditorDiscardDialog
    :open="showDiscardDialog"
    :count="allUnsavedCount"
    @close="showDiscardDialog = false"
    @confirm="discardChanges"
  />
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
