import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

type StoredEntryFilters = { scopes: string[]; status: string };

/**
 * Filters remembered in this browser so they survive page changes. Languages are
 * shared by the entries and glossary pages and stored by locale code, like the URL.
 */
export function useStoredFilters() {
  const languages = useLocalStorage<string[]>("filters.languages", []);

  const entries = useLocalStorage<StoredEntryFilters>(
    "filters.entries",
    { scopes: [], status: "" },
    { mergeDefaults: true },
  );

  return { languages, entries };
}

/** Ids of the locales with the given codes; unknown codes are skipped. */
export function localeIdsFromCodes(locales: Locale[], codes: unknown) {
  if (!Array.isArray(codes)) return [];

  return locales
    .filter((locale) => locale.code && codes.includes(locale.code))
    .map((locale) => locale.id ?? "")
    .filter(Boolean);
}
