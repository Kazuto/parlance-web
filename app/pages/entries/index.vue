<script setup lang="ts">
import {
  Button,
  Card,
  Select,
  SplitView,
  type SplitViewItem,
  Textarea,
  Tooltip,
} from "@thkzt/eunoia";
import { useEntryList } from "~/composables/entry/useEntryList";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Entry } from "~/lib/api/schemas/EntrySchema";
import type { Locale } from "~/lib/api/schemas/LocaleSchema";
import type { Localization } from "~/lib/api/schemas/LocalizationSchema";

const router = useRouter();

usePage({
  width: "wide",
  title: "Entries",
  description: "Manage translation entries and content",
  backAction: {
    content: "Back to Dashboard",
    onClick: () => router.push("/"),
    icon: "arrow-left",
  },
});

const { data, isLoading, filter, error, refetch } = useEntryList();
const { data: localeData, pagination } = useLocaleList();

pagination.value.perPage = 100;

const selectedLocaleIds = ref<string[]>([]);
const selectedEntry = ref<SplitViewItem>();

const localeOptions = computed(
  () =>
    localeData.value?.locales.map((locale: Locale) => ({
      label: locale.name,
      value: locale.id,
    })) ?? [],
);

const splitViewItems = computed((): SplitViewItem[] => {
  if (!data.value?.entries) return [];

  return data.value.entries.map((entry: Entry) => ({
    key: entry.id,
    label: entry.key,
  }));
});

const selectedEntryData = computed(() =>
  data.value?.entries.find(
    (entry: Entry) => entry.id === selectedEntry.value?.key,
  ),
);

// localizationForms keyed by entryId -> localeId -> translation
const localizationForms = ref<Record<string, Record<string, string>>>({});

watchEffect(() => {
  if (!data.value?.entries) return;

  localizationForms.value = Object.fromEntries(
    data.value.entries.map((entry: Entry) => [
      entry.id,
      Object.fromEntries(
        entry.localizations.map((localization: Localization) => [
          String(localization.localeId),
          localization.translation,
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
  if (!value) return;

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
  if (!entry) return;

  await Promise.all(
    selectedLocaleIds.value.map((localeId) => {
      const translation =
        localizationForms.value[entry.id]?.[String(localeId)] ?? "";
      const existing = entry.localizations.find(
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
            entryId: entry.id,
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

  <template v-else-if="data?.entries">
    <Card>
      <div class="space-y-4">
        <Select
          v-model="selectedLocaleIds"
          multiple
          :options="localeOptions"
          placeholder="Select locales to translate"
        />

        <SplitView
          :items="splitViewItems"
          :selected="selectedEntry"
          searchable
          @search="filter.search = $event"
          @select="selectedEntry = $event"
        >
          <template #item="{ item }">
            <span class="flex gap-4 w-full items-center justify-between">
              {{ item.label }}

              <Tooltip
                v-if="
                  selectedLocaleIds.some(
                    (localeId) =>
                      !getLocalizationForm(String(item.key), localeId),
                  )
                "
                content="Missing translations"
              >
                <span class="w-3 h-3 rounded-full bg-red-400" />
              </Tooltip>
            </span>
          </template>

          <template #default="{ item }">
            <div
              v-if="item && selectedLocaleIds.length > 0"
              class="flex flex-col gap-4"
            >
              <div v-for="localeId in selectedLocaleIds" :key="localeId">
                <Textarea
                  :value="currentEntryForms[String(localeId)] ?? ''"
                  :placeholder="`Enter translation`"
                  @update:model-value="
                    setLocalizationForm(
                      String(selectedEntry!.key),
                      localeId,
                      $event,
                    )
                  "
                >
                  {{
                    localeOptions.find((locale) => locale.value === localeId)
                      ?.label
                  }}
                </Textarea>
              </div>

              <div class="flex justify-end">
                <Button primary @click="handleSave">Save</Button>
              </div>
            </div>

            <div
              v-else-if="item && selectedLocaleIds.length === 0"
              class="text-neutral-400 text-sm"
            >
              Select one or more locales above to start translating.
            </div>
          </template>
        </SplitView>
      </div>
    </Card>
  </template>
</template>
