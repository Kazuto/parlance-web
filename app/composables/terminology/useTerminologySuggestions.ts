import { useQuery } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { api } from "~/lib/api";
import type { TerminologySuggestion } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

/** How a glossary term shows up in a translation. */
export type TermStatus = "untranslated" | "unused" | "used";

export type TermMatch = TerminologySuggestion & { status: TermStatus };

/** Whether `term` appears as a whole word in `text`, ignoring case and width. */
function containsTerm(text: string, term: string) {
  const normalized = text.normalize("NFKC").toLocaleLowerCase();
  const needle = term.normalize("NFKC").toLocaleLowerCase();
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
    "u",
  ).test(normalized);
}

/**
 * Glossary terms in the source text and how the translation uses them. The row chip
 * and the context panel call this with the same inputs, so they share one request.
 */
export function useTerminologySuggestions(
  sourceText: MaybeRefOrGetter<string>,
  targetLocaleId: MaybeRefOrGetter<string | undefined>,
  translation: MaybeRefOrGetter<string>,
) {
  const source = computed(() => toValue(sourceText).trim());
  const debouncedSource = refDebounced(source, 400);
  const localeId = computed(() => toValue(targetLocaleId) ?? "");

  const options = api.terminologies.suggest.use({
    sourceText: debouncedSource,
    targetLocaleId: localeId,
  });

  const { data, isFetching, error, refetch } = useQuery({
    ...options,
    enabled: computed(
      () =>
        toValue(options.enabled) &&
        !!debouncedSource.value &&
        source.value === debouncedSource.value &&
        !!localeId.value,
    ),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const matches = computed<TermMatch[]>(() => {
    // Results for an older source would match the wrong words.
    if (source.value !== debouncedSource.value) return [];

    const text = toValue(translation);

    return (data.value?.suggestions ?? [])
      .filter((suggestion) => suggestion.targetTranslation?.trim())
      .map((suggestion) => ({
        ...suggestion,
        status: !text.trim()
          ? "untranslated"
          : containsTerm(text, suggestion.targetTranslation ?? "")
            ? "used"
            : "unused",
      }));
  });

  /** One status for all matches: any unused term wins, then all used, else untranslated. */
  const status = computed<TermStatus>(() => {
    const statuses = matches.value.map((match) => match.status);

    if (statuses.includes("unused")) return "unused";

    if (statuses.length && statuses.every((s) => s === "used")) return "used";

    return "untranslated";
  });

  return {
    matches,
    status,
    hasSource: computed(() => !!source.value),
    isFetching,
    error,
    refetch,
  };
}
