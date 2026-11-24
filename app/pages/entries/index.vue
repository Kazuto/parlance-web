<script setup lang="ts">
import {
  type ActionMenuItem,
  Alert,
  Button,
  type SplitViewItem,
  Chip,
  Input,
} from "@thkzt/eunoia";
import { useEditorCommands } from "~/composables/editor/useEditorCommands";
import { useEditorLocales } from "~/composables/editor/useEditorLocales";
import { useEditorContextPanel } from "~/composables/editor/useEditorContextPanel";
import { useCompactEditor } from "~/composables/editor/useCompactEditor";
import { useTranslationSuggestions } from "~/composables/editor/useTranslationSuggestions";
import {
  type DraftChange,
  useTranslationDrafts,
} from "~/composables/editor/useTranslationDrafts";
import { useReviewActions } from "~/composables/editor/useReviewActions";
import { useEditorShortcuts } from "~/composables/editor/useEditorShortcuts";
import { useEntryDetail, useEntryFeed } from "~/composables/entry/useEntryFeed";
import { useEntryFilterQuery } from "~/composables/entry/useEntryFilterQuery";
import { useBulkTranslate } from "~/composables/entry/useBulkTranslate";
import { useEntryNavigation } from "~/composables/entry/useEntryNavigation";
import { useOutdateCheck } from "~/composables/entry/useOutdateCheck";
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
  tagIds,
  releaseIds,
  translationStatus,
  targetLocaleIds,
  statusLocaleIds,
  duplicates,
} = useEntryFeed(100);
const scopeChoices = useScopeOptions();
const { options: scopeOptions, error: scopeError } = scopeChoices;
// Tags narrow the selected scopes; one whose scope is deselected goes too.
const { tagOptions } = useScopedTags(scopeIds, tagIds, scopeChoices);
const { options: releaseOptions } = useReleaseOptions();
const statusOptions = computed(() => [
  { label: t("entries.filterAll"), value: "" },
  { label: t("entries.missingTranslations"), value: "missing" },
  { label: t("entries.filterComplete"), value: "complete" },
  { label: t("entries.filterReview"), value: "review" },
  { label: t("entries.filterOutdated"), value: "outdated" },
  { label: t("entries.filterCheck"), value: "check" },
]);
const duplicateOptions = computed(() => [
  { label: t("entries.duplicatesAll"), value: "" },
  { label: t("entries.duplicatesSame"), value: "same" },
  { label: t("entries.duplicatesDifferent"), value: "different" },
]);
const { items: locales } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);

const selectedLocaleIds = ref<string[]>([]);

