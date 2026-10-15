<script setup lang="ts">
import { Button, Dialog, Input, Textarea, Checkbox } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { groupPermissionsByResource } from "~/composables/permission/usePermissionList";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";

const props = defineProps<{ open: boolean; role?: Role }>();
const emit = defineEmits<{ close: []; updated: [role: Role] }>();

const { t } = useI18n();
const toast = useToast();

const name = ref("");
const description = ref("");
const permissionIds = ref<string[]>([]);
const error = ref<string>();

const permissionsPagination = ref({ page: 1, perPage: 1000 });
const {
  data: permissionsData,
  error: permissionError,
  isLoading: permissionsLoading,
} = useQuery(api.permissions.list.use({ pagination: permissionsPagination }));

const permissionsByResource = computed(() => {
  if (!permissionsData.value?.permissions) return {};
  return groupPermissionsByResource(permissionsData.value.permissions);
});

const resourceKeys = computed(() =>
  Object.keys(permissionsByResource.value).sort(),
);

function togglePermission(permissionId: string | null | undefined) {
  if (!permissionId) return;
  const index = permissionIds.value.indexOf(permissionId);
  if (index > -1) {
    permissionIds.value.splice(index, 1);
  } else {
    permissionIds.value.push(permissionId);
  }
}

function toggleResourceGroup(resource: string) {
  const resourcePermissions = permissionsByResource.value[resource] || [];
  const resourcePermissionIds = resourcePermissions
    .map((p) => p.id)
    .filter((id): id is string => !!id);

  const allSelected = resourcePermissionIds.every((id) =>
    permissionIds.value.includes(id),
  );

  if (allSelected) {
    // Deselect all
    permissionIds.value = permissionIds.value.filter(
      (id) => !resourcePermissionIds.includes(id),
    );
  } else {
    // Select all
    const toAdd = resourcePermissionIds.filter(
      (id) => !permissionIds.value.includes(id),
    );
    permissionIds.value.push(...toAdd);
  }
}

function isResourceGroupChecked(resource: string) {
  const resourcePermissions = permissionsByResource.value[resource] || [];
  const resourcePermissionIds = resourcePermissions
    .map((p) => p.id)
    .filter((id): id is string => !!id);

  if (resourcePermissionIds.length === 0) return false;

  return resourcePermissionIds.every((id) => permissionIds.value.includes(id));
}

function isResourceGroupIndeterminate(resource: string) {
  const resourcePermissions = permissionsByResource.value[resource] || [];
  const resourcePermissionIds = resourcePermissions
    .map((p) => p.id)
    .filter((id): id is string => !!id);

  if (resourcePermissionIds.length === 0) return false;

  const selectedCount = resourcePermissionIds.filter((id) =>
    permissionIds.value.includes(id),
  ).length;

  return selectedCount > 0 && selectedCount < resourcePermissionIds.length;
}

const roleStore = useRoleStore();
const updateRole = roleStore.update.mutateAsync;
const isPending = computed(() => roleStore.update.isPending);

watch(
  () => props.open,
  (open) => {
    if (open && props.role) {
      name.value = props.role.name || "";
      description.value = props.role.description || "";
      permissionIds.value =
        props.role.permissions
          ?.map((p) => p.id)
          .filter((id): id is string => !!id) || [];
      error.value = undefined;
    }
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  if (isPending.value || !props.role) return;
  error.value = undefined;

  if (!name.value.trim()) {
    error.value = t("roles.nameRequired");
    return;
  }

  try {
    const permissions = permissionIds.value.map((id) => ({ id }));
    const response = await updateRole({
      id: props.role.id,
      name: name.value.trim(),
      description: description.value.trim(),
      permissions,
    });

    toast.add(t("roles.updated", { name: name.value.trim() }), {
      variant: "success",
    });

    if (response.role) emit("updated", response.role);
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : t("roles.updateFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t('roles.edit')"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="name"
        required
        :disabled="isPending"
        :placeholder="t('roles.nameExample')"
      >
        {{ t("common.name") }}
      </Input>

      <Textarea
        v-model="description"
        :disabled="isPending"
        :placeholder="t('roles.descriptionPlaceholder')"
      >
        {{ t("common.description") }}
      </Textarea>

      <div class="space-y-2">
        <label class="text-sm font-medium text-neutral-700">
          {{ t("common.permissions") }}
        </label>

        <div
          v-if="permissionsLoading"
          class="text-sm text-neutral-500 p-4 text-center"
        >
          Loading permissions...
        </div>

        <div
          v-else-if="permissionError"
          class="text-sm text-red-600 bg-red-50 p-3 rounded"
        >
          Failed to load permissions
        </div>

        <div
          v-else-if="resourceKeys.length"
          class="border border-neutral-200 rounded-lg max-h-96 overflow-y-auto"
        >
          <div
            v-for="resource in resourceKeys"
            :key="resource"
            class="border-b border-neutral-200 last:border-0"
          >
            <div
              class="sticky top-0 bg-neutral-50 px-4 py-2 border-b border-neutral-200"
            >
              <Checkbox
                :model-value="isResourceGroupChecked(resource)"
                :indeterminate="isResourceGroupIndeterminate(resource)"
                :disabled="isPending"
                @update:model-value="toggleResourceGroup(resource)"
              >
                <template #description>
                  <span class="font-medium capitalize">{{ resource }}</span>
                </template>
              </Checkbox>
            </div>
            <div class="px-4 py-3 grid grid-cols-2 gap-2">
              <Checkbox
                v-for="permission in permissionsByResource[resource]"
                :key="permission.id ?? undefined"
                :model-value="
                  permission.id ? permissionIds.includes(permission.id) : false
                "
                :disabled="isPending"
                @update:model-value="togglePermission(permission.id)"
              >
                <template #description>
                  {{ permission.action || permission.name || "Unknown" }}
                </template>
              </Checkbox>
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-sm text-neutral-500 p-4 text-center border border-neutral-200 rounded-lg"
        >
          {{ t("roles.noPermissions") }}
        </div>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex items-center justify-end gap-3 pt-4">
        <Button type="button" ghost :disabled="isPending" @click="handleClose">
          {{ t("common.cancel") }}
        </Button>
        <Button type="submit" primary :disabled="isPending">
          {{ isPending ? t("common.saving") : t("common.save") }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
