import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useLocaleStore = defineStore("localeStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const localeListEndpoint = api.locale.list.use({ pagination });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...localeListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.locale.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: localeListEndpoint.queryKey });
    },
  });

  const updateEndpoint = api.locale.update.use();

  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: localeListEndpoint.queryKey });
    },
  });

  const deleteEndpoint = api.locale.delete.use();

  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: localeListEndpoint.queryKey });
    },
  });

  return {
    data,
    isLoading,
    isPending,
    error,
    refetch,
    create,
    update,
    destroy,
    perPage,
    page,
  };
});
