<script setup lang="ts">
import {
  Button,
  Card,
  DataTable,
  RadioGroup,
  type DataTableColumn,
} from "@thkzt/eunoia";
import { useTerminologyList } from "~/composables/terminology/useTerminologyList";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

const { t } = useI18n();

usePage({
  width: "wide",
  title: t("nav.terminologies"),
  description: t("terminologies.description"),
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
  locales.value
    .filter((locale) => !!locale.id)
    .map((locale: Locale) => ({
      label: locale.name ?? locale.code ?? "",
      value: locale.id ?? "",
    })),
);

const tableColumns: DataTableColumn<Terminology>[] = [
  {
    title: t("terminologies.term"),
    key: "term",
    sortable: true,
  },
  {
    title: t("common.description"),
    key: "description",
    sortable: true,
  },
  {
    title: t("terminologies.definition"),
    key: "definition",
    sortable: true,
    value: (item: Terminology) => findTranslation(item),
  },
  {
    title: t("common.created"),
    key: "createdAt",
    sortable: true,
    value: (item: Terminology) =>
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
  },
];

const findTranslation = (terminology: Terminology) => {
  const definition = findByLocale(terminology.definitions ?? []);

  if (!definition) return "";

  return definition.translation ?? "";
};

const tableItems = computed(() => data.value?.terminologies ?? []);
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">{{ t("terminologies.loading") }}</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">
      {{ t("terminologies.loadFailed", { error: error.message }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </div>

  <div v-else-if="data">
    <div class="mb-4">
      <RadioGroup v-model="selectedLocaleId" :options="localeOptions" />
    </div>

    <!-- Table -->
    <Card class="overflow-x-auto">
      <DataTable :columns="tableColumns" :items="tableItems">
        <template #createdAt="{ item }">
          <RelativeTime v-if="item.createdAt" :timestamp="item.createdAt" />
        </template>
      </DataTable>
    </Card>

    <!-- Empty State -->
    <Card v-if="tableItems.length === 0">
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
        {{ t("terminologies.empty") }}
      </h3>
    </Card>
  </div>
</template>