// The status filter checks the translations, not the default language's source
// text shown next to them, unless that is the only language selected.
watch(
  [selectedLocaleIds, locales],
  ([ids, list]) => {
    const defaultId = list.find(
      (locale) => locale.isDefault && !locale.deletedAt,
    )?.id;
    const translated = ids.filter((id) => id !== defaultId);

    targetLocaleIds.value = [...ids];
    statusLocaleIds.value = translated.length ? translated : [...ids];
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
  tagIds,
  releaseIds,
  status: translationStatus,
  duplicates,
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
    Number(tagIds.value.length > 0) +
    Number(releaseIds.value.length > 0) +
    Number(!!translationStatus.value) +
    Number(!!duplicates.value),
);

function toggleScopeFilter(id: string) {
  if (isSaving.value) return;
  scopeIds.value = scopeIds.value.includes(id)
    ? scopeIds.value.filter((scopeId) => scopeId !== id)
    : [...scopeIds.value, id];
}

// Filtering by a tag filters by its scope too, as tags only narrow scopes.
function toggleTagFilter(id: string, scopeId: string) {
  if (isSaving.value) return;

  if (tagIds.value.includes(id)) {
    tagIds.value = tagIds.value.filter((tagId) => tagId !== id);

    return;
  }

  if (!scopeIds.value.includes(scopeId))
    scopeIds.value = [...scopeIds.value, scopeId];
  tagIds.value = [...tagIds.value, id];
}

function toggleReleaseFilter(id: string) {
  if (isSaving.value) return;
  releaseIds.value = releaseIds.value.includes(id)
    ? releaseIds.value.filter((releaseId) => releaseId !== id)
    : [...releaseIds.value, id];
}

// The scope chips, each followed by the chips of its selected tags.
const selectedScopes = computed(() =>
  scopeIds.value.map((id) => {
    const option = scopeOptions.value.find((scope) => scope.value === id);

    return {
      id,
      label: option?.label ?? id,
      color: option?.color,
      tags: (option?.tags ?? []).filter((tag) => tagIds.value.includes(tag.id)),
    };
  }),
);
const selectedReleases = computed(() =>
  releaseIds.value.map((id) => ({
    id,
    label:
      releaseOptions.value.find((release) => release.value === id)?.label ?? id,
  })),
);
const selectedStatusLabel = computed(
  () =>
    statusOptions.value.find(
      (option) => option.value === translationStatus.value,
    )?.label ?? "",
);
const selectedDuplicatesLabel = computed(
  () =>
    duplicateOptions.value.find((option) => option.value === duplicates.value)
      ?.label ?? "",
);

function clearFilters() {
  selectedLocaleIds.value = [...defaultLocaleIds.value];
  scopeIds.value = [];
  tagIds.value = [];
  releaseIds.value = [];
  translationStatus.value = "";
  duplicates.value = "";
}

// A new entry sits at its alphabetical place, which may not be loaded yet; keep it
// selected until the user picks something else instead of falling back to the top.
// The same goes for a twin opened from the context panel, which the filters may hide.
const pinnedEntryId = ref<string>();

function pinEntry(id: string, key: string) {
  pinnedEntryId.value = id;
  selectedEntry.value = { key: id, label: key };
  compactEditor.show(id);
}

function openTwin(entry: { id: string; key: string }) {
  if (isSaving.value || !entry.id) return;
  pinEntry(entry.id, entry.key);
}

async function handleCreated(entry: Entry) {
  scopeIds.value = [];
  tagIds.value = [];
  releaseIds.value = [];
  translationStatus.value = "";
  duplicates.value = "";
  search.value = "";
  feedSearch.value = undefined;
  if (!entry.id) return;
  knownEntries.value[entry.id] = entry;
  pinEntry(entry.id, entry.key ?? "");
}

function selectEntry(item: SplitViewItem) {
  if (isSaving.value) return;
  pinnedEntryId.value = undefined;
  selectedEntry.value = item;
  compactEditor.show(String(item.key));
}

// Entries ticked in the list for bulk actions. Kept across filter changes so
// entries can be gathered from several searches.
const MAX_BULK_ENTRIES = 1000;
const checkedEntryIds = ref<string[]>([]);
const showScopesDialog = ref(false);
const showTagsDialog = ref(false);
const showReleasesDialog = ref(false);
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

function handleBulkEdited(entryIds: string[]) {
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
      // Twins sit next to each other; the text they share marks each group.
      detail: duplicates.value ? (entry.defaultTranslation ?? "") : undefined,
    })),
);

function itemDetail(item: SplitViewItem) {
  return typeof item.detail === "string" ? item.detail : undefined;
}

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

