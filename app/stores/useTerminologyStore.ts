import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useTerminologyStore = defineStore("terminologyStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const terminologyListEndpoint = api.terminologies.list.use({ pagination });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...terminologyListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.terminologies.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: terminologyListEndpoint.queryKey,
      });
    },
  });

  const updateEndpoint = api.terminologies.update.use();

  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: terminologyListEndpoint.queryKey,
      });
    },
  });

  const deleteEndpoint = api.terminologies.delete.use();

  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: terminologyListEndpoint.queryKey,
      });
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
