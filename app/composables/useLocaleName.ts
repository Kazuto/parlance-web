import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import { languageName } from "~/lib/languageNames";

/**
 * A locale's name in the current UI language, from its code: e.g. "Englisch" for
 * "en" while the app is in German. Falls back to the server's name, then to the
 * code, e.g. for a made-up code like "en-informal".
 */
export function useLocaleName() {
  const { locale: uiLocale } = useI18n();

  return (locale: Pick<Locale, "name" | "code">) =>
    (locale.code && languageName(locale.code, uiLocale.value)) ||
    locale.name ||
    locale.code ||
    "";
}
