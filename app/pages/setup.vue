<script setup lang="ts">
import { Button, Input, useTypingPlaceholder } from "@thkzt/eunoia";

definePageMeta({
  layout: "auth",
});

const { t } = useI18n();
const router = useRouter();
const setupClient = useSetupClient();

const adminEmail = ref("");
const adminPassword = ref("");
const adminPasswordConfirm = ref("");
const adminName = ref("");
const error = ref<string>();
const loading = ref(false);

const { placeholder: namePlaceholder } = useTypingPlaceholder([
  "John Doe",
  "Jane Smith",
  "Alex Johnson",
  "Maria Garcia",
  "David Chen",
]);

const { placeholder: emailPlaceholder } = useTypingPlaceholder([
  "admin@company.com",
  "hello@startup.io",
  "contact@business.org",
  "team@project.dev",
]);

async function handleSetup() {
  error.value = undefined;

  // Validation
  if (!adminEmail.value || !adminPassword.value || !adminName.value) {
    error.value = t("setup.allFieldsRequired");
    return;
  }

  if (adminPassword.value !== adminPasswordConfirm.value) {
    error.value = t("setup.passwordsDoNotMatch");
    return;
  }

  if (adminPassword.value.length < 8) {
    error.value = t("setup.passwordTooShort");
    return;
  }

  loading.value = true;

  try {
    await setupClient.initialize({
      adminEmail: adminEmail.value,
      adminPassword: adminPassword.value,
      adminName: adminName.value,
    });

    // Redirect to login after successful setup
    router.push("/login");
  } catch (err) {
    error.value = err instanceof Error ? err.message : t("setup.setupFailed");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">{{ t("app.name") }}</h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ t("setup.welcomeMessage") }}
        </p>
      </div>

      <div class="bg-white p-8 rounded-lg shadow-md">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ t("setup.createAdmin") }}
          </h2>
          <p class="mt-1 text-sm text-gray-600">
            {{ t("setup.createAdminDescription") }}
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSetup">
          <Input
            v-model="adminName"
            type="text"
            required
            autocomplete="name"
            :placeholder="namePlaceholder"
            :disabled="loading"
          >
            {{ t("setup.adminName") }}
          </Input>

          <Input
            v-model="adminEmail"
            type="email"
            required
            autocomplete="email"
            :placeholder="emailPlaceholder"
            :disabled="loading"
          >
            {{ t("setup.adminEmail") }}
          </Input>

          <Input
            v-model="adminPassword"
            type="password"
            required
            autocomplete="new-password"
            :disabled="loading"
            :helper="t('setup.passwordRequirements')"
          >
            {{ t("setup.adminPassword") }}
          </Input>

          <Input
            v-model="adminPasswordConfirm"
            type="password"
            required
            autocomplete="new-password"
            :disabled="loading"
          >
            {{ t("setup.confirmPassword") }}
          </Input>

          <div
            v-if="error"
            class="rounded-md bg-red-50 border border-red-200 p-4"
          >
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <Button
            type="submit"
            :disabled="loading"
            primary
            class="w-full justify-center"
          >
            {{ loading ? t("setup.settingUp") : t("setup.completeSetup") }}
          </Button>
        </form>
      </div>
    </div>
  </div>
</template>
