// Checks a translation against its source text for what a reviewer would catch:
// placeholders, plural forms, markup and the edges of the text. Placeholders, plural
// forms and line breaks are checked the way the server checks machine translations
// (internal/translate/clean.go), so a suggestion reads the same before and after.

export type QaCode =
  | "PLACEHOLDER_MISSING"
  | "PLACEHOLDER_UNEXPECTED"
  | "PLURAL_FORMS"
  | "LINE_BREAKS"
  | "WHITESPACE_START"
  | "WHITESPACE_END"
  | "TAG_MISSING"
  | "TAG_UNEXPECTED"
  | "PUNCTUATION_END";

export type QaWarning = { code: QaCode; detail?: string };

// {name} as the server matches it, printf's %s and %1$d, and Laravel's :name. A colon
// right after a letter, digit or colon is text, as in "10:30" or "https://".
const PLACEHOLDER =
  /\{[^{}]+\}|%(?:\d+\$)?[-+0#]*\d*(?:\.\d+)?[sdifuxXoeEgGc]|(?<![\p{L}\p{N}:]):[A-Za-z_]\w*/gu;
const TAG = /<(\/?)([A-Za-z][\w-]*)(?:\s[^<>]*)?\/?>/g;

// Marks that end a sentence in other scripts count as their ASCII forms.
const FOLDED_MARKS: Record<string, string> = {
  "。": ".",
  "．": ".",
  "｡": ".",
  "।": ".",
  "۔": ".",
  "！": "!",
  "？": "?",
  "؟": "?",
  "：": ":",
};
const TERMINAL_MARKS = new Set([".", "!", "?", ":", "…"]);

function placeholders(text: string): string[] {
  // "%%" is a literal percent sign, not the start of one.
  return text.replaceAll("%%", "").match(PLACEHOLDER) ?? [];
}

function tags(text: string) {
  return [...text.matchAll(TAG)].map(
    ([, closing, name]) => `<${closing}${name!.toLowerCase()}>`,
  );
}

/** What is in `values` but not in `other`, counting repeats. */
function without(values: string[], other: string[]) {
  const rest = [...other];

  return values.filter((value) => {
    const index = rest.indexOf(value);

    if (index < 0) return true;
    rest.splice(index, 1);

    return false;
  });
}

function unique(values: string[]) {
  return [...new Set(values)];
}

/** The mark the text ends with: a sentence end, other punctuation, or none. */
function ending(text: string) {
  const last = [...text.trimEnd()].at(-1) ?? "";
  const mark = FOLDED_MARKS[last] ?? last;

  if (TERMINAL_MARKS.has(mark)) return mark;

  return /\p{P}/u.test(mark) ? "other" : "";
}

/** What a reviewer should check in the translation; empty for blank texts. */
export function checkTranslation(
  source: string,
  translation: string,
): QaWarning[] {
  if (!source.trim() || !translation.trim()) return [];

  const warnings: QaWarning[] = [];
  const want = placeholders(source);
  const got = placeholders(translation);

  for (const placeholder of unique(want)) {
    if (!got.includes(placeholder))
      warnings.push({ code: "PLACEHOLDER_MISSING", detail: placeholder });
  }

  for (const placeholder of unique(got)) {
    if (!want.includes(placeholder))
      warnings.push({ code: "PLACEHOLDER_UNEXPECTED", detail: placeholder });
  }

  if (source.split("|").length !== translation.split("|").length)
    warnings.push({ code: "PLURAL_FORMS" });

  // Breaks at the edges are whitespace, reported below.
  if (!source.trim().includes("\n") && translation.trim().includes("\n"))
    warnings.push({ code: "LINE_BREAKS" });

  if (source.match(/^\s*/)![0] !== translation.match(/^\s*/)![0])
    warnings.push({ code: "WHITESPACE_START" });

  if (source.match(/\s*$/)![0] !== translation.match(/\s*$/)![0])
    warnings.push({ code: "WHITESPACE_END" });

  const sourceTags = tags(source);
  const translationTags = tags(translation);

  for (const tag of unique(without(sourceTags, translationTags)))
    warnings.push({ code: "TAG_MISSING", detail: tag });

  for (const tag of unique(without(translationTags, sourceTags)))
    warnings.push({ code: "TAG_UNEXPECTED", detail: tag });

  // Only a sentence end against no mark at all: other marks are often how the
  // language writes it, such as the Greek question mark ";" or a closing quote.
  const sourceEnd = ending(source);
  const translationEnd = ending(translation);

  if (
    (TERMINAL_MARKS.has(sourceEnd) && !translationEnd) ||
    (!sourceEnd && TERMINAL_MARKS.has(translationEnd))
  )
    warnings.push({ code: "PUNCTUATION_END", detail: sourceEnd });

  return warnings;
}
