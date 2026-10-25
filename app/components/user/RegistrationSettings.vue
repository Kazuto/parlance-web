<script setup lang="ts">
import { Card, Switch, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

// Whether people may create their own viewer account through the API. Those who
// may add users decide; the server keeps it open until they close it.
const { t } = useI18n();
const { can } = usePermission();
const { showError, showSuccess } = useErrorHelper();
const store = useUserStore();

const { data, isLoading } = useQuery(api.users.registrationSettings.use({}));
const open = computed(() => data.value?.settings?.open ?? true);

async function setOpen(value: boolean) {
  try {
    await store.updateRegistrationSettings.mutateAsync({ open: value });
    showSuccess(
      t(value ? "registration.openedToast" : "registration.closedToast"),
    );
  } catch (error) {
    showError(error);
  }
}
</script>

<template>
  <Card dense>
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-1">
        <div class="font-semibold">{{ t("registration.title") }}</div>
        <Text muted size="sm">{{
          open ? t("registration.openHint") : t("registration.closedHint")
        }}</Text>
      </div>
      <Switch
        :model-value="open"
        :aria-label="t('registration.title')"
        :disabled="
          isLoading ||
          !can('create_user') ||
          store.updateRegistrationSettings.isPending
        "
        @update:model-value="setOpen($event)"
      />
    </div>
  </Card>
</template>
