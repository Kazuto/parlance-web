/**
 * The name of the language `code` in the language `inLanguage`, e.g. "Allemand"
 * for "de" in "fr", from the browser's built-in CLDR data. Codes may use "_" like
 * the server takes them, e.g. "pt_BR". Undefined for codes the data doesn't know,
 * such as made-up ones like "en-informal".
 */
export function languageName(code: string, inLanguage: string) {
  let name: string | undefined;

  try {
    name = new Intl.DisplayNames([inLanguage], {
      type: "language",
      fallback: "none",
    }).of(code.replaceAll("_", "-"));
  } catch {
    // Not a valid language tag, e.g. "de-".
    return undefined;
  }

  // CLDR writes names for use within a sentence, e.g. "allemand"; in a list of
  // languages they start with a capital.
  return name
    ? name.charAt(0).toLocaleUpperCase(inLanguage) + name.slice(1)
    : undefined;
}
