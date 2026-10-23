import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

/** Terminologies for the list panel, loaded page by page as the list scrolls. */
export function useTerminologyFeed(perPage = 100) {
  const search = ref<string>();
  const targetLocaleIds = ref<string[]>([]);

  const params = computed(() => ({
    pagination: { page: 1, perPage },
    filter: { search: search.value || undefined },
    targetLocaleIds: [...targetLocaleIds.value],
  }));

  const query = useInfiniteQuery({
    ...api.terminologies.feed.use(params),
    placeholderData: keepPreviousData,
  });

  const terminologies = computed<Terminology[]>(
    () =>
      query.data.value?.pages.flatMap((page) => page.terminologies ?? []) ?? [],
  );
  const total = computed(
    () => query.data.value?.pages[0]?.pagination?.total ?? undefined,
  );

  return {
    ...query,
    terminologies,
    total,
    search,
    targetLocaleIds,
  };
}

/** The full terminology (definitions) for the editor. */
export function useTerminologyDetail(id: Ref<string | undefined>) {
  const options = api.terminologies.get.use(
    computed(() => ({ id: id.value ?? "" })),
  );

  return useQuery({
    ...options,
    enabled: computed(() => toValue(options.enabled) && !!id.value),
  });
}
