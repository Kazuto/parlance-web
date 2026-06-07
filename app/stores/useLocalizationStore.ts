import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useLocalizationStore = defineStore("localizationStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const localizationListEndpoint = api.localizations.list.use({ pagination });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...localizationListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.localizations.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: localizationListEndpoint.queryKey,
      });
    },
  });

  const updateEndpoint = api.localizations.update.use();

  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: localizationListEndpoint.queryKey,
      });
    },
  });

  const deleteEndpoint = api.localizations.delete.use();

  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: localizationListEndpoint.queryKey,
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
