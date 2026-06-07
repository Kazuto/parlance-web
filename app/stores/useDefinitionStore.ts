import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useDefinitionStore = defineStore("definitionStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const definitionListEndpoint = api.definitions.list.use({ pagination });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...definitionListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.definitions.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: definitionListEndpoint.queryKey,
      });
    },
  });

  const updateEndpoint = api.definitions.update.use();

  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: definitionListEndpoint.queryKey,
      });
    },
  });

  const deleteEndpoint = api.definitions.delete.use();

  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: definitionListEndpoint.queryKey,
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
