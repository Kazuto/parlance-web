<script setup lang="ts">
import {
  type ActionMenuItem,
  Alert,
  Button,
  SplitView,
  type SplitViewItem,
  Chip,
  Input,
} from "@thkzt/eunoia";
import { useEditorCommands } from "~/composables/editor/useEditorCommands";
import { useEditorLocales } from "~/composables/editor/useEditorLocales";
import { useEditorContextPanel } from "~/composables/editor/useEditorContextPanel";
import { useTranslationSuggestions } from "~/composables/editor/useTranslationSuggestions";
import { useTranslationDrafts } from "~/composables/editor/useTranslationDrafts";
import { useReviewActions } from "~/composables/editor/useReviewActions";
import { useEditorShortcuts } from "~/composables/editor/useEditorShortcuts";
import { useEntryDetail, useEntryFeed } from "~/composables/entry/useEntryFeed";
import { useEntryFilterQuery } from "~/composables/entry/useEntryFilterQuery";
import { useBulkTranslate } from "~/composables/entry/useBulkTranslate";
import { useEntryNavigation } from "~/composables/entry/useEntryNavigation";
import { useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import type { Localization } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

const queryClient = useQueryClient();
const historyQueryKey = api.entries.history.getQueryKey();
const { t } = useI18n();
const { can, canAll } = usePermission();
const canUpdate = computed(() => can.value("update_entry"));
const canReview = computed(() => can.value("review_entry"));
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
    ...(can.value("import_entry")
      ? [
          {
            content: t("entries.import"),
            icon: "upload",
            onClick: () => openTransfer("import"),
          },
        ]
      : []),
    ...(can.value("export_entry")
      ? [
          {
            content: t("entries.export"),
            icon: "download",
            onClick: () => openTransfer("export"),
          },
        ]
      : []),
    ...(can.value("delete_entry")
      ? [
          {
            content: t("entries.deletedEntries"),
            icon: "trash",
            onClick: () => navigateTo("/entries/deleted"),
          },
        ]
      : []),
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
  { label: t("entries.filterReview"), value: "review" },
  { label: t("entries.filterOutdated"), value: "outdated" },
]);
const { items: locales } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);

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
// Types out keys and their default texts from the list, showing by example that
// both can be searched; the accessible name says it in words.
const searchPlaceholder = useSearchExamples(
  () => feedEntries.value.map((entry) => [entry.key, entry.defaultTranslation]),
  search,
  () => t("entries.search"),
);
const showSaveAllDialog = ref(false);
const { onKeydown: onSearchKeydown } = useDebouncedSearch(
  search,
  (value) => (feedSearch.value = value),
  350,
);

useEntryFilterQuery({
  locales: computed(() => locales.value),
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
} = useEditorLocales(() => locales.value, selectedLocaleIds);
const {
  contextOpen,
  contextTab,
  activeLocaleId,
  activeLocaleName,
  openContext,
  toggleContext,
  onRowFocus,
} = useEditorContextPanel({
  selectedLocaleIds,
  orderedSelectedLocaleIds,
  defaultLocaleId: () => defaultLocale.value?.id,
  localeLabel: (id) => localeOption(id)?.label ?? "",
});
const activeFilterCount = computed(
  () =>
    Number(languagesFiltered.value) +
    Number(scopeIds.value.length > 0) +
    Number(!!translationStatus.value),
);

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
  forgetEntry(id);
  pinnedEntryId.value = undefined;
  selectedEntry.value = undefined;
  await refetch();
}

const showBulkDeleteDialog = ref(false);

async function handleBulkDeleted(ids: string[]) {
  checkedEntryIds.value = [];
  ids.forEach(forgetEntry);

  if (selectedEntryId.value && ids.includes(selectedEntryId.value)) {
    pinnedEntryId.value = undefined;
    selectedEntry.value = undefined;
  }

  await refetch();
}

const splitViewItems = computed((): SplitViewItem[] =>
  feedEntries.value
    .filter((entry) => !!entry.id)
    .map((entry: Entry) => ({
      key: entry.id ?? "",
      label: entry.key ?? "",
      missingLocaleIds: entry.missingLocaleIds ?? [],
      draftLocaleIds: entry.draftLocaleIds ?? [],
      outdatedLocaleIds: entry.outdatedLocaleIds ?? [],
      defaultTranslation: entry.defaultTranslation ?? "",
    })),
);

