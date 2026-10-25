<script setup lang="ts">
import { Card, Icon } from "@thkzt/eunoia";
import { NuxtLink } from "#components";
import { entriesLink } from "~/composables/entry/useEntryFilterQuery";
import { languageName } from "~/lib/languageNames";
import type { LocaleStats } from "~/lib/api/schemas/parlance/v1/StatsSchema";

// How far each language is: its approved translations, the drafts awaiting review
// and the missing ones, out of all entries. Drafts and missing ones open the
// entries that need work, as do outdated ones, approved or not, when there are any.
const props = defineProps<{ locales: LocaleStats[]; total: number }>();
const { t, n, locale: uiLocale } = useI18n();

const share = (count: number) =>
  props.total ? `${(count / props.total) * 100}%` : "0%";

const rows = computed(() =>
  props.locales
    .filter((stats) => !!stats.localeCode)
    .map((stats) => {
      const code = stats.localeCode!;

      return {
        code,
        name: languageName(code, uiLocale.value) ?? code,
        percentage: stats.percentage ?? 0,
        approved: stats.approved ?? 0,
        drafts: stats.drafts ?? 0,
        missing: stats.missing ?? 0,
        outdated: stats.outdated ?? 0,
        reviewLink: entriesLink({ locales: [code], status: "review" }),
        missingLink: entriesLink({ locales: [code], status: "missing" }),
        outdatedLink: entriesLink({ locales: [code], status: "outdated" }),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, uiLocale.value)),
);
</script>

<template>
  <h2 class="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
    {{ t("dashboard.languageProgress") }}
  </h2>
  <Card>
    <ul
      class="grid gap-x-10 gap-y-5 md:grid-cols-2"
      :aria-label="t('dashboard.languageProgress')"
    >
      <li v-for="row in rows" :key="row.code" class="min-w-0">
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span
            class="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100"
          >
            {{ row.name }}
            <span
              v-if="row.name !== row.code"
              class="ml-1 font-mono text-xs font-normal text-neutral-500 dark:text-neutral-400"
              >{{ row.code }}</span
            >
          </span>
          <span class="text-neutral-600 tabular-nums dark:text-neutral-300"
            >{{ row.percentage }}%</span
          >
        </div>
        <div
          class="mt-2 flex h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
          aria-hidden="true"
        >
          <div
            class="bg-green-500 dark:bg-green-400"
            :style="{ width: share(row.approved) }"
          />
          <div
            class="bg-amber-400 dark:bg-amber-300"
            :style="{ width: share(row.drafts) }"
          />
        </div>
        <p
          class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400"
        >
          <span class="flex items-center gap-1">
            <span
              class="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400"
              aria-hidden="true"
            />
            {{ t("dashboard.progressApproved", { count: n(row.approved) }) }}
          </span>
          <component
            :is="row.drafts ? NuxtLink : 'span'"
            :to="row.drafts ? row.reviewLink : undefined"
            class="flex items-center gap-1"
            :class="{
              'text-yellow-700 hover:underline dark:text-amber-300': row.drafts,
            }"
          >
            <span
              class="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-300"
              aria-hidden="true"
            />
            {{ t("dashboard.progressDrafts", { count: n(row.drafts) }) }}
          </component>
          <component
            :is="row.missing ? NuxtLink : 'span'"
            :to="row.missing ? row.missingLink : undefined"
            class="flex items-center gap-1"
            :class="{
              'text-red-600 hover:underline dark:text-red-400': row.missing,
            }"
          >
            <span
              class="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600"
              aria-hidden="true"
            />
            {{ t("dashboard.progressMissing", { count: n(row.missing) }) }}
          </component>
          <NuxtLink
            v-if="row.outdated"
            :to="row.outdatedLink"
            class="flex items-center gap-1 text-orange-700 hover:underline dark:text-orange-300"
          >
            <Icon name="clock-counter-clockwise" size="xs" />
            {{ t("dashboard.progressOutdated", { count: n(row.outdated) }) }}
          </NuxtLink>
        </p>
      </li>
    </ul>
  </Card>
</template>
