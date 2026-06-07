import { useQuery } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const usepermissionStore = defineStore("permissionStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const permissionListEndpoint = api.permissions.list.use({ pagination });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...permissionListEndpoint,
  });

  return {
    data,
    isLoading,
    isPending,
    error,
    refetch,
    perPage,
    page,
  };
});
