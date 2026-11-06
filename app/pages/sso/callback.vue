<script setup lang="ts">
import { Alert, Button, Card } from "@thkzt/eunoia";
import { NuxtLink } from "#components";

// Where a single sign-on provider sends the browser back to, with a code to sign
// in with or why it didn't sign in.
definePageMeta({
  layout: "auth",
});

const route = useRoute();
const authStore = useAuthStore();
const { t } = useI18n();
const { extractErrorCode, getErrorMessage } = useErrorHelper();

const error = ref<string>();
// What the provider or server said, which helps an admin see what went wrong.
const detail = ref<string>();

onMounted(async () => {
  const { code, state, error: refused, error_description } = route.query;

  if (typeof refused === "string") {
    error.value = t("auth.sso.refused");
    detail.value =
      typeof error_description === "string" ? error_description : refused;

    return;
  }

  if (typeof code !== "string" || typeof state !== "string") {
    error.value = t("auth.sso.incomplete");

    return;
  }

  try {
    await authStore.finishSso(state, code);
  } catch (err) {
    const known = err instanceof Error && extractErrorCode(err);

    error.value = known ? getErrorMessage(err) : t("auth.loginFailed");
    detail.value = known
      ? err.message.replace(/^\[[A-Z_]+\]\s*/, "")
      : undefined;
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">{{ t("app.name") }}</h1>
      </div>

      <Card>
        <div class="space-y-4">
          <p v-if="!error" role="status" class="text-sm text-gray-600">
            {{ t("auth.sso.signingIn") }}
          </p>
          <template v-else>
            <Alert variant="danger" persistent>{{ error }}</Alert>
            <p v-if="detail" class="text-xs break-words text-gray-500">
              {{ detail }}
            </p>
            <Button
              primary
              class="w-full justify-center"
              :as="NuxtLink"
              to="/login"
            >
              {{ t("auth.sso.backToSignIn") }}
            </Button>
          </template>
        </div>
      </Card>
    </div>
  </div>
</template>
