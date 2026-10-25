<script setup lang="ts">
// What every user may change about themselves, whatever their permissions.
const { t } = useI18n();
const authStore = useAuthStore();

usePage(() => ({
  width: "wide",
  title: t("nav.account"),
  description: t("account.pageDescription"),
  showHeader: false,
}));
</script>

<template>
  <div class="space-y-6">
    <AccountSettings v-if="authStore.user" />
    <AccountLanguageSettings />
    <AccountApiTokens v-if="authStore.user" />
  </div>
</template>
