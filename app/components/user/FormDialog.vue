<script setup lang="ts">
import { Button, Dialog, Input, Select } from "@thkzt/eunoia";
import { useRoleList } from "~/composables/role/useRoleList";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

// Without a user the dialog creates one; with a user it edits that user.
const props = defineProps<{ open: boolean; user?: User }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const toast = useToast();
const userStore = useUserStore();
const isEdit = computed(() => !!props.user);
const isPending = computed(
  () => userStore.create.isPending || userStore.update.isPending,
);
const { data: rolesData, pagination: rolesPagination } = useRoleList();
rolesPagination.value.perPage = 100;

const form = ref({
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  roleIds: [] as string[],
});
const error = ref<string>();

const roleOptions = computed(
  () =>
    rolesData.value?.roles
      ?.filter((role) => !!role.id)
      .map((role) => ({ label: role.name ?? "", value: role.id ?? "" })) ?? [],
);
const passwordMismatch = computed(
  () =>
    !!form.value.passwordConfirm &&
    form.value.password !== form.value.passwordConfirm,
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.value = {
      name: props.user?.name ?? "",
      email: props.user?.email ?? "",
      password: "",
      passwordConfirm: "",
      roleIds:
        props.user?.roles
          ?.map((role) => role.id)
          .filter((id): id is string => !!id) ?? [],
    };
    error.value = undefined;
  },
  { immediate: true },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;
  const name = form.value.name.trim();
  const email = form.value.email.trim();
  if (!name || !email) {
    error.value = t("users.nameEmailRequired");
    return;
  }
  if (!isEdit.value && !form.value.password) {
    error.value = t("users.passwordRequired");
    return;
  }
  if (form.value.password !== form.value.passwordConfirm) {
    error.value = t("users.passwordMismatch");
    return;
  }

  try {
    if (props.user) {
      await userStore.update.mutateAsync({
        id: props.user.id,
        name,
        email,
        // An empty password keeps the current one.
        ...(form.value.password ? { password: form.value.password } : {}),
        roleIds: form.value.roleIds,
      });
      toast.add(t("users.updated", { name }), { variant: "success" });
    } else {
      await userStore.create.mutateAsync({
        name,
        email,
        password: form.value.password,
        roleIds: form.value.roleIds,
      });
      toast.add(t("users.created", { name }), { variant: "success" });
    }
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : t(isEdit.value ? "users.updateFailed" : "users.createFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'users.edit' : 'users.create')"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.name"
        required
        autocomplete="off"
        :disabled="isPending"
        :placeholder="t('users.namePlaceholder')"
      >
        {{ t("common.name") }}
      </Input>
      <Input
        v-model="form.email"
        type="email"
        required
        autocomplete="off"
        :disabled="isPending"
        :placeholder="t('users.emailPlaceholder')"
      >
        {{ t("users.email") }}
      </Input>
      <Input
        v-model="form.password"
        type="password"
        :required="!isEdit"
        autocomplete="new-password"
        :disabled="isPending"
        :helper="isEdit ? t('users.passwordKeep') : undefined"
      >
        {{ t("users.password") }}
      </Input>
      <Input
        v-model="form.passwordConfirm"
        type="password"
        :required="!isEdit || !!form.password"
        autocomplete="new-password"
        :disabled="isPending"
        :errors="passwordMismatch ? [t('users.passwordMismatch')] : undefined"
      >
        {{ t("users.passwordConfirm") }}
      </Input>
      <Select
        v-model="form.roleIds"
        teleport-to="body"
        multiple
        :options="roleOptions"
        :disabled="isPending"
        :placeholder="t('users.selectRoles')"
      >
        {{ t("nav.roles") }}
      </Select>

      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          ghost
          :disabled="isPending"
          @click="handleClose"
          >{{ t("common.cancel") }}</Button
        >
        <Button type="submit" primary :disabled="isPending">{{
          isPending
            ? t(isEdit ? "common.saving" : "common.creating")
            : t(isEdit ? "common.save" : "users.create")
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
