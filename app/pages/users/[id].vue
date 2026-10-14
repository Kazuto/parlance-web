<script setup lang="ts">
import { Button, Card, Input, Select } from "@thkzt/eunoia";
import { useRoleList } from "~/composables/role/useRoleList";
import { useUserGet } from "~/composables/user/useUserGet";
import type { Role } from "~/lib/api/schemas/RoleSchema";

const route = useRoute();
const router = useRouter();

const { data: rolesData } = useRoleList();

const {
  data,
  isLoading: isLoadingLocale,
  refetch,
} = useUserGet({
  id: route.params.id as string,
});

usePage(
  computed(() => ({
    width: "wide",
    title: `User: ${data.value?.user?.name ?? ""}`,
    backAction: {
      content: "Back to user overview",
      onClick: () => router.push("/users"),
      icon: "arrow-left",
    },
  })),
);

const { update } = useUserStore();
const { mutateAsync: updateUser, error: errorUpdate } = update;

const error = ref<string | undefined>();

const form = ref({
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  roles: [] as string[],
});

const rolesOptions = computed(
  () =>
    rolesData.value?.roles.map((role: Role) => ({
      label: role.name,
      value: role.id,
    })) ?? [],
);

watch(
  data,
  (newData) => {
    if (!newData?.user) return;
    form.value = {
      name: newData.user.name,
      email: newData.user.email,
      password: "",
      passwordConfirm: "",
      roles: newData.user.roles.map((role) => role.id),
    };
  },
  { immediate: true },
);

const toast = useToast();

async function handleUpdate() {
  error.value = undefined;

  console.log(form.value);

  const user = data.value?.user;

  if (!user) {
    error.value = "User not found";
    return;
  }

  await updateUser(
    {
      id: user.id,
      name: form.value.name,
      email: form.value.email,
      ...(form.value.password ? { password: form.value.password } : {}),
      role_ids: form.value.roles,
    },
    {
      onSuccess: async () => {
        toast.add(`User ${user.name} updated`, {
          variant: "success",
        });

        await refetch();
      },
      onError: () => {
        toast.add(`Failed to update user: ${user.name}`, {
          variant: "danger",
        });
      },
    },
  );
}

const isPasswordInvalid = computed(() => {
  return form.value.password !== form.value.passwordConfirm;
});

const isFormInvalid = computed(() => {
  if (isPasswordInvalid.value) return true;
  if (form.value.name === "") return true;
  if (form.value.email === "") return true;

  return false;
});
</script>

<template>
  <div v-if="isLoadingLocale">Loading...</div>
  <div v-else-if="errorUpdate">Error: {{ errorUpdate.message }}</div>

  <template v-else-if="data?.user">
    <Card>
      <div class="space-y-4">
        <Input id="name" v-model="form.name" name="name"> Name </Input>
        <Input id="email" v-model="form.email" name="email"> Email </Input>

        <Input
          id="password"
          v-model="form.password"
          type="password"
          name="password"
        >
          Password
        </Input>
        <Input
          id="passwordConfirm"
          v-model="form.passwordConfirm"
          type="password"
          name="passwordConfirm"
        >
          Confirm Password
        </Input>

        <div v-if="data?.user?.roles">
          <Select v-model="form.roles" multiple :options="rolesOptions">
            Roles
          </Select>
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button primary :disabled="isFormInvalid" @click="handleUpdate">
            Update User
          </Button>
        </div>
      </div>
    </Card>
  </template>
</template>
