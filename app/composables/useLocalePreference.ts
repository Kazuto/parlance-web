import type { LocaleObject } from "@nuxtjs/i18n";

export function useLocalePreference() {
  const { locale, locales, setLocale } = useI18n();
  const authStore = useAuthStore();
  const storedLocale = useLocalStorage("preferred-locale", "");

  // First supported locale from the browser's languages, matching "de-AT" to "de"
  const browserLocale = () =>
    (navigator.languages ?? [navigator.language])
      .map((language) => language.toLowerCase().split("-")[0])
      .find((code) => locales.value.some((l) => l.code === code));

  // Initialize locale from user profile, localStorage or the browser
  const initializeLocale = () => {
    let preferredLocale: string | undefined;

    // Priority: user profile > localStorage > browser language > default
    if (authStore.user?.locale) {
      preferredLocale = authStore.user.locale;
    } else if (typeof window !== "undefined") {
      preferredLocale = storedLocale.value
        ? storedLocale.value
        : browserLocale();
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
