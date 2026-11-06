/**
 * The name of the language `code` in the language `inLanguage`, e.g. "Allemand"
 * for "de" in "fr", from the browser's built-in CLDR data. Undefined for codes the
 * data doesn't know, such as made-up ones like "en-informal".
 */
export function languageName(code: string, inLanguage: string) {
  let name: string | undefined;

  try {
    name = new Intl.DisplayNames([inLanguage], {
      type: "language",
      fallback: "none",
    }).of(code);
  } catch {
    // Not a valid language tag, e.g. "en_US".
    return undefined;
  }

  // CLDR writes names for use within a sentence, e.g. "allemand"; in a list of
  // languages they start with a capital.
  return name
    ? name.charAt(0).toLocaleUpperCase(inLanguage) + name.slice(1)
    : undefined;
}

/**
 * Fills the empty entries of `names` (keyed by language code) with the name of
 * `code` in each of `languages`. Returns the codes it filled.
 */
export function fillLanguageNames(
  names: Record<string, string>,
  code: string,
  languages: readonly string[],
) {
  const filled: string[] = [];

  for (const language of languages) {
    if ((names[language] ?? "").trim()) continue;

    const name = languageName(code, language);

    if (!name) continue;
    names[language] = name;
    filled.push(language);
  }

  return filled;
}
