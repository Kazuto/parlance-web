<script setup lang="ts">
import {
  Button,
  Card,
  DataTable,
  RadioGroup,
  type DataTableColumn,
} from "@thkzt/eunoia";
import { useEntryList } from "~/composables/entry/useEntryList";
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

const { data, isLoading, error, refetch } = useEntryList();

const { locales, setCurrentLocale, findByLocale } = useCurrentLocale();

const selectedLocaleId = ref(locales.value[0]?.id ?? "");

watch(selectedLocaleId, () => {
  const selectedLocale = locales.value.find(
    (locale: Locale) => locale.id === selectedLocaleId.value,
  );

  if (!selectedLocale) return;

  setCurrentLocale(selectedLocale);
});

const localeOptions = computed(() =>
  locales.value.map((locale: Locale) => ({
    label: locale.name,
    value: locale.id,
  })),
);

const tableColumns: DataTableColumn<Entry>[] = [
  {
    title: "Key",
    key: "key",
    sortable: true,
  },
  {
    title: "Description",
    key: "description",
    sortable: true,
  },
  {
    title: "Translation",
    key: "localization",
    sortable: true,
    value: (item: Entry) => findTranslation(item),
  },
  {
    title: "Created",
    key: "createdAt",
    sortable: true,
    value: (item: Entry) => new Date(item.createdAt).toLocaleDateString(),
  },
];

const findTranslation = (entry: Entry) => {
  const localization = findByLocale(entry.localizations) as Localization | null;

  if (!localization) return "";

  return localization.translation;
};

const tableItems = computed(() => data.value?.entries ?? []);
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">Loading entries...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">Failed to load entries: {{ error.message }}</p>
    <Button ghost @click="() => refetch()"> Try again </Button>
  </div>

  <div v-else-if="data?.entries">
    <div class="mb-4">
      <RadioGroup v-model="selectedLocaleId" :options="localeOptions" />
    </div>

    <!-- Table -->
    <Card class="overflow-x-auto">
      <DataTable :columns="tableColumns" :items="tableItems">
        <template #createdAt="{ item }">
          <RelativeTime :timestamp="item.createdAt" />
        </template>
      </DataTable>
    </Card>

    <!-- Empty State -->
    <Card v-if="data?.entries.length === 0">
      <svg
        class="mx-auto h-12 w-12 text-neutral-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-neutral-900">No entries</h3>
    </Card>
  </div>
</template>
