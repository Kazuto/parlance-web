<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const authStore = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const error = ref<string>();
const loading = ref(false);

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
    error.value = err instanceof Error ? err.message : "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Parlance</h1>
        <p class="mt-2 text-sm text-gray-600">Sign in to your account</p>
      </div>

      <div class="bg-white p-8 rounded-lg shadow-md">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div
            v-if="error"
            class="rounded-md bg-red-50 border border-red-200 p-4"
          >
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading || authStore.isRefreshing"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {{
              loading || authStore.isRefreshing ? "Signing in..." : "Sign in"
            }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
