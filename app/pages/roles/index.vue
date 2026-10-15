<script setup lang="ts">
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  type DataTableColumn,
} from "@thkzt/eunoia";
import { useRoleList } from "~/composables/role/useRoleList";
import { groupPermissionsByResource } from "~/composables/permission/usePermissionList";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";
import type { Permission } from "~/lib/api/schemas/parlance/v1/PermissionSchema";
import CreateDialog from "~/components/role/CreateDialog.vue";
import EditDialog from "~/components/role/EditDialog.vue";
import DeleteDialog from "~/components/role/DeleteDialog.vue";
import ViewPermissionsDialog from "~/components/role/ViewPermissionsDialog.vue";

const { t } = useI18n();

usePage({
  width: "wide",
  title: t("nav.roles"),
  description: t("roles.description"),
});

const { data, isLoading, error, refetch, filter } = useRoleList();

// Search
const searchQuery = ref("");
watch(searchQuery, (value) => {
  filter.value.search = value;
});

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

const tableColumns: DataTableColumn<Role>[] = [
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
];

const tableItems = computed(() => data.value?.roles ?? []);
</script>

<template>
  <!-- Header with Search and Create -->
  <div class="flex flex-col sm:flex-row gap-4 mb-6">
    <div class="flex-1">
      <Input
        v-model="searchQuery"
        type="search"
        :placeholder="t('roles.searchRoles')"
        class="max-w-md"
      />
    </div>
    <Button primary @click="createDialogOpen = true">
      {{ t("roles.create") }}
    </Button>
  </div>

  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center py-12">
    <div class="text-neutral-600">{{ t("roles.loading") }}</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800">
      {{ t("roles.loadFailed", { error: error.message }) }}
    </p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </div>

  <div v-else-if="data">
    <!-- Table -->
    <Card class="overflow-x-auto">
      <DataTable :columns="tableColumns" :items="tableItems">
        <template #permissions="{ item }">
          <div v-if="item.permissions?.length" class="space-y-1">
            <div
              v-if="getPermissionSummary(item.permissions)"
              class="flex flex-wrap gap-1 items-center"
            >
              <span class="text-xs text-neutral-500 capitalize">
                {{ getPermissionSummary(item.permissions)!.firstResource }}:
              </span>
              <Badge
                v-for="permission in getPermissionSummary(item.permissions)!
                  .firstGroup"
                :key="permission.id ?? undefined"
                variant="secondary"
                size="sm"
              >
                {{ permission.action }}
              </Badge>
              <button
                v-if="
                  getPermissionSummary(item.permissions)!.remainingInFirst >
                    0 ||
                  getPermissionSummary(item.permissions)!.remainingCount > 0
                "
                class="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                @click="openViewPermissions(item)"
              >
                {{
                  t("roles.morePermissions", {
                    count:
                      getPermissionSummary(item.permissions)!.remainingInFirst +
                      getPermissionSummary(item.permissions)!.remainingCount,
                  })
                }}
              </button>
            </div>
            <div class="text-xs text-neutral-400">
              {{
                t("roles.permissionsCount", {
                  count: item.permissions.length,
                })
              }}
            </div>
          </div>
          <span v-else class="text-sm text-neutral-400">
            {{ t("roles.noPermissions") }}
          </span>
        </template>

        <template #createdAt="{ item }">
          <RelativeTime v-if="item.createdAt" :timestamp="item.createdAt" />
        </template>

        <template #actions="{ item }">
          <div class="flex items-center justify-end gap-2">
            <Button ghost @click="openEdit(item)">
              {{ t("common.edit") }}
            </Button>
            <Button ghost @click="openDelete(item)">
              {{ t("common.delete") }}
            </Button>
          </div>
        </template>
      </DataTable>
    </Card>

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
      <div class="mt-6">
        <Button primary @click="createDialogOpen = true">
          {{ t("roles.create") }}
        </Button>
      </div>
    </Card>
  </div>

  <!-- Dialogs -->
  <CreateDialog :open="createDialogOpen" @close="createDialogOpen = false" />
  <EditDialog
    :open="editDialogOpen"
    :role="selectedRole"
    @close="editDialogOpen = false"
  />
  <DeleteDialog
    :open="deleteDialogOpen"
    :role="selectedRole"
    @close="deleteDialogOpen = false"
  />
  <ViewPermissionsDialog
    :open="viewPermissionsDialogOpen"
    :role="selectedRole"
    @close="viewPermissionsDialogOpen = false"
  />
</template>