function missingCount(item: SplitViewItem) {
  const missing = (item.missingLocaleIds as string[] | undefined) ?? [];

  return selectedLocaleIds.value.filter((id) => missing.includes(id)).length;
}

function draftCount(item: SplitViewItem) {
  const drafts = (item.draftLocaleIds as string[] | undefined) ?? [];

  return selectedLocaleIds.value.filter((id) => drafts.includes(id)).length;
}

function outdatedCount(item: SplitViewItem) {
  const outdated = (item.outdatedLocaleIds as string[] | undefined) ?? [];

  return selectedLocaleIds.value.filter((id) => outdated.includes(id)).length;
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

const localizationStore = useLocalizationStore();
const {
  forms: localizationForms,
  saved: savedTranslations,
  known: knownEntries,
  isSaving,
  showDiscardDialog,
  register: registerEntry,
  forget: forgetEntry,
  setForm: setLocalizationForm,
  isDirty: isTranslationDirty,
  hasUnsaved: hasUnsavedTranslations,
  currentForms: currentEntryForms,
  unsavedLocaleIds,
  allUnsaved: allUnsavedTranslations,
  allUnsavedCount,
  discardChanges,
  requestDiscardAll,
  save: saveTranslations,
} = useTranslationDrafts<Entry, Localization>({
  name: "entry-translations",
  selectedId: selectedEntryId,
  rows: (entry) => entry.localizations,
  setRows: (entry, localizations) => (entry.localizations = localizations),
  upsert: async ({ itemId, localeId, translation }, existing) =>
    existing
      ? (
          await localizationStore.update.mutateAsync({
            id: existing.id,
            translation,
          })
        ).localization
      : (
          await localizationStore.create.mutateAsync({
            entryId: itemId,
            localeId,
            translation,
          })
        ).localization,
  describe: ({ itemId, localeId }, entry) =>
    `${entry?.key ?? itemId}: ${localeOption(localeId)?.label ?? localeId}`,
  messages: { saved: "entries.saved", partial: "entries.partialSave" },
  afterSave: () =>
    Promise.all([
      refetch(),
      refetchDetail(),
      queryClient.invalidateQueries({ queryKey: historyQueryKey }),
    ]),
});

watch(
  () => detailData.value?.entry,
  (entry) => {
    if (entry) registerEntry(entry);
  },
  { immediate: true },
);

const selectedUnsavedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter((localeId) =>
    unsavedLocaleIds.value.includes(localeId),
  ),
);

const {
  isReviewing,
  rejecting,
  approve: approveTranslations,
  requestReject,
  requestRejectMany,
  confirmReject,
} = useReviewActions({
  review: () => localizationStore.review,
  request: (entryIds, localeIds, decision, details) => ({
    entryIds,
    localeIds,
    decision,
    comment: details.comment,
    skipApproved: details.onlyDrafts,
    confirmOutdated: details.confirmOutdated,
  }),
  afterReview: () =>
    Promise.all([
      refetch(),
      refetchDetail(),
      queryClient.invalidateQueries({ queryKey: historyQueryKey }),
    ]),
});

// The saved translation of an entry in a language, with its review state.
function savedLocalization(entryId: string, localeId: string) {
  return knownEntries.value[entryId]?.localizations?.find(
    (localization) => localization.localeId === localeId,
  );
}

// Drafts of the open entry in the shown languages, which can be approved at once.
const reviewableLocaleIds = computed(() => {
  const entryId = selectedEntryId.value;

  if (!entryId) return [];

  return selectedLocaleIds.value.filter(
    (localeId) =>
      savedLocalization(entryId, localeId)?.status === "REVIEW_STATUS_DRAFT" &&
      !isTranslationDirty(entryId, localeId),
  );
});

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

const {
  enabled: translationEnabled,
  pending: isTranslating,
  suggest: suggestTranslations,
  resultFor: suggestionFor,
  isWaitingFor: isTranslatingLocale,
  isEntryWaiting,
} = useTranslationSuggestions();
const canMachineTranslate = computed(
  () =>
    translationEnabled.value &&
    canAll.value(["update_entry", "use_machine_translation"]),
);

