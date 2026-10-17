import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import type {
  FilterRequest,
  PaginationRequest,
} from "~/lib/api/schemas/parlance/v1/CommonSchema";
import { api } from "~/lib/api";

export function useEntryList(perPage = 10) {
  const pagination = ref<PaginationRequest>({ perPage, page: 1 });
  const filter = ref<FilterRequest>({
    search: undefined,
    sort: undefined,
    order: undefined,
    includeDeleted: false,
  });
  const scopeIds = ref<string[]>([]);
  const translationStatus = ref("");
  const targetLocaleIds = ref<string[]>([]);

  const { data, isLoading, isPending, isFetching, error, refetch } = useQuery({
    ...api.entries.list.use({
      pagination,
      filter,
      scopeIds,
      translationStatus,
      targetLocaleIds,
    }),
    placeholderData: keepPreviousData,
  });

  return {
    data,
    isLoading,
    isPending,
    isFetching,
    error,
    refetch,
    pagination,
    filter,
    scopeIds,
    translationStatus,
    targetLocaleIds,
  };
}
