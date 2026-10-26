import { useQuery } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { api } from "~/lib/api";
import type { TerminologySuggestion } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

/** How a glossary term shows up in a translation. */
export type TermStatus = "untranslated" | "unused" | "used";

export type TermMatch = TerminologySuggestion & { status: TermStatus };

/**
 * Glossary terms in the source text and how the translation uses them. The server
 * matches both by their word forms in each language, e.g. "scope" in "No scopes" and
 * "Bereich" in "Keine Bereiche", so the translation goes along. The row chip and the
 * context panel call this with the same inputs, so they share one request.
 */
export function useTerminologySuggestions(
  sourceText: MaybeRefOrGetter<string>,
  targetLocaleId: MaybeRefOrGetter<string | undefined>,
  translation: MaybeRefOrGetter<string>,
) {
  const source = computed(() => toValue(sourceText).trim());
  const debouncedSource = refDebounced(source, 400);
  const localeId = computed(() => toValue(targetLocaleId) ?? "");
  const text = computed(() => toValue(translation));
  const debouncedText = refDebounced(text, 400);

  const options = api.terminologies.suggest.use({
    sourceText: debouncedSource,
    targetLocaleId: localeId,
    translation: debouncedText,
  });

  const { data, isFetching, error, refetch } = useQuery({
    ...options,
    // While only the translation changes, the last answer stays until the new one
    // arrives; matches for another source or language never show.
    placeholderData: (previous, previousQuery) => {
      const input = previousQuery?.queryKey[2] as
        | { sourceText?: string; targetLocaleId?: string }
        | undefined;

      return input?.sourceText === debouncedSource.value &&
        input?.targetLocaleId === localeId.value
        ? previous
        : undefined;
    },
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

    return (data.value?.suggestions ?? [])
      .filter((suggestion) => suggestion.targetTranslation?.trim())
      .map((suggestion) => ({
        ...suggestion,
        status: !text.value.trim()
          ? "untranslated"
          : suggestion.used
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
