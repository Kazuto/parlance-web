<script setup lang="ts">
import { entriesLink } from "~/composables/entry/useEntryFilterQuery";
import { Button, Card, Icon, Switch } from "@thkzt/eunoia";
import { useRecentActivity } from "~/composables/activity/useRecentActivity";
import type { ActivityItem } from "~/lib/api/schemas/parlance/v1/ActivitySchema";

const { t, n } = useI18n();
const { items, onlyMine, isLoading, error, refetch } = useRecentActivity(10);

const isDefinition = (item: ActivityItem) =>
  item.kind === "ACTIVITY_KIND_DEFINITION";

// A group of one kind of change gets its own verb, e.g. only additions or only
// approvals; a mix is "changed".
function verbKey(item: ActivityItem) {
  const counts = {
    "activity.added": item.createdCount ?? 0,
    "activity.updated": item.updatedCount ?? 0,
    "activity.deleted": item.deletedCount ?? 0,
    "activity.approved": item.approvedCount ?? 0,
    "activity.rejected": item.rejectedCount ?? 0,
  };
  const kinds = Object.entries(counts).filter(([, count]) => count > 0);

  return kinds.length === 1 ? kinds[0]![0] : "activity.changed";
}

function countLabel(item: ActivityItem) {
  const count = item.subjectCount ?? 0;
  const formatted = `${n(count)}${item.partial ? "+" : ""}`;

  return t(
    isDefinition(item) ? "activity.terms" : "activity.translations",
    { count: formatted },
    count,
  );
}

function whereLabel(item: ActivityItem) {
  return (item.localeCount ?? 0) === 1
    ? t("activity.inLanguage", { language: item.localeName || item.localeCode })
    : t("activity.inLanguages", { count: item.localeCount ?? 0 });
}

// Single entries open filtered to them (and their language); single terms open searched.
function subjectLink(item: ActivityItem) {
  if ((item.subjectCount ?? 0) !== 1 || !item.subjectLabel) return undefined;
  if (isDefinition(item))
    return { path: "/glossary", query: { q: item.subjectLabel } };

  return entriesLink({
    q: item.subjectLabel,
    locales: item.localeCode ? [item.localeCode] : [],
  });
}
</script>

<template>
  <div class="mb-4 flex items-center justify-between gap-4">
    <h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
      {{ t("dashboard.recentActivity") }}
    </h2>
    <Switch v-model="onlyMine" dense>{{ t("activity.onlyMine") }}</Switch>
  </div>
  <Card>
    <p
      v-if="isLoading"
      role="status"
      class="py-8 text-center text-neutral-500 dark:text-neutral-400"
    >
      {{ t("activity.loading") }}
    </p>
    <div
      v-else-if="error"
      role="alert"
      class="flex flex-col items-center gap-2 py-8 text-sm text-red-600"
    >
      {{ t("activity.loadFailed") }}
      <Button ghost dense @click="() => refetch()">{{
        t("common.retry")
      }}</Button>
    </div>
    <p
      v-else-if="!items.length"
      class="py-8 text-center text-neutral-500 dark:text-neutral-400"
    >
      {{ onlyMine ? t("activity.noOwnActivity") : t("dashboard.noActivity") }}
    </p>
    <ul
      v-else
      class="divide-y divide-neutral-100 dark:divide-neutral-700"
      :aria-label="t('dashboard.recentActivity')"
    >
      <li
        v-for="item in items"
        :key="item.id ?? undefined"
        class="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
      >
        <span
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300"
          aria-hidden="true"
        >
          <Icon
            :name="isDefinition(item) ? 'book-open-text' : 'translate'"
            size="sm"
          />
        </span>
        <div class="min-w-0 flex-1 text-sm">
          <i18n-t :keypath="verbKey(item)" tag="p" scope="global">
            <template #user>
              <span class="font-medium text-neutral-900 dark:text-neutral-100">
                {{ item.userName || t("activity.someone") }}
              </span>
            </template>
            <template #subject>
              <NuxtLink
                v-if="subjectLink(item)"
                :to="subjectLink(item)"
                class="rounded-sm font-mono text-primary-600 hover:underline focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-primary-400"
                >{{ item.subjectLabel }}</NuxtLink
              >
              <span v-else class="font-medium">{{ countLabel(item) }}</span>
            </template>
            <template #where>{{ whereLabel(item) }}</template>
          </i18n-t>
          <RelativeTime
            v-if="item.changedAt"
            class="text-xs text-neutral-500 dark:text-neutral-400"
            :timestamp="item.changedAt"
          />
        </div>
      </li>
    </ul>
  </Card>
</template>
