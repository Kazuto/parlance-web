<script setup lang="ts">
import { Alert, Button, Card, Tabs } from "@thkzt/eunoia";
import { useLocaleList } from "~/composables/locale/useLocaleList";

type Action = "import" | "export";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { canAll } = usePermission();
// Importing creates entries and overwrites translations.
const canImport = computed(() =>
  canAll.value(["create_entry", "update_entry"]),
);
const { data, isLoading, error, refetch, pagination } = useLocaleList();
pagination.value.perPage = 100;
const isPending = ref(false);

// Kept in the query so links and reloads land on the same tab.
const action = computed<Action>({
  get: () =>
    route.query.tab === "export" || !canImport.value ? "export" : "import",
  set: (tab) => router.replace({ query: { ...route.query, tab } }),
});
// Only lock the other tab while a request runs; the active one must stay mounted.
const tabs = computed(() =>
  (["import", "export"] as const)
    .filter((value) => value === "export" || canImport.value)
    .map((value) => ({
      value,
      label: t(
        value === "import" ? "transfer.importTab" : "transfer.exportTab",
      ),
      disabled: isPending.value && action.value !== value,
    })),
);

usePage(() => ({
  width: "extra-wide",
  title: t("transfer.pageTitle"),
  description: t("transfer.pageDescription"),
  showHeader: false,
}));
</script>

<template>
  <div v-if="isLoading && !data" class="py-12 text-center text-neutral-600">
    {{ t("locales.loading") }}
  </div>
  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("locales.loadFailed", { error: error.message }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>
  <Card v-else class="max-w-2xl">
    <Tabs
      v-model="action"
      :items="tabs"
      :aria-label="t('transfer.pageTitle')"
      panel-class="pt-4"
    >
      <template #default="{ item }">
        <EntryTransferForm
          :key="item.value"
          v-model:pending="isPending"
          :action="item.value as Action"
          :locales="data?.locales ?? []"
        />
      </template>
    </Tabs>
  </Card>
</template>
