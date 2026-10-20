import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export function useScopeOptions() {
  const pagination = ref({ page: 1, perPage: 100 });
  const collected = ref<
    Record<string, { label: string; value: string; color?: string }>
  >({});

  const { data, error, isFetching } = useQuery(
    api.scopes.list.use({ pagination }),
  );

  watch(
    data,
    (response) => {
      if (!response) return;
      for (const scope of response.scopes ?? []) {
        if (scope.id) {
          collected.value[scope.id] = {
            label: scope.name ?? scope.slug ?? scope.id,
            value: scope.id,
            color: scope.color ?? undefined,
          };
        }
      }
      if (pagination.value.page < (response.pagination?.totalPages ?? 1)) {
        pagination.value.page++;
      }
    },
    { immediate: true },
  );

  const options = computed(() =>
    Object.values(collected.value).toSorted((a, b) =>
      a.label.localeCompare(b.label),
    ),
  );

  return { options, error, isFetching };
}
