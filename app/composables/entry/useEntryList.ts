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
  const scopeId = ref("");
  const translationStatus = ref("");
  const targetLocaleIds = ref<string[]>([]);

  const { data, isLoading, isPending, isFetching, error, refetch } = useQuery({
    ...api.entries.list.use({
      pagination,
      filter,
      scopeId,
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
    scopeId,
    translationStatus,
    targetLocaleIds,
  };
}
