import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

/**
 * Terminology items with enhanced filtering and search
 */
export function useTerminologyFeed(perPage = 100) {
  const search = ref<string>();
  const targetLocaleIds = ref<string[]>([]);
  const pagination = ref({ page: 1, perPage });
  const filter = ref({
    search: undefined as string | undefined,
    sort: undefined,
    order: undefined,
    includeDeleted: false,
  });

  const params = computed(() => ({
    pagination: pagination.value,
    filter: { ...filter.value, search: search.value || undefined },
    targetLocaleIds: [...targetLocaleIds.value],
  }));

  const query = useQuery({
    ...api.terminologies.list.use(params),
    placeholderData: keepPreviousData,
  });

  const terminologies = computed<Terminology[]>(
    () => query.data.value?.terminologies ?? [],
  );
  const total = computed(
    () => query.data.value?.pagination?.total ?? undefined,
  );

  return {
    ...query,
    terminologies,
    total,
    search,
    targetLocaleIds,
    pagination,
    filter,
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
