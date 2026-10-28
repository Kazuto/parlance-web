import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useUserStore = defineStore("userStore", () => {
  const queryClient = useQueryClient();
  // Query keys need the setup context, so they are taken here.
  const queryKey = api.users.list.getQueryKey();
  const registrationKey = api.users.registrationSettings.getQueryKey();

  const create = useMutation({
    ...api.users.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useMutation({
    ...api.users.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    ...api.users.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const restore = useMutation({
    ...api.users.restore.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Whether people may sign up on their own.
  const updateRegistrationSettings = useMutation({
    ...api.users.updateRegistrationSettings.use(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: registrationKey }),
  });

  return {
    create,
    update,
    destroy,
    restore,
    updateRegistrationSettings,
  };
});
