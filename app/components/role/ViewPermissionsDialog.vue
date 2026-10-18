<script setup lang="ts">
import { Dialog, Badge, Button } from "@thkzt/eunoia";
import { groupPermissionsByResource } from "~/composables/permission/usePermissionList";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";

const props = defineProps<{
  open: boolean;
  role?: Role;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const permissionsByResource = computed(() => {
  if (!props.role?.permissions) return {};
  return groupPermissionsByResource(props.role.permissions);
});

const resourceKeys = computed(() =>
  Object.keys(permissionsByResource.value).sort(),
);
</script>

<template>
  <Dialog
    :open
    :title="t('roles.allPermissions', { name: role?.name || '' })"
    @close="emit('close')"
  >
    <div class="space-y-4 max-h-96">
      <div v-if="!role?.permissions?.length" class="text-center py-8">
        <p class="text-neutral-500 dark:text-neutral-400">
          {{ t("roles.noPermissions") }}
        </p>
      </div>

      <div
        v-for="resource in resourceKeys"
        :key="resource"
        class="border-b border-neutral-200 dark:border-neutral-700 last:border-0 pb-3"
      >
        <h3
          class="font-medium text-sm text-neutral-700 dark:text-neutral-300 mb-2 capitalize"
        >
          {{ resource }}
        </h3>
        <div class="flex flex-wrap gap-1.5">
          <Badge
            v-for="permission in permissionsByResource[resource]"
            :key="permission.id ?? undefined"
            variant="secondary"
          >
            {{ permission.action }}
          </Badge>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <Button ghost @click="emit('close')">{{ t("common.close") }}</Button>
      </div>
    </template>
  </Dialog>
</template>
