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
import type { Scope } from "~/lib/api/schemas/parlance/v1/ScopeSchema";

const { t } = useI18n();
const { getErrorMessage } = useErrorHelper();
const { can } = usePermission();
const { data, filter, pagination, isFetching, error, refetch } =
  usePaginatedList(api.scopes.list, { includeDeleted: true });

const createDialogOpen = ref(false);
const editDialogItem = ref<Scope>();
const deleteDialogItem = ref<Scope>();
const restoreDialogItem = ref<Scope>();

usePage(() => ({
  width: "extra-wide",
  title: t("nav.scopes"),
  description: t("scopes.description"),
  showHeader: false,
  primaryAction: can.value("create_scope")
    ? {
        content: t("scopes.create"),
        icon: "plus",
        onClick: () => (createDialogOpen.value = true),
      }
    : undefined,
}));

const search = ref("");
const { onKeydown: onSearchKeydown } = useDebouncedSearch(search, (value) => {
  filter.value.search = value;
  pagination.value.page = 1;
});

const tableColumns = computed<DataTableColumn<Scope>[]>(() => [
  { title: t("common.name"), key: "name", sortable: true },
  { title: t("scopes.slug"), key: "slug", sortable: true },
  { title: t("common.description"), key: "description" },
  { title: t("common.created"), key: "createdAt", sortable: true },
]);
const tableItems = computed(() => data.value?.scopes ?? []);
</script>

<template>
  <Card dense class="mb-4">
    <div class="flex gap-4 items-center">
      <div class="flex-1">
        <Input
          v-model="search"
          type="search"
          :placeholder="t('scopes.search')"
          :aria-label="t('scopes.search')"
          shortcut="/"
          @keydown="onSearchKeydown"
        />
      </div>
    </div>
  </Card>

  <div
    v-if="isFetching && !data"
    class="flex items-center justify-center py-12"
  >
    <div class="text-neutral-600">{{ t("scopes.loading") }}</div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("scopes.listFailed", { error: getErrorMessage(error) }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <Card v-else-if="data" dense>
    <DataTable
      v-if="tableItems.length"
      :columns="tableColumns"
      :items="tableItems"
      :loading="isFetching && !data"
      :loading-rows="tableItems.length"
      :row-class="
        (item) =>
          item.deletedAt ? 'text-neutral-400 dark:text-neutral-400' : ''
      "
    >
      <template #name="{ item }">
        <span class="flex items-center gap-2">
          <span
            class="h-3 w-3 shrink-0 rounded-full border border-neutral-200 dark:border-neutral-700"
            :style="{ backgroundColor: item.color || 'transparent' }"
            aria-hidden="true"
          />
          {{ item.name }}
        </span>
      </template>
      <template #slug="{ item }">
        <code class="text-xs">{{ item.slug }}</code>
      </template>
      <template #description="{ item }">
        <span
          class="line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400"
          >{{ item.description }}</span
        >
      </template>
      <template #createdAt="{ item }">
        <RelativeTime v-if="item.createdAt" :timestamp="item.createdAt" />
      </template>
      <template #actions="{ item }">
        <BaseActionButtons
          v-if="!item.deletedAt"
          class="justify-end"
          :edit-label="t('scopes.edit')"
          :delete-label="t('scopes.delete')"
          edit-permission="update_scope"
          delete-permission="delete_scope"
          @edit="editDialogItem = item"
          @delete="deleteDialogItem = item"
        />
        <div v-else class="flex justify-end">
          <BaseIconButton
            v-can="'delete_scope'"
            icon="arrow-counter-clockwise"
            :label="t('scopes.restore')"
            @click="restoreDialogItem = item"
          />
        </div>
      </template>
    </DataTable>
    <div v-else class="py-12 text-center">
      <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {{ search ? t("scopes.noMatches") : t("scopes.empty") }}
      </p>
      <p
        v-if="!search"
        class="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
      >
        {{ t("scopes.emptyHint") }}
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

  <ScopeFormDialog :open="createDialogOpen" @close="createDialogOpen = false" />
  <ScopeFormDialog
    :open="!!editDialogItem"
    :item="editDialogItem"
    @close="editDialogItem = undefined"
  />
  <ScopeDeleteDialog
    :open="!!deleteDialogItem"
    :item="deleteDialogItem"
    @close="deleteDialogItem = undefined"
  />
  <ScopeRestoreDialog
    :open="!!restoreDialogItem"
    :item="restoreDialogItem"
    @close="restoreDialogItem = undefined"
  />
</template>
