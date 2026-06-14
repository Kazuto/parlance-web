<script setup lang="ts">
import {
  Button,
  Card,
  DataTable,
  RadioGroup,
  type DataTableColumn,
} from "@thkzt/eunoia";
import { useTerminologyList } from "~/composables/terminology/useTerminologyList";
import type { Definition } from "~/lib/api/schemas/DefinitionSchema";
import type { Locale } from "~/lib/api/schemas/LocaleSchema";
import type { Terminology } from "~/lib/api/schemas/TerminologySchema";

const router = useRouter();

usePage({
  width: "wide",
  title: "Terminologies",
  description: "Manage glossary and terminology",
  backAction: {
    content: "Back to Dashboard",
    onClick: () => router.push("/"),
    icon: "arrow-left",
  },
});

const { data, isLoading, error, refetch } = useTerminologyList();

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

const tableColumns: DataTableColumn<Terminology>[] = [
  {
    title: "Term",
    key: "term",
    sortable: true,
  },
  {
    title: "Description",
    key: "description",
    sortable: true,
  },
  {
    title: "Definition",
    key: "definition",
    sortable: true,
    value: (item: Terminology) => findTranslation(item),
  },
  {
    title: "Created",
    key: "createdAt",
    sortable: true,
    value: (item: Terminology) => new Date(item.createdAt).toLocaleDateString(),
  },
];

const findTranslation = (terminology: Terminology) => {
  const definition = findByLocale(terminology.definitions) as Definition | null;

  if (!definition) return "";

  return definition.translation;
};

const tableItems = computed(() => data.value?.terminologies ?? []);
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">Loading terminologies...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">
      Failed to load terminologies: {{ error.message }}
    </p>
    <Button ghost @click="() => refetch()"> Try again </Button>
  </div>

  <div v-else-if="data?.terminologies">
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
    <Card v-if="data?.terminologies.length === 0">
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
      <h3 class="mt-2 text-sm font-medium text-neutral-900">
        No terminologies
      </h3>
    </Card>
  </div>
</template>
