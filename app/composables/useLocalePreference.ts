import type { LocaleObject } from "@nuxtjs/i18n";

export function useLocalePreference() {
  const { locale, locales, setLocale } = useI18n();
  const authStore = useAuthStore();

  // Initialize locale from user profile or localStorage
  const initializeLocale = () => {
    let preferredLocale: string | undefined;

    // Priority: user profile > localStorage > default
    if (authStore.user?.locale) {
      preferredLocale = authStore.user.locale;
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem("preferred-locale");
      if (stored) {
        preferredLocale = stored;
      }
    }

    // Apply the preferred locale if it's valid
    if (
      preferredLocale &&
      locales.value.some((l) => l.code === preferredLocale)
    ) {
      void setLocale(preferredLocale as LocaleObject["code"]);
    }

    // Update HTML lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", locale.value);
    }
  };

  // Watch for user changes and update locale
  watch(
    () => authStore.user?.locale,
    (newUserLocale) => {
      if (
        newUserLocale &&
        locales.value.some((l) => l.code === newUserLocale)
      ) {
        void setLocale(newUserLocale as LocaleObject["code"]);
      }
    },
  );

  // Update HTML lang attribute when locale changes
  watch(locale, (newLocale) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", newLocale);
    }
  });

  return {
    initializeLocale,
  };
}
