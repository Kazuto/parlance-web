<script setup lang="ts">
import {
  Button,
  SplitView,
  type SplitViewItem,
  Textarea,
  Tooltip,
  Badge,
  Dialog,
  Chip,
  Icon,
  Input,
} from "@thkzt/eunoia";
import { useEntryDetail, useEntryFeed } from "~/composables/entry/useEntryFeed";
import { useEntryFilterQuery } from "~/composables/entry/useEntryFilterQuery";
import { watchDebounced, useMediaQuery, useEventListener } from "@vueuse/core";
import { useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type { Localization } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

const queryClient = useQueryClient();
const historyQueryKey = api.entries.history.getQueryKey();
const { t } = useI18n();
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

usePage({
  width: "wide",
  layout: "workspace",
  title: t("nav.entries"),
  description: t("entries.description"),
  primaryAction: {
    content: t("entries.create"),
    icon: "plus",
    onClick: () => (showCreateDialog.value = true),
  },
  secondaryActions: [
    {
      content: t("entries.import"),
      icon: "upload",
      onClick: () => openTransfer("import"),
    },
    {
      content: t("entries.export"),
      icon: "download",
      onClick: () => openTransfer("export"),
    },
  ],
});

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

const searchField = useTemplateRef<HTMLElement>("searchField");

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

// "/" focuses the search from anywhere outside a text field, as in most dev tools.
useEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey)
    return;
  if (isEditable(event.target)) return;
  const input = searchField.value?.querySelector("input");
  if (!input) return;
  event.preventDefault();
  input.focus();
  input.select();
});

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

