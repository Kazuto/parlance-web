import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { PaginationRequest } from "~/lib/api/schemas/CommonSchema";
import { api } from "~/lib/api";

export const useEntryStore = defineStore("entryStore", () => {
  const perPage = ref(10);
  const page = ref(1);

  const pagination = computed<PaginationRequest>(() => ({
    perPage: perPage.value,
    page: page.value,
  }));

  const entryListEndpoint = api.entries.list.use({ pagination });

  const list = useQuery({
    ...entryListEndpoint,
  });

  const queryClient = useQueryClient();
  const createEndpoint = api.entries.create.use();

  const create = useMutation({
    ...createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryListEndpoint.queryKey });
    },
  });

  const updateEndpoint = api.entries.update.use();

  const update = useMutation({
    ...updateEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryListEndpoint.queryKey });
    },
  });

  const deleteEndpoint = api.entries.delete.use();

  const destroy = useMutation({
    ...deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryListEndpoint.queryKey });
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
