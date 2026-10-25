<script setup lang="ts">
// The settings for everyone on the instance. Each part needs its own permission.
definePageMeta({
  // Without any, the user's own settings are what they came for, e.g. through an
  // old bookmark from when both lived here.
  middleware: () => {
    const { canAny } = usePermission();

    if (!canAny.value(INSTANCE_SETTINGS_PERMISSIONS))
      return navigateTo("/account", { replace: true });
  },
});

const { t } = useI18n();
const { can } = usePermission();

usePage(() => ({
  width: "wide",
  title: t("settings.title"),
  description: t("settings.description"),
  showHeader: false,
}));
</script>

<template>
  <div class="space-y-6">
    <TranslationServerSettings v-if="can('read_translation_server')" />
    <SsoProviderSettings v-if="can('read_sso_provider')" />
    <UserRegistrationSettings v-if="can('read_user')" />
  </div>
</template>
