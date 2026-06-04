<script setup lang="ts">
import type { Locale } from "~/lib/api/schemas/LocaleSchema";

const { list } = useLocaleStore();

const { data, isLoading, error, refetch } = list;

const defaultLocale = computed(() =>
  data?.locales.find((locale: Locale) => locale.isDefault),
);

const tableHeaders = [
  {
    title: "Code",
    key: "code",
  },
  {
    title: "Name",
    key: "name",
  },
  { title: "Default", key: "isDefault" },
  { title: "Created", key: "createdAt" },
  { title: "Actions", key: "actions" },
];

const tableItems = computed(() => {
  if (!data?.locales) return [];

  return data?.locales.map((locale: Locale) => ({
    code: locale.code,
    name: locale.name,
    isDefault: locale.isDefault,
    createdAt: new Date(locale.createdAt).toLocaleDateString(),
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
            <h1 class="text-3xl font-bold text-gray-900">Locales</h1>
            <p class="mt-2 text-sm text-gray-600">
              Manage languages and regional variants for your translations
            </p>
          </div>
          <button
            v-can="'create_locale'"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            @click="showCreateModal = true"
          >
            Create Locale
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-gray-600">Loading locales...</div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-red-800">Failed to load locales: {{ error.message }}</p>
        <button
          class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          @click="() => refetch()"
        >
          Try again
        </button>
      </div>

      <!-- Locales List -->
      <div v-else-if="data?.locales" class="bg-white rounded-lg shadow">
        <!-- Default Locale Banner -->
        <div
          v-if="defaultLocale"
          class="px-6 py-4 bg-blue-50 border-b border-blue-100"
        >
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-sm text-blue-800">
              <strong>{{ defaultLocale.code }}</strong> is set as the default
              locale
            </span>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <CoreTable :headers="tableHeaders" :items="tableItems" />
        </div>

        <!-- Empty State -->
        <div v-if="data.locales.length === 0" class="px-6 py-12 text-center">
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
          <h3 class="mt-2 text-sm font-medium text-gray-900">No locales</h3>
        </div>
      </div>
    </div>
  </div>
</template>
