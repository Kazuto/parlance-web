<script setup lang="ts">
import type { Definition } from "~/lib/api/schemas/DefinitionSchema";
import type { Terminology } from "~/lib/api/schemas/TerminologySchema";

const { list } = useTerminologyStore();

const { data, isLoading, error, refetch } = list;

const { locales, setCurrentLocale, currentLocaleId, findByLocale } =
  useCurrentLocale();

const tableHeaders = [
  {
    title: "Term",
    key: "term",
  },
  {
    title: "Description",
    key: "description",
  },
  {
    title: "Definition",
    key: "definition",
  },
  { title: "Created", key: "createdAt" },
];

const findTranslation = (terminology: Terminology) => {
  const definition = findByLocale(terminology.definitions) as Definition | null;

  if (!definition) return "";

  return definition.translation;
};

const tableItems = computed(() => {
  if (!data?.terminologies) return [];

  return data.terminologies.map((terminology: Terminology) => ({
    term: terminology.term,
    description: terminology.description,
    definition: findTranslation(terminology),
    createdAt: new Date(terminology.createdAt).toLocaleDateString(),
  }));
});
</script>

<template>
  <div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Terminologies</h1>
            <p class="mt-2 text-sm text-gray-600">Manage your glossary</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-gray-600">Loading terminologies...</div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-red-800">
          Failed to load terminologies: {{ error.message }}
        </p>
        <button
          class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          @click="() => refetch()"
        >
          Try again
        </button>
      </div>

      <div v-else-if="data?.terminologies" class="bg-white rounded-lg shadow">
        <div class="px-6 py-4">
          <CoreButton
            v-for="locale in locales"
            :key="locale.id"
            :class="{
              'bg-blue-100 text-blue-600 hover:bg-blue-200':
                locale.id === currentLocaleId,
            }"
            @click="setCurrentLocale(locale)"
          >
            {{ locale.name }}
          </CoreButton>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <CoreTable :headers="tableHeaders" :items="tableItems" />
        </div>

        <!-- Empty State -->
        <div
          v-if="data?.terminologies.length === 0"
          class="px-6 py-12 text-center"
        >
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
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
          <h3 class="mt-2 text-sm font-medium text-gray-900">
            No terminologies
          </h3>
        </div>
      </div>
    </div>
  </div>
</template>
