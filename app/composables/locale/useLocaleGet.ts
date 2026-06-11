import { useQuery } from "@tanstack/vue-query";
import type {
  FilterRequest,
  PaginationRequest,
} from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export function useLocaleGet({ id }: { id: string }) {
  const pagination = ref<PaginationRequest>({ perPage: 10, page: 1 });
  const filter = ref<FilterRequest>({
    search: undefined,
    sort: undefined,
    order: undefined,
    includeDeleted: false,
  });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...api.locales.get.use({ id }),
  });

  return {
    data,
    isLoading,
    isPending,
    error,
    refetch,
    pagination,
    filter,
  };
}
