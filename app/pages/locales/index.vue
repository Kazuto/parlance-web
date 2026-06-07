<script setup lang="ts">
import {
  DataTable,
  type DataTableColumn,
  Button,
  Alert,
  Card,
  Badge,
  Tooltip,
  Icon,
} from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/LocaleSchema";

const store = useLocaleStore();

const { data, isLoading, error } = storeToRefs(store);
const { refetch } = store;

const router = useRouter();

const defaultLocale = computed(() =>
  data.value?.locales.find((locale: Locale) => locale.isDefault),
);

const tableColumns: DataTableColumn<Locale>[] = [
  {
    title: "Code",
    key: "code",
    sortable: true,
  },
  {
    title: "Name",
    key: "name",
    sortable: true,
  },
  {
    title: "Created",
    key: "createdAt",
    sortable: true,
  },
  {
    title: "Updated",
    key: "updatedAt",
    sortable: true,
  },
];

const tableItems = computed(() => data.value?.locales ?? []);

const showDialog = ref(false);
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900">Locales</h1>
        <p class="mt-2 text-sm text-neutral-600">
          Manage languages and regional variants for your translations
        </p>
      </div>
      <Button v-can="'create_locale'" primary @click="showDialog = true">
        Create Locale
      </Button>
    </div>
  </div>

  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">Loading locales...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">Failed to load locales: {{ error.message }}</p>
    <Button ghost @click="() => refetch()"> Try again </Button>
  </div>

  <!-- Locales List -->
  <div v-else-if="data?.locales">
    <!-- Default Locale Banner -->
    <Alert v-if="defaultLocale" persistent variant="info" class="mb-4">
      <div class="flex items-center">
        <svg
          class="w-5 h-5"
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
        <span class="text-sm">
          <strong>{{ defaultLocale.code }}</strong> is set as the default locale
        </span>
      </div>
    </Alert>

    <!-- Table -->
    <Card class="overflow-x-auto">
      <DataTable :columns="tableColumns" :items="tableItems">
        <template #name="{ item }">
          <div class="flex items-center gap-2">
            <span>{{ item.name }}</span>
            <Tooltip
              v-if="item.isDefault"
              content="Default"
              placement="top"
              class="inline-flex"
            >
              <Badge variant="success" class="p-1 w-6 h-6 rounded-full">
                <Icon name="check" class="w-4 h-4" />
              </Badge>
            </Tooltip>
          </div>
        </template>
        <template #createdAt="{ item }">
          <RelativeTime :timestamp="item.createdAt" />
        </template>
        <template #updatedAt="{ item }">
          <RelativeTime :timestamp="item.updatedAt" />
        </template>
        <template #actions="{ item }">
          <div class="flex items-center justify-end gap-2">
            <Button
              ghost
              icon="eye"
              @click="() => router.push(`/locales/${item.id}`)"
            />
            <Button destructive icon="trash" />
          </div>
        </template>
      </DataTable>
    </Card>

    <!-- Empty State -->
    <Card v-if="data.locales.length === 0">
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
      <h3 class="mt-2 text-sm font-medium text-neutral-900">No locales</h3>
      <p class="mt-1 text-sm text-neutral-500">
        Get started by creating a new locale.
      </p>
      <div class="mt-6">
        <button
          v-can="'create_locale'"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          @click="showDialog = true"
        >
          Create Locale
        </button>
      </div>
    </Card>
  </div>

  <DialogCreateLocale v-model="showDialog" @close="showDialog = false" />
</template>
