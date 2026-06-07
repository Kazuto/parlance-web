import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useUserStore = defineStore("userStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const userListEndpoint = api.users.list.use({ pagination });
  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...userListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.users.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userListEndpoint.queryKey });
    },
  });

  const updateEndpoint = api.users.update.use();
  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userListEndpoint.queryKey });
    },
  });

  const deleteEndpoint = api.users.delete.use();
  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userListEndpoint.queryKey });
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
