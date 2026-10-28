import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { availableLocales } from "../../i18n/availableLocales";

const directory = join(import.meta.dirname, "../../i18n/locales");
const locales = availableLocales(directory);

function catalog(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(directory, file), "utf8"));
}

const english = catalog("en.json");

/** The named values a message interpolates, e.g. ["count", "name"]. */
function placeholders(message: string) {
  return [...new Set([...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))]
    .sort()
    .join(", ");
}

/** The literals a message escapes, e.g. {'{locale}'}, and its plural forms. */
function syntax(message: string) {
  const literals = [...message.matchAll(/\{'[^']*'\}/g)].map((m) => m[0]);

  return { literals, forms: message.split("|").length };
}

describe("interface languages", () => {
  it("offers a language per catalog, named in itself", () => {
    expect(locales.map((locale) => [locale.code, locale.name])).toEqual(
      expect.arrayContaining([
        ["de", "Deutsch"],
        ["en", "English"],
        ["es", "Español"],
        ["fr", "Français"],
      ]),
    );
  });

  it.each(locales.map((locale) => [locale.code, locale.files[0]!]))(
    "%s has every key of the English catalog, and no others",
    (_code, file) => {
      const keys = Object.keys(catalog(file));
      const missing = Object.keys(english).filter((key) => !keys.includes(key));
      const extra = keys.filter((key) => !(key in english));

      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    },
  );

  it.each(locales.map((locale) => [locale.code, locale.files[0]!]))(
    "%s keeps the placeholders of the English messages",
    (_code, file) => {
      const messages = catalog(file);
      const lost = Object.entries(english)
        .filter(
          ([key, message]) =>
            key in messages &&
            placeholders(messages[key]!) !== placeholders(message),
        )
        .map(([key]) => key);

      expect(lost).toEqual([]);
    },
  );

  it.each(locales.map((locale) => [locale.code, locale.files[0]!]))(
    "%s keeps the literals and plural forms of the English messages",
    (_code, file) => {
      const messages = catalog(file);
      const broken = Object.entries(english)
        .filter(
          ([key, message]) =>
            key in messages &&
            JSON.stringify(syntax(messages[key]!)) !==
              JSON.stringify(syntax(message)),
        )
        .map(([key]) => key);

      expect(broken).toEqual([]);
    },
  );
});
