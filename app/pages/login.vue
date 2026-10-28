<script setup lang="ts">
import {
  Alert,
  Input,
  Button,
  Card,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { ssoRedirectUri } from "~/lib/sso";
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

// Single sign-on providers, offered next to the password.
const { data: providerData } = useQuery(api.auth.signInProviders.use({}));
const providers = computed(() => providerData.value?.providers ?? []);
const { mutateAsync: startSso } = useMutation(api.auth.startSso.use());
const startingSso = ref<string>();

async function signInWith(providerId: string) {
  error.value = undefined;
  startingSso.value = providerId;

  try {
    const { authorizationUrl } = await startSso({
      providerId,
      redirectUri: ssoRedirectUri(),
    });

    if (!authorizationUrl) throw new Error();

    // The provider sends the browser back to /sso/callback.
    window.location.assign(authorizationUrl);
  } catch (err) {
    error.value =
      err instanceof Error && extractErrorCode(err)
        ? getErrorMessage(err)
        : t("auth.loginFailed");
    startingSso.value = undefined;
  }
}

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
              {{ t("common.email") }}
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
              {{ t("common.password") }}
            </Input>
          </div>

          <Alert v-if="error" variant="danger" persistent>
            {{ error }}
          </Alert>

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

        <div v-if="providers.length" class="mt-6 space-y-3">
          <div
            class="flex items-center gap-3 text-xs text-gray-500 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200"
          >
            {{ t("common.or") }}
          </div>
          <Button
            v-for="provider in providers"
            :key="provider.id ?? ''"
            type="button"
            class="w-full justify-center"
            :disabled="!!startingSso || loading"
            @click="provider.id && signInWith(provider.id)"
          >
            {{
              startingSso === provider.id
                ? t("auth.sso.redirecting")
                : t("auth.sso.signInWith", { name: provider.name ?? "" })
            }}
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
