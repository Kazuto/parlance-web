<script setup lang="ts">
const authStore = useAuthStore();

const cards = [
  {
    title: "Locales",
    description: "Manage languages and regional variants",
    icon: "🌍",
    href: "/locales",
    permission: "read_locale",
    color: "blue",
  },
  {
    title: "Entries",
    description: "Manage translation entries and content",
    icon: "📝",
    href: "/entries",
    permission: "read_entry",
    color: "green",
  },
  {
    title: "Terminology",
    description: "Manage glossary and terminology",
    icon: "📚",
    href: "/terminology",
    permission: "manage_terminology",
    color: "purple",
  },
  {
    title: "Users",
    description: "Manage users and permissions",
    icon: "👥",
    href: "/users",
    permission: "manage_users",
    color: "orange",
  },
];

const { can } = usePermission();

const visibleCards = computed(() =>
  cards.filter((card) => can.value(card.permission)),
);
</script>

<template>
  <div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          Welcome back, {{ authStore.user?.name }}!
        </h1>
        <p class="mt-2 text-gray-600">
          Here's what you can do in Parlance today.
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <svg
                class="w-6 h-6 text-blue-600"
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
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Locales</p>
              <p class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <svg
                class="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Entries</p>
              <p class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
              <svg
                class="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Pending</p>
              <p class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0 bg-purple-100 rounded-lg p-3">
              <svg
                class="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Completed</p>
              <p class="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <NuxtLink
            v-for="card in visibleCards"
            :key="card.href"
            :to="card.href"
            class="group bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 border-2 border-transparent hover:border-blue-500"
          >
            <div class="flex items-start">
              <div
                class="text-4xl mb-3"
                :class="`group-hover:scale-110 transition-transform`"
              >
                {{ card.icon }}
              </div>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ card.title }}
            </h3>
            <p class="text-sm text-gray-600">
              {{ card.description }}
            </p>
            <div
              class="mt-4 flex items-center text-blue-600 text-sm font-medium"
            >
              <span>Open</span>
              <svg
                class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </NuxtLink>
        </div>

        <!-- No Access Message -->
        <div
          v-if="visibleCards.length === 0"
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
        >
          <p class="text-yellow-800">
            You don't have permission to access any sections yet. Please contact
            your administrator.
          </p>
        </div>
      </div>

      <!-- Recent Activity (Placeholder) -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-gray-500 text-center py-8">
            No recent activity to display
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
