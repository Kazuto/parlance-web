<script setup lang="ts">
import { Icon } from "@thkzt/eunoia";

// Points those with read_update to the settings when a newer release is out, or
// when the server runs a version this web app isn't made for.
const { t } = useI18n();
const { can } = usePermission();
const { available, versions } = useUpdates();

const message = computed(() => {
  if (!can.value("read_update")) return undefined;
  if (!versions.serverFits.value) return t("versions.noticeMismatch");

  return available.value ? t("versions.noticeAvailable") : undefined;
});
</script>

<template>
  <NuxtLink
    v-if="message"
    to="/settings#updates"
    class="flex items-center gap-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:underline focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:text-primary-300"
    data-testid="update-notice"
  >
    <Icon name="arrow-circle-up" size="xs" />
    {{ message }}
  </NuxtLink>
</template>
