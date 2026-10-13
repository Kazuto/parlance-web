<script setup lang="ts">
import {
  Button,
  Select,
  SplitView,
  type SplitViewItem,
  Textarea,
  Tooltip,
  Pagination,
  Badge,
} from "@thkzt/eunoia";
import { useEntryList } from "~/composables/entry/useEntryList";
import { watchDebounced } from "@vueuse/core";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type { Localization } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

const router = useRouter();
const showCreateDialog = ref(false);
const deleteDialogItem = ref<Entry>();
const editDialogItem = ref<Entry>();

function handleEntryUpdated(entry: Entry) {
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
  title: "Entries",
  description: "Manage translation entries and content",
  primaryAction: {
    content: "Create Entry",
    icon: "plus",
    onClick: () => (showCreateDialog.value = true),
  },
  secondaryActions: [
    {
      content: "Import entries",
      icon: "upload",
      onClick: () => openTransfer("import"),
    },
    {
      content: "Export entries",
      icon: "download",
      onClick: () => openTransfer("export"),
    },
  ],
  backAction: {
    content: "Back to Dashboard",
    onClick: () => router.push("/"),
    icon: "arrow-left",
  },
});

const {
  data,
  isLoading,
  isFetching,
  error,
  refetch,
  pagination: entryPagination,
  filter,
} = useEntryList(100);
const { data: localeData, pagination } = useLocaleList();

pagination.value.perPage = 100;

const selectedLocaleIds = ref<string[]>([]);
const selectedEntry = ref<SplitViewItem>();
const search = ref("");
const isSaving = ref(false);

watchDebounced(
  search,
  (value) => {
    filter.value.search = value;
    entryPagination.value.page = 1;
  },
  { debounce: 350 },
);

async function handleCreated(entry: Entry) {
  search.value = "";
  filter.value.search = "";
  filter.value.sort = "created_at";
  filter.value.order = "desc";
  entryPagination.value.page = 1;
  await refetch();
  selectedEntry.value = { key: entry.id ?? "", label: entry.key ?? "" };
}

async function handleDeleted() {
  selectedEntry.value = undefined;
  if (
    (data.value?.entries?.length ?? 0) <= 1 &&
    (entryPagination.value.page ?? 1) > 1
  ) {
    entryPagination.value.page = (entryPagination.value.page ?? 1) - 1;
  }
  await refetch();
}