// On phones the list and the open entry take turns; see useCompactEditor.
const compactEditor = useCompactEditor({
  items: splitViewItems,
  selected: selectedEntry,
});
const selectedIndex = computed(() =>
  splitViewItems.value.findIndex(
    (item) => item.key === selectedEntry.value?.key,
  ),
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

type EntryChange = DraftChange & {
  /** A small fix of the default text, which leaves the translations current. */
  keepTranslationsCurrent?: boolean;
};

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
} = useTranslationDrafts<Entry, Localization, EntryChange>({
  name: "entry-translations",
  selectedId: selectedEntryId,
  rows: (entry) => entry.localizations,
  setRows: (entry, localizations) => (entry.localizations = localizations),
  upsert: async (
    { itemId, localeId, translation, keepTranslationsCurrent },
    existing,
  ) => {
    // A suggestion saved as it is stays the model's text; any edit makes it the user's.
    const suggestion = suggestionFor(itemId, localeId);
    const machineModel =
      suggestion?.model && suggestion.translation === translation
        ? suggestion.model
        : undefined;

    return existing
      ? (
          await localizationStore.update.mutateAsync({
            id: existing.id,
            translation,
            machineModel,
            keepTranslationsCurrent,
          })
        ).localization
      : (
          await localizationStore.create.mutateAsync({
            entryId: itemId,
            localeId,
            translation,
            machineModel,
          })
        ).localization;
  },
  describe: ({ itemId, localeId }, entry) =>
    `${entry?.key ?? itemId}: ${localeOption(localeId)?.label ?? localeId}`,
  messages: { saved: "common.labelSaved", partial: "entries.partialSave" },
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
  confirm: confirmTranslations,
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
    onlyOutdated: details.onlyOutdated,
  }),
  afterReview: () =>
    Promise.all([
      refetch(),
      refetchDetail(),
      queryClient.invalidateQueries({ queryKey: historyQueryKey }),
    ]),
});

const showConfirmOutdatedDialog = ref(false);

// Confirms the ticked entries' outdated translations in the shown languages still
// fit; the dialog stays open when that fails.
async function confirmOutdatedTicked() {
  const done = await confirmTranslations(
    checkedEntryIds.value,
    selectedLocaleIds.value,
  );

  if (done) showConfirmOutdatedDialog.value = false;
}

// The saved translation of an entry in a language, with its review state.
function savedLocalization(entryId: string, localeId: string) {
  return knownEntries.value[entryId]?.localizations?.find(
    (localization) => localization.localeId === localeId,
  );
}