// The server translates the saved default text, so unsaved edits to it must be
// saved first.
const isSourceUnsaved = computed(() => {
  const entryId = selectedEntry.value?.key;
  const sourceId = defaultLocale.value?.id;

  return (
    entryId != null &&
    !!sourceId &&
    isTranslationDirty(String(entryId), sourceId)
  );
});

// Why "fill empty languages" can't run right now, if it can't.
const fillEmptyBlocker = computed(() => {
  const sourceId = defaultLocale.value?.id;

  if (!sourceId || !currentEntryForms.value[sourceId]?.trim())
    return t("entries.noSourceText");
  if (!emptySelectedLocaleIds.value.length)
    return t("entries.noEmptyLanguages");

  return undefined;
});

// Actions on the whole entry: they affect every selected language, so they sit
// in the entry header rather than on a language row.
const entryActions = computed<ActionMenuItem[]>(() => {
  const items: ActionMenuItem[] = [];
  const busy = isSaving.value;

  if (can.value("update_entry")) {
    if (canMachineTranslate.value) {
      const hint = isTranslating.value
        ? t("entries.translating")
        : (fillEmptyBlocker.value ??
          (isSourceUnsaved.value
            ? t("entries.translateSaveSourceFirst")
            : undefined));

      items.push({
        value: "translate",
        label: t("entries.aiTranslateEmpty"),
        icon: "sparkle",
        hint,
        disabled: busy || !!hint,
      });
    }

    items.push(
      {
        value: "copy",
        label: t("entries.copyDefaultToEmpty"),
        icon: "copy",
        hint: fillEmptyBlocker.value,
        disabled: busy || !!fillEmptyBlocker.value,
      },
      {
        value: "edit",
        label: t("entries.edit"),
        icon: "pencil-simple",
        disabled: busy,
      },
    );
  }

  if (canReview.value) {
    items.push({
      value: "approve",
      label: t("review.approveShown"),
      icon: "seal-check",
      hint: reviewableLocaleIds.value.length
        ? undefined
        : t("review.nothingToApprove"),
      disabled: busy || isReviewing.value || !reviewableLocaleIds.value.length,
    });
  }

  if (can.value("delete_entry")) {
    items.push({
      value: "delete",
      label: t("actions.deleteEntry"),
      icon: "trash",
      variant: "danger",
      divider: items.length > 0,
      disabled: busy,
    });
  }

  return items;
});

function onEntryAction(action: string) {
  const entry = selectedEntryData.value;

  if (!entry) return;
  if (action === "approve")
    approveTranslations([entry.id ?? ""], reviewableLocaleIds.value);
  else if (action === "translate") translateEmptyTranslations();
  else if (action === "copy") fillEmptyTranslations();
  else if (action === "edit") editDialogItem.value = entry;
  else if (action === "delete") deleteDialogItem.value = entry;
}

async function translateEmptyTranslations() {
  const entryId = selectedEntry.value?.key;

  if (
    !canFillEmptyTranslations.value ||
    isSourceUnsaved.value ||
    entryId == null
  )
    return;

  const key = String(entryId);

  try {
    const suggestions = await suggestTranslations(key, [
      ...emptySelectedLocaleIds.value,
    ]);

    for (const { localeId, translation } of suggestions) {
      // Text typed while waiting stays.
      if (!localeId || !translation) continue;
      if ((localizationForms.value[key]?.[localeId] ?? "").trim()) continue;
      setLocalizationForm(key, localeId, translation);
    }
  } catch (error) {
    showError(error);
  }
}

const {
  progress: bulkTranslation,
  blocker: bulkTranslateBlocker,
  copyBlocker: bulkCopyBlocker,
  run: runBulkTranslation,
  stop: stopBulkTranslation,
} = useBulkTranslate({
  entryIds: checkedEntryIds,
  selectedLocaleIds,
  sourceLocaleId: () => defaultLocale.value?.id,
  drafts: {
    forms: localizationForms,
    saved: savedTranslations,
    register: registerEntry,
    isDirty: isTranslationDirty,
    setForm: setLocalizationForm,
  },
  suggest: suggestTranslations,
});

