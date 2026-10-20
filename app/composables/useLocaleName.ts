import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

/**
 * A locale's name in the current UI language, e.g. "Englisch" while the app is in
 * German. Falls back to the stored name, then to the code.
 */
export function useLocaleName() {
  const { locale: uiLocale } = useI18n();

  return (locale: Pick<Locale, "name" | "names" | "code">) =>
    locale.names?.[uiLocale.value] || locale.name || locale.code || "";
}
