<script setup lang="ts">
import { api } from "~/lib/api";
import {
  Alert,
  Button,
  SplitView,
  type SplitViewItem,
  Input,
  Chip,
} from "@thkzt/eunoia";
import { useEditorLocales } from "~/composables/editor/useEditorLocales";
import { useEditorContextPanel } from "~/composables/editor/useEditorContextPanel";
import { useTranslationDrafts } from "~/composables/editor/useTranslationDrafts";
import { useReviewActions } from "~/composables/editor/useReviewActions";
import {
  useTerminologyDetail,
  useTerminologyFeed,
} from "~/composables/terminology/useTerminologyFeed";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";
import type { Definition } from "~/lib/api/schemas/parlance/v1/DefinitionSchema";

const { t } = useI18n();
const { can } = usePermission();
const showCreateDialog = ref(false);
const deleteDialogItem = ref<Terminology>();
const editDialogItem = ref<Terminology>();

usePage(() => ({
  width: "extra-wide",
  layout: "workspace",
  title: t("nav.glossary"),
  description: t("terminologies.description"),
  showHeader: false,
  primaryAction: can.value("create_terminology")
    ? {
        content: t("terminologies.create"),
        icon: "plus",
        onClick: () => (showCreateDialog.value = true),
      }
    : undefined,
}));

const {
  data,
  terminologies: feedTerminologies,
  total: terminologyTotal,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  refetch,
  search: feedSearch,
  targetLocaleIds,
} = useTerminologyFeed(100);

const { items: locales } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);

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
} = useEditorLocales(() => locales.value, selectedLocaleIds);
const {
  contextOpen,
  activeLocaleId,
  activeLocaleName,
  toggleContext,
  onRowFocus,
} = useEditorContextPanel({
  selectedLocaleIds,
  orderedSelectedLocaleIds,
  defaultLocaleId: () => defaultLocale.value?.id,
  localeLabel: (id) => localeOption(id)?.label ?? "",
});
const storedFilters = useStoredFilters();

// Initialize selectedLocaleIds once when locales are loaded, with the languages
// last picked here or on the entries page.
watch(
  () => locales.value,
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
    storedFilters.languages.value = ids
      .map((id) => locales.value.find((locale) => locale.id === id)?.code)
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
// Types out terms and one of their translations from the list, showing by
// example that both can be searched; the accessible name says it in words.
// Terms that read the same in every language ("API") show nothing new, so they
// are left out.
const searchPlaceholder = useSearchExamples(
  () =>
    feedTerminologies.value.map((terminology) => [
      terminology.term,
      terminology.definitions?.find((definition) => {
        const translation = definition.translation?.trim().toLowerCase();

        return (
          definition.localeId !== defaultLocale.value?.id &&
          !!translation &&
          translation !== terminology.term?.trim().toLowerCase()
        );
      })?.translation,
    ]),
  search,
  () => t("terminologies.search"),
);
const { onKeydown: onSearchKeydown } = useDebouncedSearch(
  search,
  (value) => (feedSearch.value = value),
  350,
);

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
  forgetTerminology(id);
  pinnedTerminologyId.value = undefined;
  selectedTerminology.value = undefined;
  await refetch();
}

const selectedTerminologyId = computed(() =>
  selectedTerminology.value ? String(selectedTerminology.value.key) : undefined,
);
const definitionStore = useDefinitionStore();
const {
  forms: definitionForms,
  saved: savedDefinitions,
  known: knownTerminologies,
  isSaving,
  showDiscardDialog,
  register: registerTerminology,
  forget: forgetTerminology,
  setForm: setDefinitionForm,
  isDirty: isDefinitionDirty,
  hasUnsaved: hasUnsavedDefinitions,
  currentForms: currentTerminologyForms,
  unsavedLocaleIds,
  allUnsavedCount,
  discardChanges,
  requestDiscardAll,
  save: saveDefinitions,
} = useTranslationDrafts<Terminology, Definition>({
  name: "terminology-definitions",
  selectedId: selectedTerminologyId,
  rows: (terminology) => terminology.definitions,
  setRows: (terminology, definitions) =>
    (terminology.definitions = definitions),
  upsert: async ({ itemId, localeId, translation }, existing) =>
    existing
      ? (
          await definitionStore.update.mutateAsync({
            id: existing.id ?? "",
            translation,
          })
        ).definition
      : (
          await definitionStore.create.mutateAsync({
            terminologyId: itemId,
            localeId,
            translation,
          })
        ).definition,
  describe: ({ itemId, localeId }, terminology) =>
    `${terminology?.term ?? itemId}: ${localeOption(localeId)?.label ?? localeId}`,
  messages: {
    saved: "common.labelSaved",
    partial: "terminologies.partialSave",
  },
  afterSave: () => Promise.all([refetch(), refetchDetail()]),
});