const defaultLocaleIds = computed(() => {
  const locales = localeData.value?.locales ?? [];
  const id = (locales.find((locale) => locale.isDefault) ?? locales[0])?.id;
  return id ? [id] : [];
});
const languagesFiltered = computed(
  () =>
    selectedLocaleIds.value.length !== defaultLocaleIds.value.length ||
    selectedLocaleIds.value.some((id) => !defaultLocaleIds.value.includes(id)),
);
const activeFilterCount = computed(
  () =>
    Number(languagesFiltered.value) +
    Number(scopeIds.value.length > 0) +
    Number(!!translationStatus.value),
);
const selectedLanguageLabels = computed(() =>
  orderedSelectedLocaleIds.value
    .map((id) => localeOptions.value.find((locale) => locale.value === id))
    .filter((locale) => !!locale)
    .map((locale) => locale.label),
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
const selectedScopes = computed(() =>
  scopeIds.value.map((id) => ({
    id,
    label: scopeOptions.value.find((scope) => scope.value === id)?.label ?? id,
  })),
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

async function handleDeleted(id: string) {
  Reflect.deleteProperty(localizationForms.value, id);
  Reflect.deleteProperty(savedTranslations.value, id);
  Reflect.deleteProperty(knownEntries.value, id);
  pinnedEntryId.value = undefined;
  selectedEntry.value = undefined;
  await refetch();
}

const defaultLocale = computed(() =>
  localeData.value?.locales?.find((locale) => locale.isDefault),
);
watch(
  [selectedLocaleIds, () => defaultLocale.value?.id],
  () => {
    if (
      !activeLocaleId.value ||
      !selectedLocaleIds.value.includes(activeLocaleId.value)
    ) {
      activeLocaleId.value =
        selectedLocaleIds.value.find((id) => id !== defaultLocale.value?.id) ??
        selectedLocaleIds.value[0];
    }
  },
  { deep: true },
);
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

const splitViewItems = computed((): SplitViewItem[] =>
  feedEntries.value
    .filter((entry) => !!entry.id)
    .map((entry: Entry) => ({
      key: entry.id ?? "",
      label: entry.key ?? "",
      missingLocaleIds: entry.missingLocaleIds ?? [],
    })),
);

function isMissingTranslations(item: SplitViewItem) {
  const missing = (item.missingLocaleIds as string[] | undefined) ?? [];
  return selectedLocaleIds.value.some((id) => missing.includes(id));
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

const toast = useToast();

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
        `${knownEntries.value[entryId]?.key ?? entryId}: ${localeOptions.value.find((locale) => locale.value === localeId)?.label ?? localeId}`,
      ];
    });
    const failed = failedLanguages.length;
    if (failed === 0) {
      toast.add(t("entries.saved", { label }), { variant: "success" });
    } else {
      toast.add(
        t("entries.partialSave", {
          saved: results.length - failed,
          total: results.length,
          failures: failedLanguages.join(", "),
        }),
        { variant: failed === results.length ? "danger" : "warning" },
      );
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
    <div class="text-neutral-600">{{ t("entries.loading") }}</div>
  </div>

  <div
    v-else-if="error && !data"
    class="bg-red-50 border border-red-200 rounded-lg p-4"
  >
    <p class="text-red-800">
      {{ t("entries.loadFailed", { error: error.message }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </div>

  <section
    v-else-if="data"
    class="entry-workspace"
    :aria-label="t('entries.workspace')"
    :aria-busy="isFetching"
  >
    <div
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-700"
    >
      <div ref="searchField" class="w-full sm:w-72" @keydown="onSearchKeydown">
        <Input
          v-model="search"
          dense
          type="search"
          :placeholder="t('entries.searchKeys')"
          :aria-label="t('entries.searchKeys')"
          :title="t('entries.searchShortcut')"
        >
          <template #prepend>
            <Icon name="magnifying-glass" size="sm" />
          </template>
        </Input>
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
      <Chip
        v-for="scope in selectedScopes"
        :key="scope.id"
        dense
        variant="secondary"
        removable
        @remove="scopeIds = scopeIds.filter((id) => id !== scope.id)"
      >
        {{ scope.label }}
      </Chip>
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
        class="ml-auto text-xs text-neutral-500"
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
      class="editor-panels"
      :class="{
        'with-context': contextOpen && activeLocaleId && selectedEntry,
      }"
    >
      <SplitView
        :items="splitViewItems"
        :selected="selectedEntry"
        virtual
        :has-more="hasNextPage"
        :loading="isFetchingNextPage"
        :total="entryTotal"
        class="entry-split-view"
        @select="selectEntry"
        @end-reached="fetchNextPage()"
      >
        <template #listFooter>
          <p
            v-if="isFetchingNextPage"
            role="status"
            class="px-4 py-2 text-xs text-neutral-500"
          >
            {{ t("entries.loadingMore") }}
          </p>
        </template>
        <template #empty>
          <p class="px-4 py-2 text-sm text-neutral-500">
            {{ t("entries.noMatches") }}
          </p>
        </template>
        <template #item="{ item }">
          <span class="flex min-w-0 w-full items-center justify-between gap-3">
            <span class="truncate" :title="item.label">{{ item.label }}</span>
            <span
              v-if="hasUnsavedTranslations(String(item.key))"
              class="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-300"
              :title="t('entries.unsavedTranslations')"
              >{{ t("common.unsaved") }}</span
            >
            <Tooltip
              v-if="
                !hasUnsavedTranslations(String(item.key)) &&
                isMissingTranslations(item)
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
                  <Chip
                    v-for="scope in selectedEntryData.scopes"
                    :key="scope.id ?? undefined"
                    dense
                    :variant="
                      scope.id && scopeIds.includes(scope.id)
                        ? 'primary'
                        : 'secondary'
                    "
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
                    >{{ scope.name }}</Chip
                  >
                </div>
                <button
                  v-else-if="selectedEntryData"
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
                class="mt-1 line-clamp-2 text-sm text-neutral-500"
              >
                {{ selectedEntryData.description }}
              </p>
            </div>
            <EntryActionsMenu
              v-if="selectedEntryData"
              :key="selectedEntryData.id ?? undefined"
              :disabled="isSaving"
              @edit="editDialogItem = selectedEntryData"
              @delete="deleteDialogItem = selectedEntryData"
            />
          </div>
        </template>
        <template #default="{ item }">
          <div
            v-if="item && isEditorLoading"
            role="status"
            class="flex h-full items-center justify-center text-sm text-neutral-500"
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
              @focusin="activeLocaleId = localeId"
            >
              <div
                class="mb-1 flex flex-wrap items-center justify-between gap-2"
              >
                <label
                  :for="`entry-${item.key}-${localeId}`"
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
                    v-if="isTranslationDirty(String(item.key), localeId)"
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
                    :disabled="!canFillEmptyTranslations"
                    @click="fillEmptyTranslations"
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
                  <span v-else class="text-xs text-primary-600">{{
                    t("context.active")
                  }}</span>
                </div>
              </div>
              <Textarea
                :id="`entry-${item.key}-${localeId}`"
                :aria-label="
                  localeOptions.find((locale) => locale.value === localeId)
                    ?.label
                "
                :readonly="isSaving"
                :model-value="currentEntryForms[String(localeId)] ?? ''"
                :placeholder="t('entries.translationPlaceholder')"
                @update:model-value="
                  setLocalizationForm(String(item.key), localeId, $event)
                "
              />
              <EntryTerminologyHints
                v-if="defaultLocale?.id && localeId !== defaultLocale.id"
                :key="`${item.key}-${localeId}`"
                :source-text="currentEntryForms[defaultLocale.id] ?? ''"
                :target-locale-id="localeId"
                :translation="currentEntryForms[localeId] ?? ''"
                compact
                @open="openContext(localeId)"
              />
            </div>
          </div>

          <div
            v-else
            class="flex h-full items-center justify-center text-center text-neutral-500 text-sm"
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
        class="entry-context"
        :entry-id="String(selectedEntry.key)"
        :locale-id="activeLocaleId"
        :locale-name="activeLocaleName"
        :source-text="
          defaultLocale?.id ? (currentEntryForms[defaultLocale.id] ?? '') : ''
        "
        :translation="currentEntryForms[activeLocaleId] ?? ''"
        :is-default="activeLocaleId === defaultLocale?.id"
        @close="contextOpen = false"
      />
    </div>
    <div
      class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-2 dark:border-neutral-700"
    >
      <span class="text-sm text-neutral-500">
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
    <p class="text-sm text-neutral-500">
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
  <EntryEditDialog
    :open="!!editDialogItem"
    :item="editDialogItem"
    @close="editDialogItem = undefined"
    @updated="handleEntryUpdated"
  />
  <EntryTransferDialog
    :open="showTransferDialog"
    :action="transferAction"
    :locales="localeData?.locales ?? []"
    @close="showTransferDialog = false"
  />
  <EntryCreateDialog
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
.entry-workspace {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-neutral-200);
  border-radius: 0.75rem;
  background: var(--color-white);
}

.editor-panels {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.entry-split-view {
  width: 100%;
  grid-template-columns: minmax(200px, 250px) minmax(0, 1fr);
  min-width: 0;
  flex: 1;
  gap: 0;
  border: 0;
  border-radius: 0;
}

.entry-context {
  flex: 0 0 320px;
  min-width: 0;
}

@media (max-width: 1100px) {
  .entry-context {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: min(340px, 100%);
    z-index: 20;
    box-shadow: -8px 0 24px rgb(0 0 0 / 0.08);
  }
}

.entry-split-view :deep(> *) {
  grid-column: span 1;
}

@media (max-width: 640px) {
  .entry-split-view {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 150px minmax(0, 1fr);
  }
}

:global(.dark) .entry-workspace {
  background: var(--color-neutral-800);
  border-color: var(--color-neutral-700);
}
</style>
