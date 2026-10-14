<script setup lang="ts">
import { Button, Card, DataTable, type DataTableColumn } from "@thkzt/eunoia";
import { useUserList } from "~/composables/user/useUserList";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";

const { t } = useI18n();

usePage({
  width: "wide",
  title: t("nav.users"),
  description: t("users.description"),
});

const { data, isLoading, error, refetch } = useUserList();

const tableColumns: DataTableColumn<User>[] = [
  {
    title: t("common.name"),
    key: "name",
    sortable: true,
  },
  {
    title: t("nav.roles"),
    key: "roles",
    sortable: true,
    value: (item: User) =>
      (item.roles ?? []).map((role: Role) => role.name).join(", "),
  },
  {
    title: t("common.created"),
    key: "createdAt",
    sortable: true,
    value: (item: User) =>
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
  },
];

const tableItems = computed(() => data.value?.users ?? []);
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">{{ t("users.loading") }}</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">
      {{ t("users.loadFailed", { error: error.message }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </div>

  <div v-else-if="data">
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
        {{ t("users.empty") }}
      </h3>
    </Card>
  </div>
</template>
