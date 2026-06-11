import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useDefinitionStore = defineStore("definitionStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.definitions.list.getQueryKey();

  const create = useMutation({
    ...api.definitions.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useMutation({
    ...api.definitions.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    ...api.definitions.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    create,
    update,
    destroy,
  };
});
