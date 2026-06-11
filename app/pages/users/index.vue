<script setup lang="ts">
import { Button, Card, DataTable, type DataTableColumn } from "@thkzt/eunoia";
import { useUserList } from "~/composables/user/useUserList";
import type { User } from "~/lib/api";
import type { Role } from "~/lib/api/schemas/RoleSchema";

const { data, isLoading, error, refetch } = useUserList();

const tableColumns: DataTableColumn<User>[] = [
  {
    title: "Name",
    key: "name",
    sortable: true,
  },
  {
    title: "Roles",
    key: "roles",
    sortable: true,
    value: (item: User) => item.roles.map((role: Role) => role.name).join(", "),
  },
  {
    title: "Created",
    key: "createdAt",
    sortable: true,
    value: (item: User) => new Date(item.createdAt).toLocaleDateString(),
  },
];

const tableItems = computed(() => data.value?.users ?? []);
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900">Users</h1>
        <p class="mt-2 text-sm text-neutral-600">Manage the users</p>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">Loading users...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">Failed to load users: {{ error.message }}</p>
    <Button ghost @click="() => refetch()"> Try again </Button>
  </div>

  <div v-else-if="data?.users">
    <!-- Table -->
    <Card class="overflow-x-auto">
      <DataTable :columns="tableColumns" :items="tableItems">
        <template #createdAt="{ item }">
          <RelativeTime :timestamp="item.createdAt" />
        </template>
      </DataTable>
    </Card>

    <!-- Empty State -->
    <Card v-if="data?.users.length === 0">
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
      <h3 class="mt-2 text-sm font-medium text-neutral-900">No users</h3>
    </Card>
  </div>
</template>