// Drafts and outdated translations of the open entry in the shown languages, which
// can be approved, or confirmed to still fit, at once.
const reviewableLocaleIds = computed(() => {
  const entryId = selectedEntryId.value;

  if (!entryId) return [];

  return selectedLocaleIds.value.filter((localeId) => {
    const saved = savedLocalization(entryId, localeId);

    return (
      !!saved &&
      (saved.status === "REVIEW_STATUS_DRAFT" || !!saved.outdated) &&
      !isTranslationDirty(entryId, localeId)
    );
  });
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

// The shown languages AI translation writes into: all but the default one.
const translateLocaleIds = computed(() =>
  selectedLocaleIds.value.filter((id) => id !== defaultLocale.value?.id),
);

// Why AI translation can't run right now, if it can't.
const translateBlocker = computed(() => {
  const sourceId = defaultLocale.value?.id;

  if (isTranslating.value) return t("entries.translating");
  if (!sourceId || !currentEntryForms.value[sourceId]?.trim())
    return t("entries.noSourceText");
  if (!translateLocaleIds.value.length)
    return t("entries.bulkTranslateNoLanguages");
  if (isSourceUnsaved.value) return t("entries.translateSaveSourceFirst");

  return undefined;
});

// Actions on the whole entry: they affect every selected language, so they sit
// in the entry header rather than on a language row.
const entryActions = computed<ActionMenuItem[]>(() => {
  const items: ActionMenuItem[] = [];
  const busy = isSaving.value;

  if (can.value("update_entry")) {
    if (canMachineTranslate.value) {
      items.push({
        value: "translate",
        label: t("entries.aiTranslate"),
        icon: "sparkle",
        hint: translateBlocker.value,
        disabled: busy || !!translateBlocker.value,
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
      label: t("review.approveAndConfirmShown"),
      icon: "seal-check",
      hint: reviewableLocaleIds.value.length
        ? undefined
        : t("review.nothingToApproveOrConfirm"),
      disabled: busy || isReviewing.value || !reviewableLocaleIds.value.length,
    });
  }

  if (can.value("delete_entry")) {
    items.push({
      value: "delete",
      label: t("entries.delete"),
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
  if (action === "approve") approveShown();
  else if (action === "translate") translateEntry();
  else if (action === "copy") fillEmptyTranslations();
  else if (action === "edit") editDialogItem.value = entry;
  else if (action === "delete") deleteDialogItem.value = entry;
}

// The ticked entries' translations in the shown languages can be marked for the
// machine translation tasks, which replace them on their next runs.
const canRetranslate = computed(() =>
  canAll.value(["update_entry", "use_machine_translation"]),
);
const showRetranslateDialog = ref(false);
const retranslateLocales = computed(() =>
  translateLocaleIds.value
    .map((id) => locales.value.find((locale) => locale.id === id))
    .filter((locale) => !!locale),
);

// Languages with text are only replaced when ticked in the dialog; while all are
// empty, they are translated right away.
const translateDialogOpen = ref(false);
const translateChoices = computed(() => {
  const key = selectedEntryId.value ?? "";

  return translateLocaleIds.value.map((id) => ({
    id,
    label: `${localeOption(id)?.label ?? id} (${localeOption(id)?.code ?? ""})`,
    text: localizationForms.value[key]?.[id] ?? "",
  }));
});

function translateEntry() {
  if (translateBlocker.value || isSaving.value) return;
  if (translateChoices.value.some((choice) => choice.text.trim()))
    translateDialogOpen.value = true;
  else translateInto([...translateLocaleIds.value]);
}

// Puts machine translations into the languages as unsaved changes to review.
async function translateInto(localeIds: string[]) {
  const entryId = selectedEntry.value?.key;

  translateDialogOpen.value = false;
  if (!localeIds.length || translateBlocker.value || entryId == null) return;

  const key = String(entryId);
  const form = (localeId: string) =>
    localizationForms.value[key]?.[localeId] ?? "";
  // Text typed or changed while waiting stays.
  const before = Object.fromEntries(localeIds.map((id) => [id, form(id)]));

  try {
    const suggestions = await suggestTranslations(key, localeIds);

    for (const { localeId, translation } of suggestions) {
      if (!localeId || !translation || form(localeId) !== before[localeId])
        continue;
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

const outdateCheck = useOutdateCheck({
  defaultLocaleId: () => defaultLocale.value?.id ?? undefined,
  entry: (entryId) => knownEntries.value[entryId],
});

/**
 * Saves the changes, after asking whether small fixes of default texts mark their
 * translations outdated. Cancelling saves nothing.
 */
async function saveChanges(changes: DraftChange[], label: string) {
  const keepCurrent = await outdateCheck.check(changes);

  if (!keepCurrent) return;

  await saveTranslations(
    changes.map((change) =>
      change.localeId === defaultLocale.value?.id &&
      keepCurrent.has(change.itemId)
        ? { ...change, keepTranslationsCurrent: true }
        : change,
    ),
    label,
  );
}

async function handleSave() {
  const entry = selectedEntryData.value;

  if (!entry?.id || isSaving.value) return;

  const entryId = entry.id;
  const localeIds = [...selectedUnsavedLocaleIds.value];

  if (!localeIds.length) return;
  await saveChanges(
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
  await saveChanges(
    [...allUnsavedTranslations.value],
    t("entries.translations"),
  );
}

// Puts a text from the context panel, an older one from the history or a match from
// the translation memory, into the field as an unsaved change.
function applyContextText(text: string) {
  const entryId = selectedEntryId.value;
  const localeId = activeLocaleId.value;

  if (!entryId || !localeId || isSaving.value || !canUpdate.value) return;

  setLocalizationForm(entryId, localeId, text);
  // On phones the sheet covered the field; close it to show the text.
  if (compactEditor.compact.value) contextOpen.value = false;
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

// Approves every draft of the open entry in the shown languages, and confirms its
// outdated translations still fit.
function approveShown() {
  const entryId = selectedEntryId.value;

  if (!entryId || !canReview.value || isSaving.value || isReviewing.value)
    return;
  if (!reviewableLocaleIds.value.length) return;

  approveTranslations([entryId], reviewableLocaleIds.value, {
    confirmOutdated: true,
  });
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
  labels: {
    group: "commands.groupEntry",
    items: "commands.groupEntries",
    previous: "commands.previousEntry",
    next: "commands.nextEntry",
    saveAndNext: "commands.saveAndNext",
    search: "commands.focusSearch",
    approveAll: "commands.approveAndConfirmAll",
  },
  itemIcon: "translate",
  actions: entryActions,
  items: splitViewItems,
  itemKeywords: (entry) => [String(entry.defaultTranslation ?? "")],
  statusOptions,
  canSave: () =>
    canUpdate.value &&
    !!selectedEntryData.value &&
    !!selectedUnsavedLocaleIds.value.length &&
    !isSaving.value,
  canReview: () => canReview.value,
  canApproveAll: () =>
    !!reviewableLocaleIds.value.length && !isSaving.value && !isReviewing.value,
  copySource: {
    canEdit: () => canUpdate.value && !isSaving.value,
    focusedLanguage: () => {
      const localeId = paletteLocaleId.value;

      if (!localeId) return undefined;

      return {
        name: localeOption(localeId)?.label ?? localeId,
        isDefault: localeId === defaultLocale.value?.id,
      };
    },
    run: () => copySourceTo(paletteLocaleId.value),
  },
  handlers: {
    action: onEntryAction,
    save: () => canUpdate.value && handleSave(),
    saveAndNext: () => canUpdate.value && saveAndNext(),
    previous: () => !isSaving.value && navigation.previous(),
    next: () => !isSaving.value && navigation.next(),
    approveAll: approveShown,
    toggleContext: () => {
      const localeId =
        activeLocaleId.value ?? orderedSelectedLocaleIds.value[0];

      if (localeId) toggleContext(localeId);
    },
    focusSearch: () => searchBox.value?.querySelector("input")?.focus(),
    item: (id) => {
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
      <div
        ref="searchBox"
        class="min-w-0 flex-1 md:w-56 md:flex-none"
        @keydown="onSearchKeydown"
      >
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
        v-model:tag-ids="tagIds"
        v-model:release-ids="releaseIds"
        v-model:status="translationStatus"
        v-model:duplicates="duplicates"
        :locale-options="localeOptions"
        :scope-options="scopeOptions"
        :tag-options="tagOptions"
        :release-options="releaseOptions"
        :status-options="statusOptions"
        :duplicate-options="duplicateOptions"
        :active-count="activeFilterCount"
        :disabled="isSaving"
        @clear="clearFilters"
      />
      <!-- On phones the chips get a row of their own that scrolls sideways. -->
      <div
        class="flex min-w-0 flex-wrap items-center gap-2 max-md:basis-full max-md:flex-nowrap max-md:overflow-x-auto"
      >
        <Chip
          dense
          variant="primary"
          class="shrink-0"
          :title="selectedLanguageLabels.join(', ')"
        >
          {{ languageSummary }}
        </Chip>
        <template v-for="scope in selectedScopes" :key="scope.id">
          <ScopeChip
            dense
            removable
            class="shrink-0"
            :color="scope.color"
            @remove="scopeIds = scopeIds.filter((id) => id !== scope.id)"
          >
            {{ scope.label }}
          </ScopeChip>
          <ScopeTagChip
            v-for="tag in scope.tags"
            :key="tag.id"
            dense
            removable
            class="shrink-0"
            @remove="tagIds = tagIds.filter((id) => id !== tag.id)"
          >
            {{ tag.name }}
          </ScopeTagChip>
        </template>
        <ReleaseChip
          v-for="release in selectedReleases"
          :key="release.id"
          dense
          removable
          class="shrink-0"
          @remove="releaseIds = releaseIds.filter((id) => id !== release.id)"
        >
          {{ release.label }}
        </ReleaseChip>
        <Chip
          v-if="translationStatus"
          dense
          variant="secondary"
          removable
          class="shrink-0"
          @remove="translationStatus = ''"
        >
          {{ selectedStatusLabel }}
        </Chip>
        <Chip
          v-if="duplicates"
          dense
          variant="secondary"
          removable
          class="shrink-0"
          @remove="duplicates = ''"
        >
          {{ selectedDuplicatesLabel }}
        </Chip>
      </div>
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
      :can-retranslate="canRetranslate"
      :retranslate-blocker="
        translateLocaleIds.length
          ? undefined
          : t('entries.bulkTranslateNoLanguages')
      "
      :can-edit-releases="can('read_release')"
      @check-loaded="checkAllLoaded"
      @clear="checkedEntryIds = []"
      @translate="runBulkTranslation()"
      @stop-translate="stopBulkTranslation"
      @edit-scopes="showScopesDialog = true"
      @edit-tags="showTagsDialog = true"
      @edit-releases="showReleasesDialog = true"
      @approve="approveTranslations(checkedEntryIds, selectedLocaleIds)"
      @reject="requestRejectMany(checkedEntryIds, selectedLocaleIds)"
      @confirm-outdated="showConfirmOutdatedDialog = true"
      @retranslate="showRetranslateDialog = true"
      @copy="runBulkTranslation('copy')"
      @delete="showBulkDeleteDialog = true"
    />
    <EditorPanes
      v-model:selection="checkedEntryIds"
      :items="splitViewItems"
      :selected="selectedEntry"
      :has-more="hasNextPage"
      :loading="isFetchingNextPage"
      :total="entryTotal"
      :list-label="t('entries.keys')"
      :selectable="canUpdate"
      :compact="compactEditor.compact.value"
      :editor-open="compactEditor.editorOpen.value"
      @select="selectEntry"
      @end-reached="fetchNextPage()"
    >
      <template #legend>
        <EditorListLegend outdated />
      </template>
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
          mono
          :detail="itemDetail(item)"
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
        <EditorCompactNav
          v-if="compactEditor.editorOpen.value"
          :back-label="t('nav.allEntries')"
          :previous-label="t('commands.previousEntry')"
          :next-label="t('commands.nextEntry')"
          :has-previous="selectedIndex > 0"
          :has-next="selectedIndex < splitViewItems.length - 1 || !!hasNextPage"
          :disabled="isSaving"
          @back="compactEditor.close()"
          @previous="navigation.previous()"
          @next="navigation.next()"
        />
        <EntryHeader
          :label="item?.label"
          :entry="selectedEntryData"
          :active-scope-ids="scopeIds"
          :active-tag-ids="tagIds"
          :active-release-ids="releaseIds"
          :translated-count="translatedCount"
          :locale-count="selectedLocaleIds.length"
          :is-saving="isSaving"
          :is-translating="!!selectedEntryId && isEntryWaiting(selectedEntryId)"
          :actions="entryActions"
          @toggle-scope="toggleScopeFilter"
          @toggle-tag="toggleTagFilter"
          @toggle-release="toggleReleaseFilter"
          @edit="editDialogItem = selectedEntryData"
          @action="onEntryAction"
        />
      </template>
      <template v-if="selectedEntry && selectedLocaleIds.length" #columns>
        <EditorTranslationColumns :text-label="t('common.translation')" />
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
        <template v-else-if="item && selectedLocaleIds.length > 0">
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
            :retranslate="
              !!savedLocalization(String(item.key), localeId)?.retranslate
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
            <template v-if="localeId === defaultLocale?.id" #meta>
              <EntrySameTextChip
                :text="currentEntryForms[localeId] ?? ''"
                :entry-id="String(item.key)"
                @open="openContext(localeId, 'memory')"
              />
            </template>
            <template
              v-else-if="defaultLocale?.id && localeId !== defaultLocale.id"
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
                  :target="localeOption(localeId)"
                />
              </div>
            </template>
          </EditorTranslationRow>
        </template>

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
      <template #context>
        <EditorContextFrame
          v-if="activeLocaleId && selectedEntry"
          :compact="compactEditor.compact.value"
          :open="contextOpen"
          :title="`${t('context.title')} · ${activeLocaleName}`"
          @close="contextOpen = false"
        >
          <EntryContextPanel
            v-model:tab="contextTab"
            :sheet="compactEditor.compact.value"
            :entry-id="String(selectedEntry.key)"
            :locale-id="activeLocaleId"
            :locale-name="activeLocaleName"
            :locale-code="localeOption(activeLocaleId)?.code"
            :source-locale-id="defaultLocale?.id ?? undefined"
            :source-locale-name="localeOption(defaultLocale?.id)?.label ?? ''"
            :source-locale-code="localeOption(defaultLocale?.id)?.code"
            :source-text="
              defaultLocale?.id
                ? (currentEntryForms[defaultLocale.id] ?? '')
                : ''
            "
            :translation="currentEntryForms[activeLocaleId] ?? ''"
            :is-default="activeLocaleId === defaultLocale?.id"
            :outdated-at="
              savedLocalization(String(selectedEntry.key), activeLocaleId)
                ?.outdatedAt
            "
            :can-use="canUpdate && !isSaving"
            @close="contextOpen = false"
            @use="applyContextText"
            @open-entry="openTwin"
          />
        </EditorContextFrame>
      </template>
    </EditorPanes>
    <div
      class="flex min-h-13 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-2 pr-3.5 pl-5 dark:border-white/5"
    >
      <span class="text-xs text-neutral-500 dark:text-neutral-400">
        <!-- On phones only what is unsaved, to leave room for the buttons. -->
        <span class="max-md:hidden">
          <template v-if="entryTotal !== undefined"
            >{{ t("entries.count", { count: entryTotal }, entryTotal) }} ·
          </template>
          {{
            t(
              "common.selectedLanguages",
              { count: selectedLocaleIds.length },
              selectedLocaleIds.length,
            )
          }}
        </span>
        <span
          v-if="unsavedLocaleIds.length"
          class="md:ml-2 text-yellow-700 dark:text-amber-300"
          >{{ t("common.unsavedCount", { count: unsavedLocaleIds.length })
          }}{{
            unsavedLocaleIds.length > selectedUnsavedLocaleIds.length
              ? ` ${t("common.hiddenLanguages")}`
              : ""
          }}</span
        >
      </span>
      <EditorWorkspaceActions
        v-can="'update_entry'"
        show-save-all
        :compact="compactEditor.compact.value"
        :editor-open="compactEditor.editorOpen.value"
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
  <EntryOutdateDialog
    :changes="outdateCheck.asking.value"
    :language="localeOption(defaultLocale?.id)?.label ?? ''"
    :language-code="localeOption(defaultLocale?.id)?.code"
    @answer="outdateCheck.answer"
  />
  <EntryConfirmOutdatedDialog
    :open="showConfirmOutdatedDialog"
    :count="checkedEntryIds.length"
    :pending="isReviewing"
    @close="showConfirmOutdatedDialog = false"
    @confirm="confirmOutdatedTicked"
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
  <LocaleRetranslateDialog
    :open="showRetranslateDialog"
    :locales="retranslateLocales"
    :entry-ids="checkedEntryIds"
    @close="showRetranslateDialog = false"
  />
  <EntryTranslateDialog
    :open="translateDialogOpen"
    :entry-key="selectedEntryData?.key ?? ''"
    :choices="translateChoices"
    @close="translateDialogOpen = false"
    @translate="translateInto"
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
    @updated="handleBulkEdited"
  />
  <EntryTagsDialog
    :open="showTagsDialog"
    :entry-ids="checkedEntryIds"
    @close="showTagsDialog = false"
    @updated="handleBulkEdited"
  />
  <EntryReleasesDialog
    :open="showReleasesDialog"
    :entry-ids="checkedEntryIds"
    @close="showReleasesDialog = false"
    @updated="handleBulkEdited"
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
