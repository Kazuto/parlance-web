<script setup lang="ts">
import { Card, Headline, Switch, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

// Whether people may create their own viewer account through the API. Those who
// may add users decide; the server keeps it open until they close it.
const { t } = useI18n();
const { can } = usePermission();
const { showError, showSuccess } = useErrorHelper();
const store = useUserStore();

const { data, isLoading } = useQuery(api.users.registrationSettings.use({}));
// JSON leaves out a false bool, so settings without "open" are closed ones.
const open = computed(() => !!data.value?.settings?.open);

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
  <Card>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <Headline :level="4">{{ t("registration.title") }}</Headline>
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
