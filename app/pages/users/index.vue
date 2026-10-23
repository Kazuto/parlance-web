<script setup lang="ts">
import { api } from "~/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Pagination,
  type DataTableColumn,
} from "@thkzt/eunoia";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

const { t } = useI18n();
const { getErrorMessage } = useErrorHelper();
const { can } = usePermission();

const showDialog = ref(false);
const editDialogItem = ref<User>();
const deleteDialogItem = ref<User | undefined>(undefined);
const restoreDialogItem = ref<User | undefined>(undefined);

usePage(() => ({
  width: "extra-wide",
  title: t("nav.users"),
  description: t("users.description"),
  showHeader: false,
  primaryAction: can.value("create_user")
    ? {
        content: t("users.create"),
        icon: "plus",
        onClick: () => (showDialog.value = true),
      }
    : undefined,
}));

const { data, pagination, isFetching, error, refetch } = usePaginatedList(
  api.users.list,
  { includeDeleted: true },
);

const tableColumns = computed<DataTableColumn<User>[]>(() => [
  {
    title: t("common.name"),
    key: "name",
    sortable: true,
  },
  {
    title: t("nav.roles"),
    key: "roles",
    sortable: true,
  },
  {
    title: t("common.created"),
    key: "createdAt",
    sortable: true,
  },
  {
    title: t("common.updated"),
    key: "updatedAt",
    sortable: true,
  },
]);

const tableItems = computed(() => data.value?.users ?? []);
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="isFetching && !data"
    class="flex items-center justify-center py-12"
  >
    <div class="text-neutral-600">{{ t("users.loading") }}</div>
  </div>

  <!-- Error State -->
  <Alert v-else-if="error" variant="danger" persistent>
    <p>{{ t("users.loadFailed", { error: getErrorMessage(error) }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <div v-else-if="data">
    <!-- Table -->
    <Card dense>
      <DataTable
        :columns="tableColumns"
        :items="tableItems"
        :loading="isFetching"
        :loading-rows="data.users?.length ?? 0"
        :row-class="
          (item) =>
            item.deletedAt ? 'text-neutral-400 dark:text-neutral-400' : ''
        "
      >
        <template #roles="{ item }">
          <div class="flex items-center gap-2">
            <Badge
              v-for="(role, index) in item.roles"
              :key="role.id ?? `role-${index}`"
              dense
            >
              {{ role.name }}
            </Badge>
          </div>
        </template>
        <template #createdAt="{ item }">
          <RelativeTime v-if="item.createdAt" :timestamp="item.createdAt" />
        </template>
        <template #updatedAt="{ item }">
          <RelativeTime v-if="item.updatedAt" :timestamp="item.updatedAt" />
        </template>
        <template #actions="{ item }">
          <div
            v-if="!item.deletedAt"
            class="flex items-center justify-end gap-2"
          >
            <BaseActionButtons
              :edit-label="t('users.edit')"
              :delete-label="t('users.delete')"
              edit-permission="update_user"
              delete-permission="delete_user"
              @edit="editDialogItem = item"
              @delete="deleteDialogItem = item"
            />
          </div>
          <div v-else class="flex items-center justify-end gap-2">
            <BaseIconButton
              v-can="'delete_user'"
              icon="arrow-counter-clockwise"
              :label="t('users.restore')"
              @click="restoreDialogItem = item"
            />
          </div>
        </template>
      </DataTable>

      <Pagination
        :current="pagination.page ?? 1"
        class="mt-4"
        :per-page="pagination.perPage ?? 10"
        :total="data?.pagination?.totalPages ?? 0"
        @update:current="pagination.page = $event"
        @update:per-page="pagination.perPage = $event"
      />
    </Card>

    <!-- Empty State -->
    <Card v-if="tableItems.length === 0">
      <svg
        class="mx-auto h-12 w-12 text-neutral-400"
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
      <h3 class="mt-2 text-sm font-medium text-neutral-900">
        {{ t("users.empty") }}
      </h3>
    </Card>
  </div>

  <UserFormDialog :open="showDialog" @close="showDialog = false" />
  <UserFormDialog
    :open="!!editDialogItem"
    :user="editDialogItem"
    @close="editDialogItem = undefined"
  />
  <UserDeleteDialog
    :item="deleteDialogItem"
    :open="deleteDialogItem !== undefined"
    @close="deleteDialogItem = undefined"
  />
  <UserRestoreDialog
    :item="restoreDialogItem"
    :open="restoreDialogItem !== undefined"
    @close="restoreDialogItem = undefined"
  />
</template>
