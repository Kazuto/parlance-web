<script setup lang="ts">
import {
  Alert,
  Button,
  SplitView,
  type SplitViewItem,
  Tooltip,
  Dialog,
  Chip,
  Input,
} from "@thkzt/eunoia";
import { useEditorLocales } from "~/composables/editor/useEditorLocales";
import { useEntryDetail, useEntryFeed } from "~/composables/entry/useEntryFeed";
import { useEntryFilterQuery } from "~/composables/entry/useEntryFilterQuery";
import { watchDebounced, useMediaQuery } from "@vueuse/core";
import { useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import type { Localization } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

const queryClient = useQueryClient();
const historyQueryKey = api.entries.history.getQueryKey();
const { t } = useI18n();
const { can, canAll } = usePermission();
const canUpdate = computed(() => can.value("update_entry"));
const showCreateDialog = ref(false);
const deleteDialogItem = ref<Entry>();
const editDialogItem = ref<Entry>();

function handleEntryUpdated(entry: Entry) {
  if (entry.id) {
    // Keep the loaded localizations; saving relies on them to update, not duplicate.
    const known = knownEntries.value[entry.id];
    knownEntries.value[entry.id] = {
      ...entry,
      localizations: entry.localizations?.length
        ? entry.localizations
        : known?.localizations,
    };
    if (entry.id === selectedEntryId.value) refetchDetail();
  }
  if (entry.id && selectedEntry.value?.key === entry.id) {
    selectedEntry.value = { key: entry.id, label: entry.key ?? "" };
  }
}
const transferAction = ref<"import" | "export">("import");
const showTransferDialog = ref(false);

function openTransfer(action: "import" | "export") {
  transferAction.value = action;
  showTransferDialog.value = true;
}

usePage(() => ({
  width: "extra-wide",
  layout: "workspace",
  title: t("nav.entries"),
  description: t("entries.description"),
  showHeader: false,
  primaryAction: can.value("create_entry")
    ? {
        content: t("entries.create"),
        icon: "plus",
        onClick: () => (showCreateDialog.value = true),
      }
    : undefined,
  secondaryActions: [
    // Importing creates entries and overwrites translations.
    ...(canAll.value(["create_entry", "update_entry"])
      ? [
          {
            content: t("entries.import"),
            icon: "upload",
            onClick: () => openTransfer("import"),
          },
        ]
      : []),
    {
      content: t("entries.export"),
      icon: "download",
      onClick: () => openTransfer("export"),
    },
  ],
}));

const {
  data,
  entries: feedEntries,
  total: entryTotal,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  refetch,
  search: feedSearch,
  scopeIds,
  translationStatus,
  targetLocaleIds,
} = useEntryFeed(100);
const { options: scopeOptions, error: scopeError } = useScopeOptions();
const statusOptions = computed(() => [
  { label: t("entries.filterAll"), value: "" },
  { label: t("entries.filterMissing"), value: "missing" },
  { label: t("entries.filterComplete"), value: "complete" },
]);
const { data: localeData, pagination } = useLocaleList();

pagination.value.perPage = 100;

const selectedLocaleIds = ref<string[]>([]);
watch(
  selectedLocaleIds,
  (ids) => {
    targetLocaleIds.value = [...ids];
  },
  { deep: true },
);
const selectedEntry = ref<SplitViewItem>();
const search = ref("");
const isSaving = ref(false);
const showSaveAllDialog = ref(false);
const contextOpen = ref(true);
const contextTab = ref("terminology");
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

function openContext(localeId: string, tab?: string) {
  activeLocaleId.value = localeId;
  if (tab) contextTab.value = tab;
  contextOpen.value = true;
}

// The row button toggles: on the language already shown it closes the panel.
function toggleContext(localeId: string) {
  if (contextOpen.value && activeLocaleId.value === localeId) {
    contextOpen.value = false;
    return;
  }
  openContext(localeId);
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

useEntryFilterQuery({
  locales: computed(() => localeData.value?.locales),
  localeIds: selectedLocaleIds,
  scopeIds,
  status: translationStatus,
  search,
});
feedSearch.value = search.value || undefined;

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
const activeFilterCount = computed(
  () =>
    Number(languagesFiltered.value) +
    Number(scopeIds.value.length > 0) +
    Number(!!translationStatus.value),
);
const copiedKey = ref<string>();
let copiedKeyTimer: ReturnType<typeof setTimeout> | undefined;
async function copyKey(key: string) {
  try {
    await navigator.clipboard.writeText(key);
  } catch {
    return;
  }
  copiedKey.value = key;
  clearTimeout(copiedKeyTimer);
  copiedKeyTimer = setTimeout(() => (copiedKey.value = undefined), 1500);
}

function toggleScopeFilter(id: string) {
  if (isSaving.value) return;
  scopeIds.value = scopeIds.value.includes(id)
    ? scopeIds.value.filter((scopeId) => scopeId !== id)
    : [...scopeIds.value, id];
}

const selectedScopes = computed(() =>
  scopeIds.value.map((id) => {
    const option = scopeOptions.value.find((scope) => scope.value === id);
    return { id, label: option?.label ?? id, color: option?.color };
  }),
);
const selectedStatusLabel = computed(
  () =>
    statusOptions.value.find(
      (option) => option.value === translationStatus.value,
    )?.label ?? "",
);

function clearFilters() {
  selectedLocaleIds.value = [...defaultLocaleIds.value];
  scopeIds.value = [];
  translationStatus.value = "";
}

// A new entry sits at its alphabetical place, which may not be loaded yet; keep it
// selected until the user picks something else instead of falling back to the top.
const pinnedEntryId = ref<string>();

async function handleCreated(entry: Entry) {
  scopeIds.value = [];
  translationStatus.value = "";
  search.value = "";
  feedSearch.value = undefined;
  if (!entry.id) return;
  knownEntries.value[entry.id] = entry;
  pinnedEntryId.value = entry.id;
  selectedEntry.value = { key: entry.id, label: entry.key ?? "" };
}

function selectEntry(item: SplitViewItem) {
  if (isSaving.value) return;
  pinnedEntryId.value = undefined;
  selectedEntry.value = item;
}

// Entries ticked in the list for bulk scope edits. Kept across filter changes so
// entries can be gathered from several searches.
const MAX_BULK_ENTRIES = 1000;
const checkedEntryIds = ref<string[]>([]);
const showScopesDialog = ref(false);
const bulkLimitReached = computed(
  () => checkedEntryIds.value.length > MAX_BULK_ENTRIES,
);
const allLoadedChecked = computed(
  () =>
    splitViewItems.value.length > 0 &&
    splitViewItems.value.every((item) =>
      checkedEntryIds.value.includes(String(item.key)),
    ),
);

function checkAllLoaded() {
  checkedEntryIds.value = [
    ...new Set([
      ...checkedEntryIds.value,
      ...splitViewItems.value.map((item) => String(item.key)),
    ]),
  ];
}

function handleScopesUpdated(entryIds: string[]) {
  checkedEntryIds.value = [];
  if (selectedEntryId.value && entryIds.includes(selectedEntryId.value))
    refetchDetail();
}

async function handleDeleted(id: string) {
  checkedEntryIds.value = checkedEntryIds.value.filter(
    (entryId) => entryId !== id,
  );
  Reflect.deleteProperty(localizationForms.value, id);
  Reflect.deleteProperty(savedTranslations.value, id);
  Reflect.deleteProperty(knownEntries.value, id);
  pinnedEntryId.value = undefined;
  selectedEntry.value = undefined;
  await refetch();
}

// The panel starts on the source language, like the rows are ordered.
watch(
  [selectedLocaleIds, () => defaultLocale.value?.id],
  () => {
    if (
      !activeLocaleId.value ||
      !selectedLocaleIds.value.includes(activeLocaleId.value)
    ) {
      activeLocaleId.value = orderedSelectedLocaleIds.value[0];
    }
  },
  { deep: true },
);

const splitViewItems = computed((): SplitViewItem[] =>
  feedEntries.value
    .filter((entry) => !!entry.id)
    .map((entry: Entry) => ({
      key: entry.id ?? "",
      label: entry.key ?? "",
      missingLocaleIds: entry.missingLocaleIds ?? [],
      defaultTranslation: entry.defaultTranslation ?? "",
    })),
);

function missingCount(item: SplitViewItem) {
  const missing = (item.missingLocaleIds as string[] | undefined) ?? [];
  return selectedLocaleIds.value.filter((id) => missing.includes(id)).length;
}

watch(
  splitViewItems,
  (items) => {
    const id = selectedEntry.value?.key;
    if (id !== undefined && id === pinnedEntryId.value) return;
    if (!items.some((item) => item.key === id)) {
      selectedEntry.value = items[0];
    }
  },
  { immediate: true },
);

const selectedEntryId = computed(() =>
  selectedEntry.value ? String(selectedEntry.value.key) : undefined,
);
const {
  data: detailData,
  isLoading: isDetailLoading,
  error: detailError,
  refetch: refetchDetail,
} = useEntryDetail(selectedEntryId);

// localizationForms keyed by entryId -> localeId -> translation
const localizationForms = ref<Record<string, Record<string, string>>>({});
const savedTranslations = ref<Record<string, Record<string, string>>>({});
const knownEntries = ref<Record<string, Entry>>({});

watch(
  () => detailData.value?.entry,
  (detail) => {
    for (const entry of detail ? [detail] : []) {
      if (!entry.id) continue;
      knownEntries.value[entry.id] = {
        ...entry,
        localizations: [...(entry.localizations ?? [])],
      };
      const saved = Object.fromEntries(
        (entry.localizations ?? [])
          .filter((localization) => !!localization.localeId)
          .map((localization) => [
            String(localization.localeId),
            localization.translation ?? "",
          ]),
      );
      const previous = savedTranslations.value[entry.id] ?? {};
      const drafts = localizationForms.value[entry.id] ?? {};
      const next = { ...saved };
      for (const [localeId, value] of Object.entries(drafts)) {
        if (value !== (previous[localeId] ?? "")) next[localeId] = value;
      }
      localizationForms.value[entry.id] = next;
      savedTranslations.value[entry.id] = saved;
    }
  },
  { immediate: true },
);

function isTranslationDirty(entryId: string, localeId: string) {
  return (
    (localizationForms.value[entryId]?.[localeId] ?? "") !==
    (savedTranslations.value[entryId]?.[localeId] ?? "")
  );
}

function hasUnsavedTranslations(entryId: string) {
  return Object.keys(localizationForms.value[entryId] ?? {}).some((localeId) =>
    isTranslationDirty(entryId, localeId),
  );
}

const unsavedLocaleIds = computed(() => {
  const id = selectedEntry.value?.key;
  return id == null
    ? []
    : Object.keys(localizationForms.value[String(id)] ?? {}).filter(
        (localeId) => isTranslationDirty(String(id), localeId),
      );
});

const selectedUnsavedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter((localeId) =>
    unsavedLocaleIds.value.includes(localeId),
  ),
);

const allUnsavedTranslations = computed(() =>
  Object.entries(localizationForms.value).flatMap(([entryId, translations]) =>
    Object.entries(translations)
      .filter(([localeId]) => isTranslationDirty(entryId, localeId))
      .map(([localeId, translation]) => ({ entryId, localeId, translation })),
  ),
);
const allUnsavedCount = computed(() => allUnsavedTranslations.value.length);
registerUnsavedChanges("entry-translations", allUnsavedCount, isSaving);

const showDiscardDialog = ref(false);

function discardChanges() {
  showDiscardDialog.value = false;
  for (const entryId of Object.keys(localizationForms.value)) {
    localizationForms.value[entryId] = {
      ...(savedTranslations.value[entryId] ?? {}),
    };
  }
}

// Changes on the open entry go right away; others are out of sight, so confirm.
function requestDiscardAll() {
  const onlyCurrent = allUnsavedTranslations.value.every(
    (change) => change.entryId === selectedEntryId.value,
  );
  if (onlyCurrent) discardChanges();
  else showDiscardDialog.value = true;
}

const selectedEntryData = computed(() =>
  selectedEntryId.value ? knownEntries.value[selectedEntryId.value] : undefined,
);
// Hold the editor until the first load so typing can't race the saved values.
const isEditorLoading = computed(
  () =>
    !!selectedEntryId.value &&
    !selectedEntryData.value &&
    isDetailLoading.value,
);

const currentEntryForms = computed(() => {
  const key = selectedEntry.value?.key;

  if (!key) return {};

  return localizationForms.value[key] ?? {};
});

// Counts what is typed, not only what is saved, so the header follows along.
const translatedCount = computed(
  () =>
    selectedLocaleIds.value.filter((id) =>
      (currentEntryForms.value[id] ?? "").trim(),
    ).length,
);

const emptySelectedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter(
    (id) =>
      id !== defaultLocale.value?.id &&
      !(currentEntryForms.value[id] ?? "").trim(),
  ),
);

