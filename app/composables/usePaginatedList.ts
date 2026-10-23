import { useQuery } from "@tanstack/vue-query";
import type { QueryOperation } from "~/lib/api/client/operations/query";
import type {
  FilterRequest,
  PaginationRequest,
  PaginationResponse,
} from "~/lib/api/schemas/parlance/v1/CommonSchema";

type ListRequest = {
  pagination?: PaginationRequest | null;
  filter?: FilterRequest | null;
};

/**
 * One page of a list endpoint. The returned pagination and filter refs drive the
 * query, e.g. from a table's pager and search box.
 */
export function usePaginatedList<Input extends ListRequest, Output>(
  endpoint: QueryOperation<Input, Output>,
  { perPage = 20, includeDeleted = false } = {},
) {
  const pagination = ref<PaginationRequest>({ page: 1, perPage });
  const filter = ref<FilterRequest>({ includeDeleted });

  const query = useQuery(endpoint.use({ pagination, filter } as never));

  return { ...query, pagination, filter };
}

// The server caps pages at 100 rows.
const ALL_PAGES_PER_PAGE = 100;

/**
 * Every row of a list endpoint, loaded page by page in one query, e.g. for
 * select options. Its key extends the endpoint's, so invalidating the list
 * refreshes it too.
 */
export function useAllPages<
  Input extends ListRequest,
  Output extends { pagination?: PaginationResponse | null },
  Item,
>(
  endpoint: QueryOperation<Input, Output>,
  pick: (output: Output) => Item[] | null | undefined,
) {
  // Built during setup, which the API client needs; the query key carries the input.
  const options = endpoint.use({} as never);
  const [operation, middlewares] = options.queryKey;

  const query = useQuery({
    enabled: options.enabled,
    queryKey: [operation, middlewares, { allPages: true }] as const,
    queryFn: async () => {
      const items: Item[] = [];

      for (let page = 1, pages = 1; page <= pages; page++) {
        const input = { pagination: { page, perPage: ALL_PAGES_PER_PAGE } };
        const output = (await options.queryFn({
          queryKey: [operation, middlewares, input],
        } as never)) as Output;

        items.push(...(pick(output) ?? []));
        pages = output.pagination?.totalPages ?? 1;
      }

      return items;
    },
  });

  const items = computed(() => query.data.value ?? []);

  return { ...query, items };
}
