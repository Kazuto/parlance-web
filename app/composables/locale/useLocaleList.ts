import { useQuery } from "@tanstack/vue-query";
import type {
  FilterRequest,
  PaginationRequest,
} from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export function useLocaleList() {
  const pagination = ref<PaginationRequest>({ perPage: 10, page: 1 });
  const filter = ref<FilterRequest>({
    search: undefined,
    sort: undefined,
    order: undefined,
    includeDeleted: false,
  });

  const { data, isLoading, isPending, isFetching, error, refetch } = useQuery({
    ...api.locales.list.use({ pagination, filter }),
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
  };
}
