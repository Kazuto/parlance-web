<script setup lang="ts">
import { api } from "~/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Pagination,
  type DataTableColumn,
} from "@thkzt/eunoia";
import { groupPermissionsByResource } from "~/lib/permissions";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";
import type { Permission } from "~/lib/api/schemas/parlance/v1/PermissionSchema";
import DeleteDialog from "~/components/role/DeleteDialog.vue";
import ViewPermissionsDialog from "~/components/role/ViewPermissionsDialog.vue";

const { t } = useI18n();
const { resourceLabel, actionLabel } = usePermissionLabels();
const { can } = usePermission();

usePage(() => ({
  width: "extra-wide",
  title: t("nav.roles"),
  description: t("roles.description"),
  showHeader: false,
  primaryAction: can.value("create_role")
    ? {
        content: t("roles.create"),
        icon: "plus",
        onClick: () => (createDialogOpen.value = true),
      }
    : undefined,
}));

const { data, isLoading, error, refetch, filter, pagination } =
  usePaginatedList(api.roles.list);

const searchQuery = ref("");
const { onKeydown: onSearchKeydown } = useDebouncedSearch(
  searchQuery,
  (value) => {
    filter.value.search = value;
    pagination.value.page = 1;
  },
);

// Dialogs
const createDialogOpen = ref(false);
const editDialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const viewPermissionsDialogOpen = ref(false);
const selectedRole = ref<Role | undefined>();

function openEdit(role: Role) {
  selectedRole.value = role;
  editDialogOpen.value = true;
}

function openDelete(role: Role) {
  selectedRole.value = role;
  deleteDialogOpen.value = true;
}

function openViewPermissions(role: Role) {
  selectedRole.value = role;
  viewPermissionsDialogOpen.value = true;
}

// Permission display
function getPermissionSummary(permissions: Permission[]) {
  if (!permissions.length) return null;

  const grouped = groupPermissionsByResource(permissions);
  const resources = Object.keys(grouped).sort();

  if (!resources.length) return null;

  // Show first resource group completely, then count remaining
  const firstResource = resources[0];

  if (!firstResource) return null;

  const firstGroup = grouped[firstResource] || [];
  const remainingCount = permissions.length - firstGroup.length;

  return {
    firstResource,
    firstGroup: firstGroup.slice(0, 3),
    remainingInFirst: Math.max(0, firstGroup.length - 3),
    remainingCount,
    totalCount: permissions.length,
  };
}

const tableColumns = computed<DataTableColumn<Role>[]>(() => [
  {
    title: t("common.name"),
    key: "name",
    sortable: true,
  },
  {
    title: t("common.description"),
    key: "description",
  },
  {
    title: t("common.permissions"),
    key: "permissions",
  },
  {
    title: t("common.created"),
    key: "createdAt",
    sortable: true,
  },
]);

const tableItems = computed(() =>
  (data.value?.roles ?? []).map((role) => ({
    ...role,
    summary: getPermissionSummary(role.permissions ?? []),
  })),
);
</script>

<template>
  <Card dense class="mb-4">
    <Input
      v-model="searchQuery"
      type="search"
      :placeholder="t('roles.searchRoles')"
      :aria-label="t('roles.searchRoles')"
      shortcut="/"
      @keydown="onSearchKeydown"
    />
  </Card>

  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">{{ t("roles.loading") }}</div>
  </div>

  <!-- Error State -->
  <Alert v-else-if="error" variant="danger" persistent>
    <p>{{ t("roles.loadFailed", { error: error.message }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <div v-else-if="data">
    <!-- Table -->
    <Card dense class="overflow-x-auto">
      <DataTable :columns="tableColumns" :items="tableItems">
        <template #permissions="{ item }">
          <div v-if="item.permissions?.length" class="space-y-1">
            <!-- On phones the badges would wrap against the right-aligned values,
                 so only the count shows there, opening the full list. -->
            <div
              v-if="item.summary"
              class="flex flex-wrap gap-1 items-center max-sm:hidden"
            >
              <span class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ resourceLabel(item.summary.firstResource) }}:
              </span>
              <Badge
                v-for="permission in item.summary.firstGroup"
                :key="permission.id ?? undefined"
                variant="secondary"
                size="sm"
              >
                {{ actionLabel(permission.action ?? "") }}
              </Badge>
              <button
                v-if="
                  item.summary.remainingInFirst > 0 ||
                  item.summary.remainingCount > 0
                "
                class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer"
                @click="openViewPermissions(item)"
              >
                {{
                  t("roles.morePermissions", {
                    count:
                      item.summary.remainingInFirst +
                      item.summary.remainingCount,
                  })
                }}
              </button>
            </div>
            <button
              type="button"
              class="text-xs text-neutral-400 dark:text-neutral-400 hover:underline cursor-pointer max-sm:text-sm max-sm:font-medium max-sm:text-blue-600 max-sm:dark:text-blue-400"
              @click="openViewPermissions(item)"
            >
              {{
                t("roles.permissionsCount", {
                  count: item.permissions.length,
                })
              }}
            </button>
          </div>
          <span v-else class="text-sm text-neutral-400 dark:text-neutral-400">
            {{ t("roles.noPermissions") }}
          </span>
        </template>

        <template #createdAt="{ item }">
          <RelativeTime v-if="item.createdAt" :timestamp="item.createdAt" />
        </template>

        <template #actions="{ item }">
          <BaseActionButtons
            class="justify-end"
            :edit-label="t('roles.edit')"
            :delete-label="t('roles.delete')"
            edit-permission="update_role"
            delete-permission="delete_role"
            @edit="openEdit(item)"
            @delete="openDelete(item)"
          />
        </template>
      </DataTable>
    </Card>

    <Pagination
      v-if="(data?.pagination?.totalPages ?? 0) > 1"
      class="mt-4"
      :current="pagination.page ?? 1"
      :per-page="pagination.perPage ?? 20"
      :total="data?.pagination?.totalPages ?? 0"
      @update:current="pagination.page = $event"
      @update:per-page="pagination.perPage = $event"
    />

    <!-- Empty State -->
    <Card v-if="tableItems.length === 0" class="text-center py-12">
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <h3 class="mt-4 text-sm font-medium text-neutral-900">
        {{ t("roles.empty") }}
      </h3>
      <p class="mt-1 text-sm text-neutral-500">
        {{ t("roles.description") }}
      </p>
      <div v-can="'create_role'" class="mt-6">
        <Button primary @click="createDialogOpen = true">
          {{ t("roles.create") }}
        </Button>
      </div>
    </Card>
  </div>

  <!-- Dialogs -->
  <RoleFormDialog :open="createDialogOpen" @close="createDialogOpen = false" />
  <RoleFormDialog
    :open="editDialogOpen"
    :role="selectedRole"
    @close="editDialogOpen = false"
  />
  <DeleteDialog
    :open="deleteDialogOpen"
    :item="selectedRole"
    @close="deleteDialogOpen = false"
  />
  <ViewPermissionsDialog
    :open="viewPermissionsDialogOpen"
    :role="selectedRole"
    @close="viewPermissionsDialogOpen = false"
  />
</template>