const { showError, getErrorMessage } = useErrorHelper();

async function handleSave() {
  const entry = selectedEntryData.value;

  if (!entry?.id || isSaving.value) return;

  const entryId = entry.id;
  const localeIds = [...selectedUnsavedLocaleIds.value];

  if (!localeIds.length) return;
  await saveTranslations(
    localeIds.map((localeId) => ({
      itemId: entryId,
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

// Puts an older text from the history back into the field, as an unsaved change.
function applyHistoryText(text: string) {
  const entryId = selectedEntryId.value;
  const localeId = activeLocaleId.value;

  if (!entryId || !localeId || isSaving.value || !canUpdate.value) return;

  setLocalizationForm(entryId, localeId, text);
  nextTick(() => document.getElementById(fieldId(entryId, localeId))?.focus());
}

const fieldId = (entryId: string, localeId: string) =>
  `entry-${entryId}-${localeId}`;

// The language whose field has the focus, if it belongs to the open entry.
function focusedLocaleId() {
  const entryId = selectedEntryId.value;
  const id = document.activeElement?.id ?? "";
  const prefix = entryId ? fieldId(entryId, "") : undefined;

  return prefix && id.startsWith(prefix) ? id.slice(prefix.length) : undefined;
}

const navigation = useEntryNavigation({
  items: splitViewItems,
  selected: selectedEntry,
  select: selectEntry,
  hasMore: () => !!hasNextPage.value,
  loadMore: () => fetchNextPage(),
  ready: () => !isEditorLoading.value && !!selectedEntryData.value,
  fieldId,
  focusedLocaleId,
});

async function saveAndNext() {
  if (isSaving.value) return;
  await handleSave();
  // A failed save keeps the entry open with what is left to save.
  if (!selectedUnsavedLocaleIds.value.length) await navigation.next();
}

// Approves every draft of the open entry in the shown languages.
function approveShown() {
  const entryId = selectedEntryId.value;

  if (!entryId || !canReview.value || isSaving.value || isReviewing.value)
    return;
  if (!reviewableLocaleIds.value.length) return;

  approveTranslations([entryId], reviewableLocaleIds.value);
}

function copySourceTo(localeId: string | undefined) {
  const entryId = selectedEntryId.value;
  const sourceId = defaultLocale.value?.id;

  if (!entryId || !localeId || !sourceId || localeId === sourceId) return;
  if (isSaving.value || !canUpdate.value) return;

  setLocalizationForm(
    entryId,
    localeId,
    currentEntryForms.value[sourceId] ?? "",
  );
}

useEditorShortcuts({
  save: () => canUpdate.value && handleSave(),
  saveAndNext: () => canUpdate.value && saveAndNext(),
  previous: () => !isSaving.value && navigation.previous(),
  next: () => !isSaving.value && navigation.next(),
  approveAll: approveShown,
  copySource: () => copySourceTo(focusedLocaleId()),
});

// The palette takes the focus once it shows, so the language its commands act on
// is read the moment it opens.
const paletteLocaleId = ref<string>();
const searchBox = useTemplateRef<HTMLElement>("searchBox");
const { open: paletteOpen } = useEditorCommands({
  entryActions,
  entries: splitViewItems,
  statusOptions,
  canSave: () =>
    canUpdate.value &&
    !!selectedEntryData.value &&
    !!selectedUnsavedLocaleIds.value.length &&
    !isSaving.value,
  canCreate: () => can.value("create_entry"),
  canReview: () => canReview.value,
  hasDrafts: () =>
    !!reviewableLocaleIds.value.length && !isSaving.value && !isReviewing.value,
  canEdit: () => canUpdate.value && !isSaving.value,
  focusedLanguage: () => {
    const localeId = paletteLocaleId.value;

    if (!localeId) return undefined;

    return {
      name: localeOption(localeId)?.label ?? localeId,
      isDefault: localeId === defaultLocale.value?.id,
    };
  },
  handlers: {
    action: onEntryAction,
    save: () => canUpdate.value && handleSave(),
    saveAndNext: () => canUpdate.value && saveAndNext(),
    previous: () => !isSaving.value && navigation.previous(),
    next: () => !isSaving.value && navigation.next(),
    approveAll: approveShown,
    copySource: () => copySourceTo(paletteLocaleId.value),
    toggleContext: () => {
      const localeId =
        activeLocaleId.value ?? orderedSelectedLocaleIds.value[0];

      if (localeId) toggleContext(localeId);
    },
    focusSearch: () => searchBox.value?.querySelector("input")?.focus(),
    create: () => (showCreateDialog.value = true),
    entry: (id) => {
      const item = splitViewItems.value.find((entry) => entry.key === id);

      if (item) selectEntry(item);
    },
    status: (value) => {
      if (!isSaving.value) translationStatus.value = value;
    },
  },
});

watch(
  paletteOpen,
  (open) => {
    if (open) paletteLocaleId.value = focusedLocaleId();
  },
  { flush: "sync" },
);
</script>

<template>
  <div v-if="isLoading && !data" class="flex items-center justify-center py-12">
    <div class="text-neutral-600 dark:text-neutral-400">
      {{ t("entries.loading") }}
    </div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("entries.loadFailed", { error: getErrorMessage(error) }) }}</p>
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
      <div ref="searchBox" class="w-full sm:w-56" @keydown="onSearchKeydown">
        <Input
          v-model="search"
          dense
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="t('entries.search')"
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
      <EditorRefreshStatus
        :refreshing="isFetching && !isFetchingNextPage && !isSaving"
        :failed="!!error"
        :refreshing-label="t('entries.refreshing')"
        :failed-label="t('entries.refreshFailed')"
        @retry="refetch()"
      />
    </div>
    <EntryBulkBar
      v-if="checkedEntryIds.length"
      :count="checkedEntryIds.length"
      :loaded-count="splitViewItems.length"
      :all-loaded-checked="allLoadedChecked"
      :max-entries="MAX_BULK_ENTRIES"
      :limit-reached="bulkLimitReached"
      :is-saving="isSaving"
      :is-translating="isTranslating"
      :can-translate="canMachineTranslate"
      :translate-blocker="bulkTranslateBlocker"
      :progress="bulkTranslation"
      :can-review="canReview"
      :is-reviewing="isReviewing"
      :can-copy="canUpdate"
      :copy-blocker="bulkCopyBlocker"
      :can-delete="can('delete_entry')"
      @check-loaded="checkAllLoaded"
      @clear="checkedEntryIds = []"
      @translate="runBulkTranslation()"
      @stop-translate="stopBulkTranslation"
      @edit-scopes="showScopesDialog = true"
      @approve="approveTranslations(checkedEntryIds, selectedLocaleIds)"
      @reject="requestRejectMany(checkedEntryIds, selectedLocaleIds)"
      @copy="runBulkTranslation('copy')"
      @delete="showBulkDeleteDialog = true"
    />
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
            :draft-count="draftCount(item)"
            :draft-label="
              t(
                'review.draftCount',
                { count: draftCount(item) },
                draftCount(item),
              )
            "
            :outdated-count="outdatedCount(item)"
            :outdated-label="
              t(
                'review.outdatedCount',
                { count: outdatedCount(item) },
                outdatedCount(item),
              )
            "
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
                :locale-code="localeOption(defaultLocale.id)?.code"
              />
            </template>
          </EditorListItem>
        </template>
        <template #header="{ item }">
          <EntryHeader
            :label="item?.label"
            :entry="selectedEntryData"
            :active-scope-ids="scopeIds"
            :translated-count="translatedCount"
            :locale-count="selectedLocaleIds.length"
            :is-saving="isSaving"
            :is-translating="
              !!selectedEntryId && isEntryWaiting(selectedEntryId)
            "
            :actions="entryActions"
            @toggle-scope="toggleScopeFilter"
            @edit="editDialogItem = selectedEntryData"
            @action="onEntryAction"
          />
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
              :input-id="fieldId(String(item.key), localeId)"
              :locale-name="localeOption(localeId)?.label ?? localeId"
              :locale-code="localeOption(localeId)?.code ?? ''"
              :is-default="localeId === defaultLocale?.id"
              :translated="!!(currentEntryForms[localeId] ?? '').trim()"
              :dirty="isTranslationDirty(String(item.key), localeId)"
              :active="contextOpen && activeLocaleId === localeId"
              :readonly="isSaving || !canUpdate"
              :translating="isTranslatingLocale(String(item.key), localeId)"
              :placeholder="t('entries.translationPlaceholder')"
              :status="savedLocalization(String(item.key), localeId)?.status"
              :review-comment="
                savedLocalization(String(item.key), localeId)?.reviewComment
              "
              :outdated="
                !!savedLocalization(String(item.key), localeId)?.outdated
              "
              :can-review="canReview && !isReviewing"
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
              @show-change="openContext(localeId, 'terminology')"
              @approve="
                approveTranslations([String(item.key)], [localeId], {
                  confirmOutdated: true,
                })
              "
              @reject="
                requestReject(
                  String(item.key),
                  localeId,
                  localeOption(localeId)?.label ?? localeId,
                )
              "
            >
              <template
                v-if="defaultLocale?.id && localeId !== defaultLocale.id"
                #meta
              >
                <div class="flex flex-wrap gap-1">
                  <EntryTermChip
                    :source-text="currentEntryForms[defaultLocale.id] ?? ''"
                    :locale-id="localeId"
                    :translation="currentEntryForms[localeId] ?? ''"
                    @open="openContext(localeId, 'terminology')"
                  />
                  <EditorSuggestionNotice
                    :suggestion="suggestionFor(String(item.key), localeId)"
                    :value="currentEntryForms[localeId] ?? ''"
                  />
                  <EditorQaNotice
                    :source="currentEntryForms[defaultLocale.id] ?? ''"
                    :value="currentEntryForms[localeId] ?? ''"
                  />
                </div>
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
        :locale-code="localeOption(activeLocaleId)?.code"
        :source-locale-id="defaultLocale?.id ?? undefined"
        :source-locale-name="localeOption(defaultLocale?.id)?.label ?? ''"
        :source-locale-code="localeOption(defaultLocale?.id)?.code"
        :source-text="
          defaultLocale?.id ? (currentEntryForms[defaultLocale.id] ?? '') : ''
        "
        :translation="currentEntryForms[activeLocaleId] ?? ''"
        :is-default="activeLocaleId === defaultLocale?.id"
        :outdated-at="
          savedLocalization(String(selectedEntry.key), activeLocaleId)
            ?.outdatedAt
        "
        :can-use="canUpdate && !isSaving"
        @close="contextOpen = false"
        @use="applyHistoryText"
      />
    </div>
    <div
      class="flex min-h-13 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-2 pr-3.5 pl-5 dark:border-white/5"
    >
      <div class="flex flex-wrap items-center gap-3">
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
        <CommandPaletteHint class="max-sm:hidden" />
      </div>
      <EditorWorkspaceActions
        v-can="'update_entry'"
        show-save-all
        :unsaved-count="allUnsavedCount"
        :can-save="!!selectedEntryData && !!selectedUnsavedLocaleIds.length"
        :is-saving="isSaving"
        @discard-all="requestDiscardAll"
        @save-all="showSaveAllDialog = true"
        @save="handleSave"
      />
    </div>
  </section>
  <EditorSaveAllDialog
    :open="showSaveAllDialog"
    :title="t('entries.saveAllTitle')"
    :message="
      t('entries.saveAllConfirm', {
        count: allUnsavedCount,
        entries: new Set(allUnsavedTranslations.map((change) => change.itemId))
          .size,
      })
    "
    :disabled="!allUnsavedCount || isSaving"
    @close="showSaveAllDialog = false"
    @confirm="handleSaveAll"
  />
  <EditorRejectDialog
    :open="!!rejecting"
    :language="rejecting?.language ?? ''"
    :title="
      rejecting && !rejecting.language
        ? t(
            'review.rejectTickedTitle',
            { count: rejecting.itemIds.length },
            rejecting.itemIds.length,
          )
        : undefined
    "
    @close="rejecting = undefined"
    @confirm="confirmReject"
  />
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
    :locales="locales"
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
  <EntryBulkDeleteDialog
    :open="showBulkDeleteDialog"
    :entry-ids="checkedEntryIds"
    @close="showBulkDeleteDialog = false"
    @deleted="handleBulkDeleted"
  />
</template>

<style scoped>
.editor-split-view :deep(> *) {
  grid-column: span 1;
}
</style>