const canFillEmptyTranslations = computed(() => {
  const id = defaultLocale.value?.id;
  return (
    !isSaving.value &&
    !!selectedEntry.value &&
    !!id &&
    !!currentEntryForms.value[id]?.trim() &&
    emptySelectedLocaleIds.value.length > 0
  );
});

function fillEmptyTranslations() {
  const sourceId = defaultLocale.value?.id;
  const entryId = selectedEntry.value?.key;
  if (!canFillEmptyTranslations.value || !sourceId || entryId == null) return;
  const source = currentEntryForms.value[sourceId] ?? "";
  for (const localeId of emptySelectedLocaleIds.value) {
    setLocalizationForm(String(entryId), localeId, source);
  }
}

function setLocalizationForm(
  entryId: string,
  localeId: string,
  value: string | undefined,
) {
  if (value === undefined) return;

  if (!localizationForms.value[entryId]) {
    localizationForms.value[entryId] = {};
  }
  localizationForms.value[entryId][String(localeId)] = value;
}

const localizationStore = useLocalizationStore();
const {
  create: createLocalizationEndpoint,
  update: updateLocalizationEndpoint,
} = localizationStore;
const { mutateAsync: createLocalization } = createLocalizationEndpoint;
const { mutateAsync: updateLocalization } = updateLocalizationEndpoint;