const defaultLocale = computed(() =>
  localeData.value?.locales?.find((locale) => locale.isDefault),
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

const allLanguagesSelected = computed(
  () =>
    localeOptions.value.length > 0 &&
    localeOptions.value.every((locale) =>
      selectedLocaleIds.value.includes(locale.value),
    ),
);

function toggleAllLanguages() {
  selectedLocaleIds.value = allLanguagesSelected.value
    ? []
    : localeOptions.value.map((locale) => locale.value);
}

const splitViewItems = computed((): SplitViewItem[] => {
  if (!data.value?.entries) return [];

  return data.value.entries
    .filter((entry) => !!entry.id)
    .map((entry: Entry) => ({
      key: entry.id ?? "",
      label: entry.key ?? "",
    }));
});

const selectedEntryData = computed(() =>
  data.value?.entries?.find(
    (entry: Entry) => entry.id === selectedEntry.value?.key,
  ),
);

watch(
  splitViewItems,
  (items) => {
    if (!items.some((item) => item.key === selectedEntry.value?.key)) {
      selectedEntry.value = items[0];
    }
  },
  { immediate: true },
);

const hasInitializedLocales = ref(false);
watch(
  localeData,
  (response) => {
    if (hasInitializedLocales.value || !response?.locales?.length) return;
    const locale =
      response.locales.find((item) => item.isDefault) ?? response.locales[0];
    if (locale?.id) {
      selectedLocaleIds.value = [locale.id];
      hasInitializedLocales.value = true;
    }
  },
  { immediate: true },
);

// localizationForms keyed by entryId -> localeId -> translation
const localizationForms = ref<Record<string, Record<string, string>>>({});

watchEffect(() => {
  if (!data.value?.entries) return;

  localizationForms.value = Object.fromEntries(
    data.value.entries
      .filter((entry) => !!entry.id)
      .map((entry: Entry) => [
        entry.id,
        Object.fromEntries(
          (entry.localizations ?? [])
            .filter((localization) => !!localization.localeId)
            .map((localization: Localization) => [
              String(localization.localeId),
              localization.translation ?? "",
            ]),
        ),
      ]),
  );
});

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

function getLocalizationForm(entryId: string, localeId: string): string {
  const result =
    localizationForms.value[String(entryId)]?.[String(localeId)] ?? "";

  return result;
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
  const localeIds = [...selectedLocaleIds.value];

  isSaving.value = true;
  try {
    const results = await Promise.allSettled(
      localeIds.map((localeId) => {
        const translation =
          localizationForms.value[entryId]?.[String(localeId)] ?? "";
        const existing = entry.localizations?.find(
          (localization: Localization) =>
            localization.localeId === String(localeId),
        );

        if (existing) {
          return updateLocalization({ id: existing.id, translation });
        } else {
          return createLocalization({
            entryId,
            localeId: String(localeId),
            translation,
          });
        }
      }),
    );

    const failedLanguages = results.flatMap((result, index) => {
      if (result.status !== "rejected") return [];
      const localeId = localeIds[index];
      return [
        localeOptions.value.find((locale) => locale.value === localeId)
          ?.label ?? localeId,
      ];
    });
    const failed = failedLanguages.length;
    if (failed === 0) {
      toast.add(`Translations for ${entry.key} saved`, { variant: "success" });
    } else {
      toast.add(
        `Saved ${results.length - failed} of ${results.length} translations for ${entry.key}. Failed: ${failedLanguages.join(", ")}`,
        { variant: failed === results.length ? "danger" : "warning" },
      );
    }

    await refetch();
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="isLoading && !data" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">Loading entries...</div>
  </div>

  <div
    v-else-if="error && !data"
    class="bg-red-50 border border-red-200 rounded-lg p-4"
  >
    <p class="text-red-800">Failed to load entries: {{ error.message }}</p>
    <Button ghost @click="() => refetch()">Try again</Button>
  </div>

  <section
    v-else-if="data"
    class="entry-workspace"
    aria-label="Translation workspace"
    :aria-busy="isFetching"
  >
    <div class="locale-toolbar">
      <span class="text-sm font-medium">Languages to translate</span>
      <span v-if="isFetching" role="status" class="text-xs text-neutral-500">
        Refreshing entries…
      </span>
      <span v-else-if="error" role="alert" class="text-xs text-red-600">
        Could not refresh entries.
        <button type="button" class="underline" @click="() => refetch()">
          Retry
        </button>
      </span>
      <div class="locale-selector">
        <Select
          v-model="selectedLocaleIds"
          multiple
          :disabled="isSaving"
          aria-label="Languages to translate"
          :options="localeOptions"
          placeholder="Select locales to translate"
        />
      </div>
      <Button
        type="button"
        ghost
        dense
        :disabled="isSaving || !localeOptions.length"
        @click="toggleAllLanguages"
      >
        {{
          allLanguagesSelected
            ? "Deselect all languages"
            : "Select all languages"
        }}
      </Button>
    </div>
    <div class="editor-panels">
      <SplitView
        v-model:search="search"
        :items="splitViewItems"
        :selected="selectedEntry"
        searchable
        class="entry-split-view"
        @select="!isSaving && (selectedEntry = $event)"
      >
        <template #item="{ item }">
          <span class="flex min-w-0 w-full items-center justify-between gap-3">
            <span class="truncate" :title="item.label">{{ item.label }}</span>
            <Tooltip
              v-if="
                selectedLocaleIds.some(
                  (localeId) =>
                    !getLocalizationForm(String(item.key), localeId),
                )
              "
              content="Missing translations"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full bg-rose-400"
                aria-label="Missing translations"
              />
            </Tooltip>
          </span>
        </template>
        <template #header="{ item }">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="break-words font-semibold">
                {{ item?.label ?? "Select an entry" }}
              </h2>
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
            v-if="item && selectedLocaleIds.length > 0"
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
                  <Badge v-if="localeId === defaultLocale?.id">Default</Badge>
                </label>
                <Button
                  v-if="localeId === defaultLocale?.id"
                  type="button"
                  ghost
                  dense
                  icon="copy"
                  :disabled="!canFillEmptyTranslations"
                  @click="fillEmptyTranslations"
                >
                  Copy to empty languages
                </Button>
              </div>
              <Textarea
                :id="`entry-${item.key}-${localeId}`"
                :aria-label="
                  localeOptions.find((locale) => locale.value === localeId)
                    ?.label
                "
                :disabled="isSaving"
                :model-value="currentEntryForms[String(localeId)] ?? ''"
                :placeholder="`Enter translation`"
                @update:model-value="
                  setLocalizationForm(String(item.key), localeId, $event)
                "
              />
            </div>
          </div>

          <div
            v-else
            class="flex h-full items-center justify-center text-center text-neutral-500 text-sm"
          >
            {{
              item
                ? "Select one or more languages above to start translating."
                : "Select an entry to start translating."
            }}
          </div>
        </template>
        <template #footer="{ item }">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-neutral-500"
              >{{ selectedLocaleIds.length }}
              {{
                selectedLocaleIds.length === 1
                  ? "language selected"
                  : "languages selected"
              }}</span
            >
            <Button
              primary
              :disabled="!item || !selectedLocaleIds.length || isSaving"
              @click="handleSave"
            >
              {{ isSaving ? "Saving…" : "Save changes" }}
            </Button>
          </div>
        </template>
      </SplitView>
    </div>
    <div
      class="shrink-0 border-t border-neutral-200 px-4 py-2 dark:border-neutral-700"
    >
      <Pagination
        :current="entryPagination.page ?? 1"
        :per-page="entryPagination.perPage ?? 10"
        :total="data.pagination?.totalPages ?? 0"
        @update:current="entryPagination.page = $event"
        @update:per-page="
          entryPagination.perPage = $event;
          entryPagination.page = 1;
        "
      />
    </div>
  </section>
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

.locale-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-neutral-200);
}

.locale-selector {
  flex: 1;
  min-width: 0;
}

/* Keep selected chips inside a bounded control; the dropdown remains outside it. */
.locale-selector :deep([role="combobox"]) {
  max-height: 6rem;
  overflow-y: auto;
}

.editor-panels {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.entry-split-view {
  width: 100%;
  grid-template-columns: minmax(220px, 290px) minmax(0, 1fr);
  gap: 0;
  border: 0;
  border-radius: 0;
}

.entry-split-view :deep(> *) {
  grid-column: span 1;
}

@media (max-width: 640px) {
  .locale-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .entry-split-view {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 150px minmax(0, 1fr);
  }
}

:global(.dark) .entry-workspace {
  background: var(--color-neutral-800);
  border-color: var(--color-neutral-700);
}

:global(.dark) .locale-toolbar {
  border-color: var(--color-neutral-700);
}
</style>
