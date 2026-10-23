import { readdirSync } from "node:fs";

/** A language the interface is in, as @nuxtjs/i18n takes it. */
export type UiLocale = {
  code: string;
  language: string;
  name: string;
  files: string[];
};

/**
 * The interface languages: one per JSON catalog in the directory, named in its
 * own language ("Deutsch" for de.json) and sorted by that name. Adding a catalog,
 * for example one exported from Parlance, adds the language once the app is built.
 */
export function availableLocales(directory: string): UiLocale[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const code = file.slice(0, -".json".length);
      let name: string;

      try {
        name =
          new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
      } catch {
        throw new Error(
          `i18n/locales/${file}: "${code}" is not a language code, such as "de" or "pt-BR"`,
        );
      }

      // Some languages write their names in lowercase, e.g. "français".
      return {
        code,
        language: code,
        name: name.charAt(0).toLocaleUpperCase(code) + name.slice(1),
        files: [file],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
