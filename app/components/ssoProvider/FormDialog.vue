<script setup lang="ts">
import { Button, Checkbox, Dialog, Input, Select, Switch } from "@thkzt/eunoia";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";
import type { SsoProvider } from "~/lib/api/schemas/parlance/v1/SsoSchema";

// Without an item the dialog adds a provider; with an item it edits it. The stored
// client secret is never shown: it can only be replaced or removed.
const props = defineProps<{
  open: boolean;
  item?: SsoProvider;
  roles: Role[];
}>();
const emit = defineEmits<{ close: [] }>();

const form = ref({
  name: "",
  issuerUrl: "",
  clientId: "",
  clientSecret: "",
  removeClientSecret: false,
  defaultRoleId: "",
  enabled: true,
});
const store = useSsoProviderStore();
const isEdit = computed(() => !!props.item);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => store.create.isPending || store.update.isPending,
  reset: () => {
    form.value = {
      name: props.item?.name ?? "",
      issuerUrl: props.item?.issuerUrl ?? "",
      clientId: props.item?.clientId ?? "",
      clientSecret: "",
      removeClientSecret: false,
      defaultRoleId: props.item?.defaultRoleId ?? "",
      // The API leaves out false values, so a missing one means off; only a new
      // provider starts on.
      enabled: props.item ? !!props.item.enabled : true,
    };
  },
  close: () => emit("close"),
});

const roleOptions = computed(() => [
  { value: "", label: t("ssoProviders.noNewAccounts") },
  ...props.roles
    .filter((role) => role.id)
    .map((role) => ({ value: role.id ?? "", label: role.name ?? "" })),
]);

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function handleSubmit() {
  submit(async () => {
    const name = form.value.name.trim();
    const issuerUrl = form.value.issuerUrl.trim();
    const clientId = form.value.clientId.trim();

    if (!name || !isHttpUrl(issuerUrl) || !clientId) {
      error.value = t("ssoProviders.fieldsRequired");

      return false;
    }

    const input = { name, issuerUrl, clientId, enabled: form.value.enabled };

    if (props.item?.id) {
      // Only a typed secret replaces the stored one; removing sends an empty one.
      const clientSecret = form.value.removeClientSecret
        ? ""
        : form.value.clientSecret.trim() || undefined;

      await store.update.mutateAsync({
        id: props.item.id,
        ...input,
        clientSecret,
        // An empty id stops creating accounts.
        defaultRoleId: form.value.defaultRoleId,
      });
      showSuccess(t("ssoProviders.updated", { name }));
    } else {
      await store.create.mutateAsync({
        ...input,
        clientSecret: form.value.clientSecret.trim(),
        defaultRoleId: form.value.defaultRoleId || undefined,
      });
      showSuccess(t("ssoProviders.created", { name }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'ssoProviders.edit' : 'ssoProviders.add')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.name"
        required
        :disabled="isPending"
        :placeholder="t('ssoProviders.namePlaceholder')"
        :helper="t('ssoProviders.nameHelp')"
      >
        {{ t("common.name") }}
      </Input>
      <Input
        v-model="form.issuerUrl"
        required
        type="url"
        :disabled="isPending"
        placeholder="https://auth.example.com/realms/main"
        :helper="t('ssoProviders.issuerUrlHelp')"
      >
        {{ t("ssoProviders.issuerUrl") }}
      </Input>
      <Input v-model="form.clientId" required :disabled="isPending">
        {{ t("ssoProviders.clientId") }}
      </Input>
      <Input
        v-model="form.clientSecret"
        type="password"
        autocomplete="off"
        :disabled="isPending || form.removeClientSecret"
        :placeholder="
          item?.hasClientSecret ? t('ssoProviders.clientSecretKept') : undefined
        "
        :helper="t('ssoProviders.clientSecretHelp')"
      >
        {{ t("ssoProviders.clientSecret") }}
      </Input>
      <Checkbox
        v-if="item?.hasClientSecret"
        v-model="form.removeClientSecret"
        :disabled="isPending"
      >
        <template #description>
          {{ t("common.removeSavedSecret") }}
        </template>
      </Checkbox>
      <div class="space-y-1">
        <Select
          v-model="form.defaultRoleId"
          teleport-to="body"
          :options="roleOptions"
          :disabled="isPending"
          >{{ t("ssoProviders.newAccounts") }}</Select
        >
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("ssoProviders.newAccountsHelp") }}
        </p>
      </div>
      <Switch v-model="form.enabled" :disabled="isPending">
        {{ t("ssoProviders.enabled") }}
      </Switch>
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
              : t(isEdit ? "common.save" : "ssoProviders.add")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
