<script setup lang="ts">
import { Card } from "@thkzt/eunoia";

const authStore = useAuthStore();

const { list: localesList } = useLocaleStore();
const { data: localesResponse } = localesList;

const localesCount = computed(() => localesResponse?.pagination?.total ?? 0);

const { list: entriesList } = useEntryStore();
const { data: entriesResponse } = entriesList;

const entryCount = computed(() => entriesResponse?.pagination?.total ?? 0);

const cards = [
  {
    title: "Locales",
    description: "Manage languages and regional variants",
    icon: "🌍",
    href: "/locales",
    permission: "read_locale",
    color: "primary",
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
    href: "/terminologies",
    permission: "read_terminology",
    color: "purple",
  },
  {
    title: "Users",
    description: "Manage users and permissions",
    icon: "👥",
    href: "/users",
    permission: "read_user",
    color: "orange",
  },
];

const { can } = usePermission();

const visibleCards = computed(() =>
  cards.filter((card) => can.value(card.permission)),
);
</script>

<template>
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-neutral-900">
      Welcome back, {{ authStore.user?.name }}!
    </h1>
    <p class="mt-2 text-neutral-600">
      Here's what you can do in Parlance today.
    </p>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <DashboardMetricCard
      title="Total Locales"
      :loading="localesList.isLoading"
      :description="localesCount.toString()"
    >
      <template #icon>
        <svg
          class="w-6 h-6 text-primary-600"
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
      </template>
    </DashboardMetricCard>

    <DashboardMetricCard
      title="Total Entries"
      :loading="entriesList.isFetching"
      :description="entryCount.toString()"
    >
      <template #icon>
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
      </template>
    </DashboardMetricCard>

    <DashboardMetricCard title="Pending" description="0">
      <template #icon>
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
      </template>
    </DashboardMetricCard>

    <DashboardMetricCard title="Completed" description="0">
      <template #icon>
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
      </template>
    </DashboardMetricCard>
  </div>

  <!-- Quick Actions -->
  <div class="mb-8">
    <h2 class="text-xl font-semibold text-neutral-900 mb-4">Quick Access</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <NuxtLink
        v-for="card in visibleCards"
        :key="card.href"
        :to="card.href"
        class="group transition-all rounded-lg border-2 border-transparent hover:border-primary-500"
      >
        <Card class="h-full">
          <div class="flex items-start">
            <div class="text-4xl mb-3">
              {{ card.icon }}
            </div>
          </div>
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">
            {{ card.title }}
          </h3>
          <p class="text-sm text-neutral-600">
            {{ card.description }}
          </p>
          <div
            class="mt-4 flex items-center text-primary-600 text-sm font-medium"
          >
            <span>Open</span>
            <svg
              class="w-4 h-4 ml-1"
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
        </Card>
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
    <h2 class="text-xl font-semibold text-neutral-900 mb-4">Recent Activity</h2>
    <Card>
      <p class="text-neutral-500 text-center py-8">
        No recent activity to display
      </p>
    </Card>
  </div>
</template>
