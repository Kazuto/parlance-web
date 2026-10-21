<script setup lang="ts">
import { Card, Headline, Icon, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

const authStore = useAuthStore();
const { t } = useI18n();

// Get stats from backend
const { data: statsData, isLoading: isStatsLoading } = useQuery({
  ...api.stats.get.use({}),
});

const localesCount = computed(() => statsData.value?.totalLocales ?? 0);
const entryCount = computed(() => statsData.value?.totalEntries ?? 0);
const missingCount = computed(() => statsData.value?.missingTranslations ?? 0);
const completedCount = computed(
  () => statsData.value?.fullyTranslatedEntries ?? 0,
);

// Build URLs with all locales selected
const allLocaleCodes = computed(
  () =>
    statsData.value?.byLocale
      ?.map((locale) => locale.localeCode)
      .filter(Boolean)
      .join(",") || "",
);

const missingUrl = computed(() => {
  return allLocaleCodes.value
    ? `/entries?status=missing&locales=${allLocaleCodes.value}`
    : "/entries?status=missing";
});

const completeUrl = computed(() => {
  return allLocaleCodes.value
    ? `/entries?status=complete&locales=${allLocaleCodes.value}`
    : "/entries?status=complete";
});

usePage(() => ({
  width: "extra-wide",
  title: t("dashboard.title"),
  description: t("dashboard.description"),
  showHeader: false,
}));

const cards = computed(() => [
  {
    title: t("nav.locales"),
    description: t("dashboard.localesDescription"),
    icon: "globe-simple",
    href: "/locales",
    permission: "read_locale",
    iconClass:
      "bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
  },
  {
    title: t("nav.entries"),
    description: t("dashboard.entriesDescription"),
    icon: "translate",
    href: "/entries",
    permission: "read_entry",
    iconClass:
      "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  },
  {
    title: t("nav.glossary"),
    description: t("dashboard.terminologyDescription"),
    icon: "book-open-text",
    href: "/glossary",
    permission: "read_terminology",
    iconClass:
      "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  },
  {
    title: t("nav.users"),
    description: t("dashboard.usersDescription"),
    icon: "users",
    href: "/users",
    permission: "read_user",
    iconClass:
      "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  },
]);

const { can } = usePermission();

const visibleCards = computed(() =>
  cards.value.filter((card) => can.value(card.permission)),
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
      :loading="isStatsLoading"
      :description="localesCount.toString()"
    >
      <template #icon>
        <svg
          class="w-6 h-6 text-primary-600 dark:text-primary-400"
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
      :loading="isStatsLoading"
      :description="entryCount.toString()"
    >
      <template #icon>
        <svg
          class="w-6 h-6 text-green-600 dark:text-green-400"
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

    <DashboardMetricCard
      :title="t('dashboard.missing')"
      :description="missingCount.toString()"
      :to="missingUrl"
    >
      <template #icon>
        <Icon
          name="warning-circle"
          size="lg"
          class="text-red-600 dark:text-red-400"
        />
      </template>
    </DashboardMetricCard>

    <DashboardMetricCard
      :title="t('dashboard.completed')"
      :description="completedCount.toString()"
      :to="completeUrl"
    >
      <template #icon>
        <svg
          class="w-6 h-6 text-purple-600 dark:text-purple-400"
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
    <h2
      class="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4"
    >
      {{ t("dashboard.quickAccess") }}
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <NuxtLink
        v-for="card in visibleCards"
        :key="card.href"
        :to="card.href"
        class="group rounded-[24px] squircle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        <!-- The hover border is drawn on the card, so it follows the card's squircle corners. -->
        <Card
          class="h-full transition-shadow group-hover:shadow-[inset_0_0_0_2px_var(--color-primary-500)] dark:group-hover:shadow-[inset_0_0_0_2px_var(--color-primary-600)]"
        >
          <div
            class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
            :class="card.iconClass"
          >
            <Icon :name="card.icon" size="lg" />
          </div>
          <h3
            class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2"
          >
            {{ card.title }}
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ card.description }}
          </p>
          <div
            class="mt-4 flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium"
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
      class="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center"
    >
      <p class="text-yellow-800 dark:text-yellow-200">
        {{ t("dashboard.noAccess") }}
      </p>
    </div>
  </div>

  <!-- Recent Activity -->
  <div>
    <DashboardRecentActivity v-if="can('read_entry')" />
  </div>
</template>