const splitViewItems = computed((): SplitViewItem[] => {
  const activeLocales = locales.value.filter(
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
      const draftLocaleIds = (source.definitions ?? [])
        .filter(
          (def) =>
            def.localeId &&
            !def.deletedAt &&
            def.status === "REVIEW_STATUS_DRAFT",
        )
        .map((def) => def.localeId!);

      return {
        key: terminology.id ?? "",
        label: terminology.term ?? "",
        missingLocaleIds,
        draftLocaleIds,
      };
    });
});

function missingCount(item: SplitViewItem) {
  const missing = (item.missingLocaleIds as string[] | undefined) ?? [];

  return selectedLocaleIds.value.filter((id) => missing.includes(id)).length;
}

function draftCount(item: SplitViewItem) {
  const drafts = (item.draftLocaleIds as string[] | undefined) ?? [];

  return selectedLocaleIds.value.filter((id) => drafts.includes(id)).length;
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

const {
  data: detailData,
  isLoading: isDetailLoading,
  error: detailError,
  refetch: refetchDetail,
} = useTerminologyDetail(selectedTerminologyId);

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
  (terminology) => {
    if (terminology) registerTerminology(terminology);
  },
  { immediate: true },
);

const selectedUnsavedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter((localeId) =>
    unsavedLocaleIds.value.includes(localeId),
  ),
);

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

// Counts what is typed, not only what is saved, so the header follows along.
const definedCount = computed(
  () =>
    selectedLocaleIds.value.filter((id) =>
      (currentTerminologyForms.value[id] ?? "").trim(),
    ).length,
);

const canReview = computed(() => can.value("review_definition"));

const {
  isReviewing,
  rejecting,
  approve: approveDefinitions,
  requestReject,
  confirmReject,
} = useReviewActions({
  review: () => definitionStore.review,
  request: (terminologyIds, localeIds, decision, { comment }) => ({
    terminologyIds,
    localeIds,
    decision,
    comment,
  }),
  afterReview: () => Promise.all([refetch(), refetchDetail()]),
});

// The saved definition of a term in a language, with its review state.
function savedDefinition(terminologyId: string, localeId: string) {
  return knownTerminologies.value[terminologyId]?.definitions?.find(
    (definition) => definition.localeId === localeId,
  );
}

// Drafts of the open term in the shown languages, which can be approved at once.
const reviewableLocaleIds = computed(() => {
  const terminologyId = selectedTerminologyId.value;

  if (!terminologyId) return [];

  return selectedLocaleIds.value.filter(
    (localeId) =>
      savedDefinition(terminologyId, localeId)?.status ===
        "REVIEW_STATUS_DRAFT" && !isDefinitionDirty(terminologyId, localeId),
  );
});

// Saving updates an existing definition but creates a missing one, and the two
// need different permissions.
function canEditDefinition(terminologyId: string, localeId: string) {
  const exists = knownTerminologies.value[terminologyId]?.definitions?.some(
    (definition: Definition) => definition.localeId === localeId,
  );

  return can.value(exists ? "update_definition" : "create_definition");
}

