<script setup lang="ts">
import { Input, Button, Card, useTypingPlaceholder } from "@thkzt/eunoia";
definePageMeta({
  layout: "auth",
});

const authStore = useAuthStore();
const { t } = useI18n();
const { extractErrorCode, getErrorMessage } = useErrorHelper();
const router = useRouter();

const email = ref("");
const password = ref("");
const error = ref<string>();
const loading = ref(false);

const { placeholder: emailPlaceholder } = useTypingPlaceholder([
  "admin@company.com",
  "hello@startup.io",
  "contact@business.org",
  "team@project.dev",
]);

// Redirect if already logged in
watchEffect(() => {
  if (authStore.isLoggedIn) {
    router.push("/");
  }
});

async function handleLogin() {
  error.value = undefined;
  loading.value = true;

  try {
    await authStore.login(email.value, password.value);
  } catch (err) {
    // Only show server errors with a known code; anything else (e.g. the API being
    // unreachable) stays a generic message.
    error.value =
      err instanceof Error && extractErrorCode(err)
        ? getErrorMessage(err)
        : t("auth.loginFailed");
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
        <p class="mt-2 text-sm text-gray-600">{{ t("auth.signInPrompt") }}</p>
      </div>

      <Card>
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <Input
              id="email"
              v-model="email"
              type="email"
              required
              :placeholder="emailPlaceholder"
              autocomplete="email"
            >
              {{ t("auth.email") }}
            </Input>
          </div>

          <div>
            <Input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
            >
              {{ t("auth.password") }}
            </Input>
          </div>

          <div
            v-if="error"
            class="rounded-md bg-red-50 border border-red-200 p-4"
          >
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <Button
            type="submit"
            :disabled="loading || authStore.isRefreshing"
            primary
            class="w-full justify-center"
          >
            {{
              loading || authStore.isRefreshing
                ? t("auth.signingIn")
                : t("auth.signIn")
            }}
          </Button>
        </form>
      </Card>
    </div>
  </div>
</template>
