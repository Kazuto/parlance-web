<script setup lang="ts">
import {
  Button,
  Select,
  SplitView,
  type SplitViewItem,
  Textarea,
  Tooltip,
} from "@thkzt/eunoia";
import { useEntryList } from "~/composables/entry/useEntryList";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type { Localization } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

const router = useRouter();

usePage({
  width: "wide",
  layout: "workspace",
  title: "Entries",
  description: "Manage translation entries and content",
  backAction: {
    content: "Back to Dashboard",
    onClick: () => router.push("/"),
    icon: "arrow-left",
  },
});

const { data, isLoading, error, refetch } = useEntryList();
const { data: localeData, pagination } = useLocaleList();

pagination.value.perPage = 100;

const selectedLocaleIds = ref<string[]>([]);
const selectedEntry = ref<SplitViewItem>();
const search = ref("");
const isSaving = ref(false);

const localeOptions = computed(
  () =>
    localeData.value?.locales
      ?.filter((locale) => !!locale.id)
      .map((locale: Locale) => ({
        label: locale.name ?? locale.code ?? "",
        value: locale.id ?? "",
      })) ?? [],
);

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

  isSaving.value = true;
  try {
    await Promise.all(
      selectedLocaleIds.value.map((localeId) => {
        const translation =
          localizationForms.value[entryId]?.[String(localeId)] ?? "";
        const existing = entry.localizations?.find(
          (localization: Localization) =>
            localization.localeId === String(localeId),
        );

        if (existing) {
          return updateLocalization(
            { id: existing.id, translation },
            {
              onSuccess: () => {
                toast.add(`Translations for ${entry.key} updated`, {
                  variant: "success",
                });
              },
              onError: () => {
                toast.add(`Failed to update translations for ${entry.key}`, {
                  variant: "danger",
                });
              },
            },
          );
        } else {
          return createLocalization(
            {
              entryId,
              localeId: String(localeId),
              translation,
            },
            {
              onSuccess: () => {
                toast.add(`Translations for ${entry.key} created`, {
                  variant: "success",
                });
              },
              onError: () => {
                toast.add(`Failed to create translations for ${entry.key}`, {
                  variant: "danger",
                });
              },
            },
          );
        }
      }),
    );

    await refetch();
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">Loading entries...</div>
  </div>

  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">Failed to load entries: {{ error.message }}</p>
    <Button ghost @click="() => refetch()">Try again</Button>
  </div>

  <section
    v-else-if="data"
    class="entry-workspace"
    aria-label="Translation workspace"
  >
    <div class="locale-toolbar">
      <span class="text-sm font-medium">Languages to translate</span>
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
          <h2 class="break-words font-semibold">
            {{ item?.label ?? "Select an entry" }}
          </h2>
          <p
            v-if="selectedEntryData?.description"
            class="mt-1 line-clamp-2 text-sm text-neutral-500"
          >
            {{ selectedEntryData.description }}
          </p>
        </template>
        <template #default="{ item }">
          <div
            v-if="item && selectedLocaleIds.length > 0"
            class="mx-auto flex w-full flex-col gap-6"
          >
            <div v-for="localeId in selectedLocaleIds" :key="localeId">
              <Textarea
                :disabled="isSaving"
                :model-value="currentEntryForms[String(localeId)] ?? ''"
                :placeholder="`Enter translation`"
                @update:model-value="
                  setLocalizationForm(String(item.key), localeId, $event)
                "
              >
                {{
                  localeOptions.find((locale) => locale.value === localeId)
                    ?.label
                }}
              </Textarea>
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
  </section>
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
