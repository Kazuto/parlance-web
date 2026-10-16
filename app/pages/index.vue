<script setup lang="ts">
import { Card, Headline, Text } from "@thkzt/eunoia";
import { useEntryList } from "~/composables/entry/useEntryList";
import { useLocaleList } from "~/composables/locale/useLocaleList";

const authStore = useAuthStore();
const { t } = useI18n();

const { data: localesData, isLoading: isLocalesLoading } = useLocaleList();

const localesCount = computed(() => localesData.value?.pagination?.total ?? 0);

const { data: entriesData, isLoading: isEntriesLoading } = useEntryList();

const entryCount = computed(() => entriesData.value?.pagination?.total ?? 0);

usePage(() => ({
  width: "extra-wide",
  title: t("dashboard.title"),
  description: t("dashboard.description"),
  showHeader: false,
}));

const cards = [
  {
    title: t("nav.locales"),
    description: t("dashboard.localesDescription"),
    icon: "🌍",
    href: "/locales",
    permission: "read_locale",
    color: "primary",
  },
  {
    title: t("nav.entries"),
    description: t("dashboard.entriesDescription"),
    icon: "📝",
    href: "/entries",
    permission: "read_entry",
    color: "green",
  },
  {
    title: t("nav.terminology"),
    description: t("dashboard.terminologyDescription"),
    icon: "📚",
    href: "/terminologies",
    permission: "read_terminology",
    color: "purple",
  },
  {
    title: t("nav.users"),
    description: t("dashboard.usersDescription"),
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
  <div class="mt-4 mb-8">
    <Headline :level="3">
      {{ t("dashboard.greeting.title", { name: authStore.user?.name ?? "" }) }}
    </Headline>

    <Text muted size="sm" class="truncate">
      {{ t("dashboard.greeting.description") }}
    </Text>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <DashboardMetricCard
      :title="t('dashboard.totalLocales')"
      :loading="isLocalesLoading"
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
      :title="t('dashboard.totalEntries')"
      :loading="isEntriesLoading"
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

    <DashboardMetricCard :title="t('dashboard.pending')" description="0">
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

    <DashboardMetricCard :title="t('dashboard.completed')" description="0">
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
    <h2 class="text-xl font-semibold text-neutral-900 mb-4">
      {{ t("dashboard.quickAccess") }}
    </h2>
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
            <span>{{ t("common.open") }}</span>
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
        {{ t("dashboard.noAccess") }}
      </p>
    </div>
  </div>

  <!-- Recent Activity -->
  <div>
    <DashboardRecentActivity v-if="can('read_entry')" />
  </div>
</template>
