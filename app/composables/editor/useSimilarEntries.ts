import { useQuery } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { api } from "~/lib/api";

/**
 * Other entries whose default text is the same as or similar to the given one, and
 * how many have the same text. It asks once typing pauses, leaving out the entry
 * being edited; callers with the same text share one request.
 */
export function useSimilarEntries(
  text: MaybeRefOrGetter<string>,
  entryId: MaybeRefOrGetter<string>,
) {
  const trimmed = computed(() => toValue(text).trim());
  const debouncedText = refDebounced(trimmed, 400);

  const options = api.entries.similar.use({
    text: debouncedText,
    excludeEntryId: computed(() => toValue(entryId)),
    limit: 10,
  });

  const { data, isFetching, error, refetch } = useQuery({
    ...options,
    enabled: computed(
      () =>
        toValue(options.enabled) &&
        !!debouncedText.value &&
        trimmed.value === debouncedText.value,
    ),
    staleTime: 60 * 1000,
    retry: false,
  });

  // Twins of an older text no longer fit while typing goes on.
  const typing = computed(() => trimmed.value !== debouncedText.value);

  return {
    entries: computed(() => (typing.value ? [] : (data.value?.entries ?? []))),
    sameTextCount: computed(() =>
      typing.value || !trimmed.value ? 0 : (data.value?.sameTextCount ?? 0),
    ),
    hasText: computed(() => !!trimmed.value),
    isPending: computed(() => typing.value || isFetching.value),
    error,
    refetch,
  };
}
