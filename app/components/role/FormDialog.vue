<script setup lang="ts">
import {
  Alert,
  Button,
  Dialog,
  Input,
  Textarea,
  Checkbox,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
import { api } from "~/lib/api";
import { groupPermissionsByResource } from "~/lib/permissions";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";

// Without a role the dialog creates one; with a role it edits that role.
const props = defineProps<{ open: boolean; role?: Role }>();
const emit = defineEmits<{
  close: [];
  created: [role: Role];
  updated: [role: Role];
}>();

const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const { resourceLabel, actionLabel } = usePermissionLabels();
const { placeholder: namePlaceholder } = useTypingPlaceholder(() =>
  ["translator", "reviewer", "admin", "developer", "editor", "manager"].map(
    (example) => t(`roles.nameExample.${example}`),
  ),
);

const name = ref("");
const description = ref("");
const permissionIds = ref<string[]>([]);

const {
  items: permissions,
  error: permissionError,
  isLoading: permissionsLoading,
} = useAllPages(api.permissions.list, (response) => response.permissions);

const permissionsByResource = computed(() =>
  groupPermissionsByResource(permissions.value),
);

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
const isEdit = computed(() => !!props.role);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => roleStore.create.isPending || roleStore.update.isPending,
  reset: () => {
    name.value = props.role?.name ?? "";
    description.value = props.role?.description ?? "";
    permissionIds.value =
      props.role?.permissions
        ?.map((permission) => permission.id)
        .filter((id): id is string => !!id) ?? [];
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    if (!name.value.trim()) {
      error.value = t("roles.nameRequired");

      return false;
    }

    const input = {
      name: name.value.trim(),
      description: description.value.trim(),
      permissions: { ids: permissionIds.value },
    };

    if (props.role) {
      const response = await roleStore.update.mutateAsync({
        id: props.role.id,
        ...input,
      });

      showSuccess(t("roles.updated", { name: input.name }));
      if (response.role) emit("updated", response.role);
    } else {
      const response = await roleStore.create.mutateAsync(input);

      showSuccess(t("roles.created", { name: input.name }));
      if (response.role) emit("created", response.role);
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'roles.edit' : 'roles.create')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="name"
        required
        :disabled="isPending"
        :placeholder="namePlaceholder"
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
        <label
          class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {{ t("common.permissions") }}
        </label>

        <div
          v-if="permissionsLoading"
          class="text-sm text-neutral-500 dark:text-neutral-400 p-4 text-center"
        >
          {{ t("roles.permissionsLoading") }}
        </div>

        <Alert v-else-if="permissionError" variant="danger" dense persistent>
          {{ t("roles.permissionsLoadFailed") }}
        </Alert>

        <div
          v-else-if="resourceKeys.length"
          class="border border-neutral-200 dark:border-neutral-700 rounded-lg max-h-96 overflow-y-auto"
        >
          <div
            v-for="resource in resourceKeys"
            :key="resource"
            class="relative border-b border-neutral-200 dark:border-neutral-700 last:border-0"
          >
            <div
              class="sticky top-0 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700"
            >
              <Checkbox
                :model-value="isResourceGroupChecked(resource)"
                :indeterminate="isResourceGroupIndeterminate(resource)"
                :disabled="isPending"
                @update:model-value="toggleResourceGroup(resource)"
              >
                <template #description>
                  <span class="font-medium">{{ resourceLabel(resource) }}</span>
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
                  {{ actionLabel(permission.action || permission.name || "") }}
                </template>
              </Checkbox>
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-sm text-neutral-500 dark:text-neutral-400 p-4 text-center border border-neutral-200 dark:border-neutral-700 rounded-lg"
        >
          {{ t("roles.noPermissions") }}
        </div>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button
          type="submit"
          primary
          :disabled="isPending"
          @click="handleSubmit"
        >
          {{
            isPending
              ? t(isEdit ? "common.saving" : "common.creating")
              : t(isEdit ? "common.save" : "roles.create")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
