<script setup lang="ts">
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-8">
            <NuxtLink
              to="/"
              class="text-xl font-bold text-gray-900 hover:text-blue-600 transition"
            >
              Parlance
            </NuxtLink>

            <nav v-if="authStore.isLoggedIn" class="flex items-center gap-4">
              <NuxtLink
                to="/"
                class="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                active-class="text-blue-600 bg-blue-50"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                v-can="'read_locale'"
                to="/locales"
                class="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                active-class="text-blue-600 bg-blue-50"
              >
                Locales
              </NuxtLink>
            </nav>
          </div>

          <div
            v-if="authStore.isLoggedIn && authStore.user"
            class="flex items-center gap-4"
          >
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">
                {{ authStore.user.name }}
              </p>
              <p class="text-xs text-gray-500">{{ authStore.user.email }}</p>
            </div>
            <button
              class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <slot />
    </main>
  </div>
</template>
