import { useQuery } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { api } from "~/lib/api";

/**
 * Approved translations into the target language of default texts like the given
 * one: the translation memory. It asks once typing pauses, leaving out the entry
 * being edited.
 */
export function useTranslationMemory(
  sourceText: MaybeRefOrGetter<string>,
  targetLocaleId: MaybeRefOrGetter<string>,
  entryId: MaybeRefOrGetter<string>,
) {
  const source = computed(() => toValue(sourceText).trim());
  const debouncedSource = refDebounced(source, 400);

  const options = api.localizations.searchMemory.use({
    sourceText: debouncedSource,
    targetLocaleId: computed(() => toValue(targetLocaleId)),
    excludeEntryId: computed(() => toValue(entryId)),
  });

  const { data, isFetching, error, refetch } = useQuery({
    ...options,
    enabled: computed(
      () =>
        toValue(options.enabled) &&
        !!debouncedSource.value &&
        source.value === debouncedSource.value,
    ),
    staleTime: 60 * 1000,
    retry: false,
  });

  // Matches for an older source text no longer fit while typing goes on.
  const typing = computed(() => source.value !== debouncedSource.value);

  return {
    matches: computed(() => (typing.value ? [] : (data.value?.matches ?? []))),
    hasSource: computed(() => !!source.value),
    isPending: computed(() => typing.value || isFetching.value),
    error,
    refetch,
  };
}
