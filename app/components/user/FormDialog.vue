<script setup lang="ts">
import { api } from "~/lib/api";
import {
  Button,
  Dialog,
  Input,
  Select,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

// Without a user the dialog creates one; with a user it edits that user.
const props = defineProps<{ open: boolean; user?: User }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const userStore = useUserStore();
const isEdit = computed(() => !!props.user);
const { items: roles } = useAllPages(
  api.roles.list,
  (response) => response.roles,
);

const { placeholder: namePlaceholder } = useTypingPlaceholder([
  "Jane Doe",
  "John Smith",
  "Alex Johnson",
  "Maria Garcia",
  "Wei Chen",
]);
const { placeholder: emailPlaceholder } = useTypingPlaceholder([
  "jane.doe@example.com",
  "john.smith@example.com",
  "alex.johnson@example.com",
  "maria.garcia@example.com",
  "wei.chen@example.com",
]);

const form = ref({
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  roleIds: [] as string[],
});

const roleOptions = computed(() =>
  roles.value
    .filter((role) => !!role.id)
    .map((role) => ({ label: role.name ?? "", value: role.id ?? "" })),
);
const passwordMismatch = computed(
  () =>
    !!form.value.passwordConfirm &&
    form.value.password !== form.value.passwordConfirm,
);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => userStore.create.isPending || userStore.update.isPending,
  reset: () => {
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
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    const name = form.value.name.trim();
    const email = form.value.email.trim();

    if (!name || !email) {
      error.value = t("users.nameEmailRequired");

      return false;
    }

    if (!isEdit.value && !form.value.password) {
      error.value = t("users.passwordRequired");

      return false;
    }

    if (form.value.password !== form.value.passwordConfirm) {
      error.value = t("common.passwordMismatch");

      return false;
    }

    if (props.user) {
      await userStore.update.mutateAsync({
        id: props.user.id,
        name,
        email,
        // An empty password keeps the current one.
        ...(form.value.password ? { password: form.value.password } : {}),
        roles: { ids: form.value.roleIds },
      });
      showSuccess(t("users.updated", { name }));
    } else {
      await userStore.create.mutateAsync({
        name,
        email,
        password: form.value.password,
        roles: { ids: form.value.roleIds },
      });
      showSuccess(t("users.created", { name }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'users.edit' : 'users.create')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.name"
        required
        autocomplete="off"
        :disabled="isPending"
        :placeholder="namePlaceholder"
      >
        {{ t("common.name") }}
      </Input>
      <Input
        v-model="form.email"
        type="email"
        required
        autocomplete="off"
        :disabled="isPending"
        :placeholder="emailPlaceholder"
      >
        {{ t("common.email") }}
      </Input>
      <Input
        v-model="form.password"
        type="password"
        :required="!isEdit"
        autocomplete="new-password"
        :disabled="isPending"
        :helper="isEdit ? t('users.passwordKeep') : undefined"
      >
        {{ t("common.password") }}
      </Input>
      <Input
        v-model="form.passwordConfirm"
        type="password"
        :required="!isEdit || !!form.password"
        autocomplete="new-password"
        :disabled="isPending"
        :errors="passwordMismatch ? [t('common.passwordMismatch')] : undefined"
      >
        {{ t("common.confirmPassword") }}
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
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{
            isPending
              ? t(isEdit ? "common.saving" : "common.creating")
              : t(isEdit ? "common.save" : "users.create")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