const emptySelectedLocaleIds = computed(() =>
  selectedLocaleIds.value.filter(
    (id) =>
      id !== defaultLocale.value?.id &&
      !(currentTerminologyForms.value[id] ?? "").trim() &&
      canEditDefinition(String(selectedTerminology.value?.key), id),
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

const { getErrorMessage } = useErrorHelper();

async function handleSave() {
  const terminology = selectedTerminologyData.value;

  if (!terminology?.id || isSaving.value) return;

  const terminologyId = terminology.id;
  const localeIds = [...selectedUnsavedLocaleIds.value];

  if (!localeIds.length) return;
  await saveDefinitions(
    localeIds.map((localeId) => ({
      itemId: terminologyId,
      localeId,
      translation: definitionForms.value[terminologyId]?.[localeId] ?? "",
    })),
    t("terminologies.definitionLabel", { term: terminology.term ?? "" }),
  );
}
</script>

<template>
  <div v-if="isLoading && !data" class="flex items-center justify-center py-12">
    <div class="text-neutral-600 dark:text-neutral-400">
      {{ t("terminologies.loading") }}
    </div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>
      {{ t("terminologies.loadFailed", { error: getErrorMessage(error) }) }}
    </p>
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
          :placeholder="searchPlaceholder"
          :aria-label="t('terminologies.search')"
          shortcut="/"
        />
      </div>
      <EditorFiltersPopover
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
      <EditorRefreshStatus
        :refreshing="isFetching && !isFetchingNextPage && !isSaving"
        :failed="!!error"
        @retry="refetch()"
      />
    </div>
    <div class="relative flex flex-1 min-h-0 overflow-hidden">
      <SplitView
        :items="splitViewItems"
        :selected="selectedTerminology"
        virtual
        :has-more="hasNextPage"
        :loading="isFetchingNextPage"
        :total="terminologyTotal"
        class="editor-split-view w-full flex-1 min-w-0 gap-0 border-0 rounded-none bg-transparent dark:bg-transparent grid-cols-[minmax(200px,250px)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:grid-rows-[150px_minmax(0,1fr)]"
        @select="selectTerminology"
        @end-reached="fetchNextPage()"
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
            :draft-count="draftCount(item)"
            :draft-label="
              t(
                'review.draftCount',
                { count: draftCount(item) },
                draftCount(item),
              )
            "
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
                v-if="canReview"
                icon="seal-check"
                :label="
                  reviewableLocaleIds.length
                    ? t('review.approveShown')
                    : t('review.nothingToApprove')
                "
                :disabled="
                  isSaving || isReviewing || !reviewableLocaleIds.length
                "
                class="bg-neutral-100 dark:bg-white/5"
                @click="
                  approveDefinitions(
                    [String(selectedTerminologyId)],
                    reviewableLocaleIds,
                  )
                "
              />
              <BaseIconButton
                v-can="'update_terminology'"
                icon="pencil-simple"
                :label="t('terminologies.edit')"
                :disabled="isSaving"
                class="bg-neutral-100 dark:bg-white/5"
                @click="editDialogItem = selectedTerminologyData"
              />
              <BaseIconButton
                v-can="'delete_terminology'"
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
              :readonly="
                isSaving || !canEditDefinition(String(item.key), localeId)
              "
              :placeholder="t('terminologies.definitionPlaceholder')"
              :status="savedDefinition(String(item.key), localeId)?.status"
              :review-comment="
                savedDefinition(String(item.key), localeId)?.reviewComment
              "
              :can-review="canReview && !isReviewing"
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
              @approve="approveDefinitions([String(item.key)], [localeId])"
              @reject="
                requestReject(
                  String(item.key),
                  localeId,
                  localeOption(localeId)?.label ?? localeId,
                )
              "
            >
              <template v-if="localeId === defaultLocale?.id" #meta>
                <EditorCopyEmptyChip
                  v-can="{ any: ['create_definition', 'update_definition'] }"
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
        class="flex-[0_0_320px] min-w-0 max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:w-[min(340px,100%)] max-[1100px]:z-20 max-[1100px]:shadow-[-8px_0_24px_rgb(0_0_0/0.08)]"
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
            "common.selectedLanguages",
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
      <EditorWorkspaceActions
        v-can="{ any: ['create_definition', 'update_definition'] }"
        :unsaved-count="allUnsavedCount"
        :can-save="
          !!selectedTerminologyData && !!selectedUnsavedLocaleIds.length
        "
        :is-saving="isSaving"
        @discard-all="requestDiscardAll"
        @save="handleSave"
      />
    </div>
  </section>

  <EditorRejectDialog
    :open="!!rejecting"
    :language="rejecting?.language ?? ''"
    @close="rejecting = undefined"
    @confirm="confirmReject"
  />
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
