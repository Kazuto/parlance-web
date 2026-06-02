import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useRoleStore = defineStore("roleStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const roleListEndpoint = api.roles.list.use({ pagination });

  const list = useQuery({
    ...roleListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.roles.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleListEndpoint.queryKey });
    },
  });

  const updateEndpoint = api.roles.update.use();

  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleListEndpoint.queryKey });
    },
  });

  const deleteEndpoint = api.roles.delete.use();

  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleListEndpoint.queryKey });
    },
  });

  return {
    list,
    create,
    update,
    destroy,
    perPage,
    page,
  };
});