const { showSuccess, showError } = useErrorHelper();

async function handleSave() {
  const entry = selectedEntryData.value;
  if (!entry?.id || isSaving.value) return;

  const entryId = entry.id;
  const localeIds = [...selectedUnsavedLocaleIds.value];
  if (!localeIds.length) return;
  await saveTranslations(
    localeIds.map((localeId) => ({
      entryId,
      localeId,
      translation: localizationForms.value[entryId]?.[localeId] ?? "",
    })),
    t("entries.translationLabel", { key: entry.key ?? "" }),
  );
}

async function handleSaveAll() {
  if (isSaving.value) return;
  showSaveAllDialog.value = false;
  await saveTranslations(
    [...allUnsavedTranslations.value],
    t("entries.translations"),
  );
}

async function saveTranslations(
  changes: { entryId: string; localeId: string; translation: string }[],
  label: string,
) {
  if (!changes.length || isSaving.value) return;

  isSaving.value = true;
  try {
    const results = await Promise.allSettled(
      changes.map(async ({ entryId, localeId, translation }) => {
        const existing = knownEntries.value[entryId]?.localizations?.find(
          (localization: Localization) =>
            localization.localeId === String(localeId),
        );

        if (existing) {
          const response = await updateLocalization({
            id: existing.id,
            translation,
          });
          return response.localization;
        } else {
          const response = await createLocalization({
            entryId,
            localeId: String(localeId),
            translation,
          });
          return response.localization;
        }
      }),
    );

    for (const [index, result] of results.entries()) {
      const change = changes[index];
      if (result.status === "fulfilled" && change) {
        const { entryId, localeId: id, translation } = change;
        savedTranslations.value[entryId] ??= {};
        savedTranslations.value[entryId][id] = translation;
        if (result.value?.id && knownEntries.value[entryId]) {
          const entry = knownEntries.value[entryId];
          entry.localizations = [
            ...(entry.localizations ?? []).filter(
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
      const { entryId, localeId } = change;
      return [
        `${knownEntries.value[entryId]?.key ?? entryId}: ${localeOption(localeId)?.label ?? localeId}`,
      ];
    });
    const failed = failedLanguages.length;
    if (failed === 0) {
      showSuccess(t("entries.saved", { label }));
    } else {
      const message = t("entries.partialSave", {
        saved: results.length - failed,
        total: results.length,
        failures: failedLanguages.join(", "),
      });
      if (failed === results.length) {
        showError(message);
      } else {
        showSuccess(message); // Partial success still shows as success with warning details
      }
    }

    await Promise.all([
      refetch(),
      refetchDetail(),
      queryClient.invalidateQueries({ queryKey: historyQueryKey }),
    ]);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="isLoading && !data" class="flex items-center justify-center py-12">
    <div class="text-neutral-600 dark:text-neutral-400">
      {{ t("entries.loading") }}
    </div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("entries.loadFailed", { error: error.message }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <section
    v-else-if="data"
    class="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white squircle dark:border-white/5 dark:bg-neutral-900"
    :aria-label="t('entries.workspace')"
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
          :placeholder="t('entries.searchKeys')"
          :aria-label="t('entries.searchKeys')"
          :title="t('entries.searchShortcut')"
          shortcut="/"
        />
      </div>
      <EntryFiltersPopover
        v-model:locale-ids="selectedLocaleIds"
        v-model:scope-ids="scopeIds"
        v-model:status="translationStatus"
        :locale-options="localeOptions"
        :scope-options="scopeOptions"
        :status-options="statusOptions"
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
      <ScopeChip
        v-for="scope in selectedScopes"
        :key="scope.id"
        dense
        removable
        :color="scope.color"
        @remove="scopeIds = scopeIds.filter((id) => id !== scope.id)"
      >
        {{ scope.label }}
      </ScopeChip>
      <Chip
        v-if="translationStatus"
        dense
        variant="secondary"
        removable
        @remove="translationStatus = ''"
      >
        {{ selectedStatusLabel }}
      </Chip>
      <span v-if="scopeError" class="text-xs text-red-600">{{
        t("scopes.loadFailed")
      }}</span>
      <span
        v-if="isFetching && !isFetchingNextPage && !isSaving"
        role="status"
        class="ml-auto text-xs text-neutral-500 dark:text-neutral-400"
      >
        {{ t("entries.refreshing") }}
      </span>
      <span v-else-if="error" role="alert" class="ml-auto text-xs text-red-600">
        {{ t("entries.refreshFailed") }}
        <button
          type="button"
          class="cursor-pointer underline"
          @click="() => refetch()"
        >
          {{ t("common.retry") }}
        </button>
      </span>
    </div>
    <div
      v-if="checkedEntryIds.length"
      class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-primary-200 bg-primary-50/60 px-4 py-1.5 text-sm text-neutral-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-neutral-100"
      role="region"
      :aria-label="t('entries.bulkActions')"
    >
      <span class="font-medium" aria-live="polite">{{
        t(
          "entries.bulkSelected",
          { count: checkedEntryIds.length },
          checkedEntryIds.length,
        )
      }}</span>
      <Button
        v-if="!allLoadedChecked"
        type="button"
        ghost
        dense
        :disabled="isSaving"
        @click="checkAllLoaded"
      >
        {{ t("entries.bulkSelectLoaded", { count: splitViewItems.length }) }}
      </Button>
      <Button
        type="button"
        ghost
        dense
        :disabled="isSaving"
        @click="checkedEntryIds = []"
      >
        {{ t("entries.bulkClear") }}
      </Button>
      <span v-if="bulkLimitReached" role="alert" class="text-xs text-red-600">
        {{ t("entries.bulkLimit", { max: MAX_BULK_ENTRIES }) }}
      </span>
      <Button
        type="button"
        primary
        dense
        icon="stack"
        class="ml-auto"
        :disabled="isSaving || bulkLimitReached"
        @click="showScopesDialog = true"
      >
        {{ t("entries.bulkEditScopes") }}
      </Button>
    </div>
    <div class="relative flex flex-1 min-h-0 overflow-hidden">
      <SplitView
        :items="splitViewItems"
        :selected="selectedEntry"
        virtual
        :has-more="hasNextPage"
        :loading="isFetchingNextPage"
        :total="entryTotal"
        :selectable="canUpdate"
        :selection="checkedEntryIds"
        class="editor-split-view w-full flex-1 min-w-0 gap-0 border-0 rounded-none bg-transparent dark:bg-transparent grid-cols-[minmax(200px,250px)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:grid-rows-[150px_minmax(0,1fr)]"
        @select="selectEntry"
        @end-reached="fetchNextPage()"
        @update:selection="checkedEntryIds = $event.map(String)"
      >
        <template #listFooter>
          <p
            v-if="isFetchingNextPage"
            role="status"
            class="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400"
          >
            {{ t("entries.loadingMore") }}
          </p>
        </template>
        <template #empty>
          <p class="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
            {{ t("entries.noMatches") }}
          </p>
        </template>
        <template #item="{ item }">
          <EditorListItem
            :label="item.label"
            :missing-count="missingCount(item)"
            :unsaved="hasUnsavedTranslations(String(item.key))"
            :missing-label="
              t(
                'entries.missingCount',
                { count: missingCount(item) },
                missingCount(item),
              )
            "
          >
            <template v-if="defaultLocale?.id" #tooltip>
              <EntryDefaultTranslation
                :translation="item.defaultTranslation as string"
                :locale-name="localeOption(defaultLocale.id)?.label ?? ''"
              />
            </template>
          </EditorListItem>
        </template>
        <template #header="{ item }">
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 class="min-w-0 font-mono font-semibold break-all">
                  <Tooltip
                    v-if="item?.label"
                    :content="
                      t(
                        copiedKey === item.label
                          ? 'terminologyHints.copied'
                          : 'entries.copyKey',
                      )
                    "
                  >
                    <button
                      type="button"
                      class="cursor-pointer rounded-sm text-left transition-colors hover:text-primary-600 focus-visible:text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:hover:text-primary-400 dark:focus-visible:text-primary-400"
                      :aria-label="`${item.label} – ${t('entries.copyKey')}`"
                      @click="copyKey(item.label)"
                    >
                      {{ item.label }}
                    </button>
                  </Tooltip>
                  <template v-else>{{ t("entries.selectEntry") }}</template>
                </h2>
                <div
                  v-if="selectedEntryData?.scopes?.length"
                  class="flex flex-wrap gap-1"
                >
                  <ScopeChip
                    v-for="scope in selectedEntryData.scopes"
                    :key="scope.id ?? undefined"
                    dense
                    :color="scope.color"
                    :active="!!scope.id && scopeIds.includes(scope.id)"
                    :title="
                      t(
                        scope.id && scopeIds.includes(scope.id)
                          ? 'entries.unfilterByScope'
                          : 'entries.filterByScope',
                        { scope: scope.name },
                      )
                    "
                    class="cursor-pointer"
                    @click="scope.id && toggleScopeFilter(scope.id)"
                    >{{ scope.name }}</ScopeChip
                  >
                </div>
                <button
                  v-else-if="selectedEntryData"
                  v-can="'update_entry'"
                  type="button"
                  class="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
                  :disabled="isSaving"
                  @click="editDialogItem = selectedEntryData"
                >
                  {{ t("entries.noScopes") }}
                </button>
              </div>
              <p
                v-if="selectedEntryData?.description"
                class="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400"
              >
                {{ selectedEntryData.description }}
              </p>
            </div>
            <div
              v-if="selectedEntryData"
              class="flex shrink-0 items-center gap-2"
            >
              <span
                class="mr-1.5 text-[11.5px] font-semibold whitespace-nowrap text-neutral-500 dark:text-neutral-400"
                >{{
                  t("entries.translatedCount", {
                    done: translatedCount,
                    total: selectedLocaleIds.length,
                  })
                }}</span
              >
              <BaseIconButton
                v-can="'update_entry'"
                icon="pencil-simple"
                :label="t('entries.edit')"
                :disabled="isSaving"
                class="bg-neutral-100 dark:bg-white/5"
                @click="editDialogItem = selectedEntryData"
              />
              <BaseIconButton
                v-can="'delete_entry'"
                icon="trash"
                destructive
                :label="t('actions.deleteEntry')"
                :disabled="isSaving"
                class="bg-red-50 text-red-500 dark:bg-rose-500/15 dark:text-rose-300"
                @click="deleteDialogItem = selectedEntryData"
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
            {{ t("entries.loadingEntry") }}
          </div>
          <div
            v-else-if="item && detailError && !selectedEntryData"
            role="alert"
            class="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-600"
          >
            {{ t("entries.entryLoadFailed") }}
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
              :input-id="`entry-${item.key}-${localeId}`"
              :locale-name="localeOption(localeId)?.label ?? localeId"
              :locale-code="localeOption(localeId)?.code ?? ''"
              :is-default="localeId === defaultLocale?.id"
              :translated="!!(currentEntryForms[localeId] ?? '').trim()"
              :dirty="isTranslationDirty(String(item.key), localeId)"
              :active="contextOpen && activeLocaleId === localeId"
              :readonly="isSaving || !canUpdate"
              :placeholder="t('entries.translationPlaceholder')"
              :model-value="currentEntryForms[localeId] ?? ''"
              @update:model-value="
                setLocalizationForm(String(item.key), localeId, $event)
              "
              @focus="onRowFocus(localeId)"
              @revert="
                setLocalizationForm(
                  String(item.key),
                  localeId,
                  savedTranslations[String(item.key)]?.[localeId] ?? '',
                )
              "
              @open-context="toggleContext(localeId)"
            >
              <template v-if="defaultLocale?.id" #meta>
                <EditorCopyEmptyChip
                  v-if="localeId === defaultLocale.id"
                  v-can="'update_entry'"
                  :disabled="!canFillEmptyTranslations"
                  @click="fillEmptyTranslations"
                />
                <EntryTermChip
                  v-else
                  :source-text="currentEntryForms[defaultLocale.id] ?? ''"
                  :locale-id="localeId"
                  :translation="currentEntryForms[localeId] ?? ''"
                  @open="openContext(localeId, 'terminology')"
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
                ? t("entries.selectLanguagesHint")
                : t("entries.selectEntryHint")
            }}
          </div>
        </template>
      </SplitView>
      <EntryContextPanel
        v-if="contextOpen && activeLocaleId && selectedEntry"
        v-model:tab="contextTab"
        class="flex-[0_0_280px] min-w-0 max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:w-[min(340px,100%)] max-[1100px]:z-20 max-[1100px]:shadow-[-8px_0_24px_rgb(0_0_0/0.08)]"
        :entry-id="String(selectedEntry.key)"
        :locale-id="activeLocaleId"
        :locale-name="activeLocaleName"
        :source-locale-name="localeOption(defaultLocale?.id)?.label ?? ''"
        :source-text="
          defaultLocale?.id ? (currentEntryForms[defaultLocale.id] ?? '') : ''
        "
        :translation="currentEntryForms[activeLocaleId] ?? ''"
        :is-default="activeLocaleId === defaultLocale?.id"
        @close="contextOpen = false"
      />
    </div>
    <div
      class="flex min-h-13 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-2 pr-3.5 pl-5 dark:border-white/5"
    >
      <span class="text-xs text-neutral-500 dark:text-neutral-400">
        <template v-if="entryTotal !== undefined"
          >{{ t("entries.count", { count: entryTotal }, entryTotal) }} ·
        </template>
        {{
          t(
            "entries.selectedLanguages",
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
      <div v-can="'update_entry'" class="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          ghost
          :disabled="!allUnsavedCount || isSaving"
          @click="requestDiscardAll"
        >
          {{ t("common.discardAll") }}
        </Button>
        <Button
          type="button"
          ghost
          :disabled="!allUnsavedCount || isSaving"
          @click="showSaveAllDialog = true"
        >
          {{
            allUnsavedCount
              ? t("common.saveAllCount", { count: allUnsavedCount })
              : t("common.saveAll")
          }}
        </Button>
        <Button
          primary
          :disabled="
            !selectedEntryData || !selectedUnsavedLocaleIds.length || isSaving
          "
          @click="handleSave"
        >
          {{ isSaving ? t("common.saving") : t("common.saveChanges") }}
        </Button>
      </div>
    </div>
  </section>
  <Dialog
    :open="showSaveAllDialog"
    :title="t('entries.saveAllTitle')"
    @close="showSaveAllDialog = false"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{
        t("entries.saveAllConfirm", {
          count: allUnsavedCount,
          entries: new Set(
            allUnsavedTranslations.map((change) => change.entryId),
          ).size,
        })
      }}
    </p>
    <div class="mt-6 flex justify-end gap-3">
      <Button type="button" ghost @click="showSaveAllDialog = false">{{
        t("common.cancel")
      }}</Button>
      <Button
        type="button"
        primary
        :disabled="!allUnsavedCount || isSaving"
        @click="handleSaveAll"
        >{{ t("common.saveAll") }}</Button
      >
    </div>
  </Dialog>
  <EditorDiscardDialog
    :open="showDiscardDialog"
    :count="allUnsavedCount"
    @close="showDiscardDialog = false"
    @confirm="discardChanges"
  />
  <EntryFormDialog
    :open="!!editDialogItem"
    :item="editDialogItem"
    @close="editDialogItem = undefined"
    @updated="handleEntryUpdated"
  />
  <EntryScopesDialog
    :open="showScopesDialog"
    :entry-ids="checkedEntryIds"
    @close="showScopesDialog = false"
    @updated="handleScopesUpdated"
  />
  <EntryTransferDialog
    :open="showTransferDialog"
    :action="transferAction"
    :locales="localeData?.locales ?? []"
    @close="showTransferDialog = false"
  />
  <EntryFormDialog
    :open="showCreateDialog"
    @close="showCreateDialog = false"
    @created="handleCreated"
  />
  <EntryDeleteDialog
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
