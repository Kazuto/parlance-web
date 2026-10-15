import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export function usePermissionOptions() {
  const pagination = ref({ page: 1, perPage: 100 });
  const collected = ref<Record<string, { label: string; value: string }>>({});
  const { data, error, isFetching } = useQuery(
    api.permissions.list.use({ pagination }),
  );
  watch(
    data,
    (response) => {
      if (!response) return;
      for (const permission of response.permissions ?? []) {
        if (permission.id)
          collected.value[permission.id] = {
            label: permission.name ?? permission.id,
            value: permission.id,
          };
      }
      if (pagination.value.page < (response.pagination?.totalPages ?? 1))
        pagination.value.page++;
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
