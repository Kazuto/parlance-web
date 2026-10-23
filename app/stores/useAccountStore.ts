import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

// The signed-in user's own account, which needs no permission to change.
export const useAccountStore = defineStore("accountStore", () => {
  const queryClient = useQueryClient();
  const authStore = useAuthStore();
  // Lists show the user's name and avatar too.
  const queryKeys = [
    api.users.list.getQueryKey(),
    api.auth.getCurrentUser.getQueryKey(),
  ];

  const update = useMutation({
    ...api.account.update.use(),
    onSuccess: (data) => {
      if (data.user) authStore.setUser(data.user);

      return Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
  // Accounts that had no password have one now, which the current user tells.
  const changePassword = useMutation({
    ...api.account.changePassword.use(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: api.auth.getCurrentUser.getQueryKey(),
      }),
  });

  return { update, changePassword };
});
