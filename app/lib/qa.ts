import type { Formality } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

// Checks a translation against its source text for what a reviewer would catch:
// placeholders, plural forms, markup, the edges of the text and the form of
// address. Placeholders, plural forms, line breaks and the form of address are
// checked the way the server checks machine translations (internal/translate), so
// a suggestion reads the same before and after.

export type QaCode =
  | "PLACEHOLDER_MISSING"
  | "PLACEHOLDER_UNEXPECTED"
  | "PLURAL_FORMS"
  | "LINE_BREAKS"
  | "WHITESPACE_START"
  | "WHITESPACE_END"
  | "TAG_MISSING"
  | "TAG_UNEXPECTED"
  | "PUNCTUATION_END"
  | "FORMALITY";

export type QaWarning = { code: QaCode; detail?: string };

/** The language a translation is in, for the checks that depend on it. */
export type QaTarget = {
  code?: string | null;
  formality?: Formality | null;
};

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

// How a form of address shows in a language: `words` mark it in any case,
// `capitalized` only in this case and not where a sentence starts, where German
// "Sie" is also "they". Words both forms share, such as Spanish "su", are left out.
type AddressWords = { words?: string[]; capitalized?: string[] };

const words = (list: string) => list.split(" ");

const FORMS: Record<string, { formal: AddressWords; informal: AddressWords }> =
  {
    de: {
      formal: {
        capitalized: words("Sie Ihr Ihre Ihren Ihrem Ihrer Ihres Ihnen"),
      },
      informal: {
        words: words("du dich dir dein deine deinen deinem deiner deines"),
      },
    },
    fr: {
      formal: { words: words("vous votre vos") },
      informal: { words: words("tu te toi ton ta tes") },
    },
    es: {
      formal: { words: words("usted ustedes") },
      informal: { words: words("tú tu tus te ti contigo") },
    },
    it: {
      formal: { capitalized: words("Lei Suo Sua Suoi Sue") },
      informal: { words: words("tu ti te tuo tua tuoi tue") },
    },
    nl: {
      formal: { words: words("u uw") },
      informal: { words: words("je jij jou jouw") },
    },
    ru: {
      formal: {
        words: words(
          "вы вас вам вами ваш ваша ваше ваши вашего вашей вашему вашим ваших вашу вашем",
        ),
      },
      informal: {
        words: words(
          "ты тебя тебе тобой твой твоя твоё твое твои твоего твоей твоему твоим твоих твою твоём твоем",
        ),
      },
    },
  };

function placeholders(text: string): string[] {
  // "%%" is a literal percent sign, not the start of one.
  return text.replaceAll("%%", "").match(PLACEHOLDER) ?? [];
}

/**
 * The text with its placeholders blanked out. They stay as they are, so "{name}"
 * doesn't use the glossary term "Name".
 */
export function withoutPlaceholders(text: string) {
  return text.replaceAll("%%", " ").replace(PLACEHOLDER, " ");
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

/** Whether a word after `before` starts a sentence, perhaps after opening quotes. */
function startsSentence(before: string) {
  const rest = before.replace(/[ \t"'\p{Pi}\p{Ps}]+$/u, "");

  return !rest || /[.!?…:\n\r]$/.test(rest);
}

/** The first word in the other form of address than the target language asks for. */
function wrongFormality(translation: string, target?: QaTarget) {
  const forms = FORMS[target?.code?.toLowerCase().split(/[-_]/)[0] ?? ""];
  const other =
    target?.formality === "FORMALITY_FORMAL"
      ? forms?.informal
      : target?.formality === "FORMALITY_INFORMAL"
        ? forms?.formal
        : undefined;

  if (!other) return undefined;

  // {name} is no word of the text, even when it reads like one.
  const text = translation.replace(/\{[^{}]+\}/g, "_");

  for (const match of text.matchAll(/[\p{L}\p{M}]+/gu)) {
    const word = match[0];

    if (other.words?.includes(word.toLowerCase())) return word;
    if (
      other.capitalized?.includes(word) &&
      !startsSentence(text.slice(0, match.index))
    )
      return word;
  }

  return undefined;
}

/**
 * What a reviewer should check in the translation; empty for blank texts. The
 * form of address is only checked with a target language that asks for one.
 */
export function checkTranslation(
  source: string,
  translation: string,
  target?: QaTarget,
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

  const address = wrongFormality(translation, target);

  if (address) warnings.push({ code: "FORMALITY", detail: address });

  return warnings;
}
