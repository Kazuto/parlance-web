<script setup lang="ts">
import type { User } from "~/lib/api";
import type { Role } from "~/lib/api/schemas/RoleSchema";

const { list } = useUserStore();

const { data, isLoading, error, refetch } = list;

const tableHeaders = [
  {
    title: "Name",
    key: "name",
  },
  {
    title: "Roles",
    key: "roles",
  },
  { title: "Created", key: "createdAt" },
];

const tableItems = computed(() => {
  if (!data?.users) return [];

  return data.users.map((user: User) => ({
    name: user.name,
    roles: user.roles.map((role: Role) => role.name).join(", "),
    createdAt: new Date(user.createdAt).toLocaleDateString(),
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
            <h1 class="text-3xl font-bold text-gray-900">Users</h1>
            <p class="mt-2 text-sm text-gray-600">Manage the users</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-gray-600">Loading users...</div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-red-800">Failed to load users: {{ error.message }}</p>
        <button
          class="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          @click="() => refetch()"
        >
          Try again
        </button>
      </div>

      <div v-else-if="data?.users" class="bg-white rounded-lg shadow">
        <!-- Table -->
        <div class="overflow-x-auto">
          <CoreTable :headers="tableHeaders" :items="tableItems" />
        </div>

        <!-- Empty State -->
        <div v-if="data?.users.length === 0" class="px-6 py-12 text-center">
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
          <h3 class="mt-2 text-sm font-medium text-gray-900">No users</h3>
        </div>
      </div>
    </div>
  </div>
</template>
