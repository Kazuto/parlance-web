<script setup lang="ts">
import { api } from "~/lib/api";
import {
  Alert,
  Button,
  Card,
  DataTable,
  Input,
  Pagination,
  type DataTableColumn,
} from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

// Deleted entries keep their translations and scopes, and can be restored from here.
const { t } = useI18n();
const { getErrorMessage } = useErrorHelper();
const { data, filter, pagination, isFetching, error, refetch } =
  usePaginatedList(api.entries.list, {
    sort: { sort: "deleted_at", order: "desc" },
    params: { deletedOnly: true, summary: true },
  });

const restoreDialogItem = ref<Entry>();

usePage(() => ({
  width: "extra-wide",
  title: t("entries.deletedEntries"),
  description: t("entries.deletedDescription"),
  showHeader: false,
}));

const search = ref("");
const { onKeydown: onSearchKeydown } = useDebouncedSearch(search, (value) => {
  filter.value.search = value;
  pagination.value.page = 1;
});

const tableColumns = computed<DataTableColumn<Entry>[]>(() => [
  { title: t("common.key"), key: "key" },
  { title: t("common.default"), key: "defaultTranslation" },
  { title: t("entries.deletedColumn"), key: "deletedAt" },
]);
const tableItems = computed(() => data.value?.entries ?? []);
</script>

<template>
  <Card dense class="mb-4">
    <Input
      v-model="search"
      type="search"
      :placeholder="t('entries.search')"
      :aria-label="t('entries.search')"
      shortcut="/"
      @keydown="onSearchKeydown"
    />
  </Card>

  <div
    v-if="isFetching && !data"
    class="flex items-center justify-center py-12"
  >
    <div class="text-neutral-600">{{ t("entries.loading") }}</div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>
      {{ t("entries.deletedListFailed", { error: getErrorMessage(error) }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <Card v-else-if="data" dense>
    <DataTable
      v-if="tableItems.length"
      :columns="tableColumns"
      :items="tableItems"
      :loading-rows="tableItems.length"
    >
      <template #key="{ item }">
        <code class="text-xs">{{ item.key }}</code>
      </template>
      <template #defaultTranslation="{ item }">
        <span
          class="line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400"
          >{{ item.defaultTranslation }}</span
        >
      </template>
      <template #deletedAt="{ item }">
        <RelativeTime v-if="item.deletedAt" :timestamp="item.deletedAt" />
      </template>
      <template #actions="{ item }">
        <div class="flex justify-end">
          <BaseIconButton
            v-can="'delete_entry'"
            icon="arrow-counter-clockwise"
            :label="t('entries.restore')"
            @click="restoreDialogItem = item"
          />
        </div>
      </template>
    </DataTable>
    <div v-else class="py-12 text-center">
      <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {{ search ? t("entries.deletedNoMatches") : t("entries.deletedEmpty") }}
      </p>
      <p
        v-if="!search"
        class="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
      >
        {{ t("entries.deletedEmptyHint") }}
      </p>
    </div>

    <Pagination
      v-if="(data.pagination?.totalPages ?? 0) > 1"
      class="mt-4"
      :current="pagination.page ?? 1"
      :per-page="pagination.perPage ?? 20"
      :total="data.pagination?.totalPages ?? 0"
      @update:current="pagination.page = $event"
      @update:per-page="pagination.perPage = $event"
    />
  </Card>

  <EntryRestoreDialog
    :open="!!restoreDialogItem"
    :item="restoreDialogItem"
    @close="restoreDialogItem = undefined"
  />
</template>
