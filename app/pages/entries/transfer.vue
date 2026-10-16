<script setup lang="ts">
import { Button, Card, Tabs } from "@thkzt/eunoia";
import { useLocaleList } from "~/composables/locale/useLocaleList";

type Action = "import" | "export";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { data, isLoading, error, refetch, pagination } = useLocaleList();
pagination.value.perPage = 100;
const isPending = ref(false);

// Kept in the query so links and reloads land on the same tab.
const action = computed<Action>({
  get: () => (route.query.tab === "export" ? "export" : "import"),
  set: (tab) => router.replace({ query: { ...route.query, tab } }),
});
// Only lock the other tab while a request runs; the active one must stay mounted.
const tabs = computed(() =>
  (["import", "export"] as const).map((value) => ({
    value,
    label: t(value === "import" ? "transfer.importTab" : "transfer.exportTab"),
    disabled: isPending.value && action.value !== value,
  })),
);

usePage({
  width: "extra-wide",
  title: t("transfer.pageTitle"),
  description: t("transfer.pageDescription"),
});
</script>

<template>
  <div v-if="isLoading && !data" class="py-12 text-center text-neutral-600">
    {{ t("locales.loading") }}
  </div>
  <div
    v-else-if="error && !data"
    role="alert"
    class="rounded-lg border border-red-200 bg-red-50 p-4"
  >
    <p class="text-red-800">
      {{ t("locales.loadFailed", { error: error.message }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </div>
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
