<script setup lang="ts">
import { Card, Headline, Text } from "@thkzt/eunoia";
import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { LocaleObject } from "@nuxtjs/i18n";

const { t, locale, locales, setLocale } = useI18n();
const authStore = useAuthStore();
const storedLocale = useLocalStorage("preferred-locale", "");
const { showError } = useErrorHelper();

usePage(() => ({
  width: "wide",
  title: t("settings.title"),
  description: t("settings.description"),
}));

const availableLocales = computed(() => locales.value);

const currentLocale = computed(() => locale.value);

// Mutation to update user locale in backend
const { mutateAsync: updateUserLocale, isPending: isUpdating } = useMutation({
  ...api.users.update.use(),
});

const setLanguage = async (localeCode: LocaleObject["code"]) => {
  const previousLocale = locale.value;

  try {
    // Update UI immediately for better UX
    await setLocale(localeCode);

    // Store in localStorage as fallback
    storedLocale.value = localeCode;

    // Save to backend if user is logged in
    if (authStore.user?.id) {
      const updatedUser = await updateUserLocale({
        id: authStore.user.id,
        locale: localeCode,
      });

      // Update the user in the auth store with the returned data
      if (updatedUser?.user) {
        authStore.setUser(updatedUser.user);
      }
    }
  } catch (error) {
    // Revert to previous locale on error
    await setLocale(previousLocale as LocaleObject["code"]);

    console.error("Failed to save locale preference:", error);
    showError(error as Error);
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- User Interface Language Section -->
    <Card>
      <div class="space-y-4">
        <div>
          <Headline :level="4">
            {{ t("settings.uiLanguage") }}
          </Headline>
          <Text muted size="sm">
            {{ t("settings.uiLanguageDescription") }}
          </Text>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <button
            v-for="loc in availableLocales"
            :key="loc.code"
            type="button"
            :disabled="isUpdating"
            class="relative flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all"
            :class="[
              currentLocale === loc.code
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700',
              isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ]"
            @click="setLanguage(loc.code)"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-2 h-2 rounded-full"
                :class="
                  currentLocale === loc.code
                    ? 'bg-primary-500'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                "
              />
              <div class="text-left">
                <div
                  class="font-medium"
                  :class="
                    currentLocale === loc.code
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-neutral-900 dark:text-neutral-100'
                  "
                >
                  {{ loc.name }}
                </div>
                <div
                  class="text-xs"
                  :class="
                    currentLocale === loc.code
                      ? 'text-primary-600 dark:text-primary-500'
                      : 'text-neutral-500 dark:text-neutral-400'
                  "
                >
                  {{ loc.code }}
                </div>
              </div>
            </div>
            <svg
              v-if="currentLocale === loc.code"
              class="w-5 h-5 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </Card>

    <!-- Future sections can go here -->
    <!-- <Card>
      <Headline :level="4">Other Settings</Headline>
    </Card> -->
  </div>
</template>
