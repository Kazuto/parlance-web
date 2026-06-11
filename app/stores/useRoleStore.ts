import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useRoleStore = defineStore("roleStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.roles.list.getQueryKey();

  const create = useMutation({
    ...api.roles.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useMutation({
    ...api.roles.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    ...api.roles.delete.use(),
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
