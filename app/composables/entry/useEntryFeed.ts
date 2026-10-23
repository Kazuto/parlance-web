import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

/**
 * Entry keys for the list panel, loaded page by page as the list scrolls.
 *
 * Uses the lightweight `summary` listing (id, key, missing locales) with keyset
 * paging, so neither the payload nor the query cost grows with how far the list
 * has been scrolled. Full entries are loaded one at a time via `useEntryDetail`.
 */
export function useEntryFeed(perPage = 100) {
  const search = ref<string>();
  const scopeIds = ref<string[]>([]);
  const translationStatus = ref("");
  const targetLocaleIds = ref<string[]>([]);

  const params = computed(() => ({
    summary: true,
    pagination: { page: 1, perPage },
    filter: { search: search.value || undefined },
    scopeIds: [...scopeIds.value],
    translationStatus: translationStatus.value,
    targetLocaleIds: [...targetLocaleIds.value],
  }));

  const query = useInfiniteQuery({
    ...api.entries.feed.use(params),
    placeholderData: keepPreviousData,
  });

  const entries = computed<Entry[]>(
    () => query.data.value?.pages.flatMap((page) => page.entries ?? []) ?? [],
  );

  // Only the first page counts; later cursor pages skip the count query.
  const total = computed(
    () => query.data.value?.pages[0]?.pagination?.total ?? undefined,
  );

  return {
    ...query,
    entries,
    total,
    search,
    scopeIds,
    translationStatus,
    targetLocaleIds,
  };
}

/** The full entry (localizations and scopes) for the editor. */
export function useEntryDetail(id: Ref<string | undefined>) {
  const options = api.entries.get.use(computed(() => ({ id: id.value ?? "" })));

  return useQuery({
    ...options,
    enabled: computed(() => toValue(options.enabled) && !!id.value),
  });
}
