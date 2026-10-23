import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useTaskStore = defineStore("taskStore", () => {
  const queryClient = useQueryClient();
  // A task's card shows its last run, so run changes refresh the list too. Query
  // keys need the setup context, so they are taken here.
  const queryKeys = [
    api.tasks.list,
    api.tasks.runs,
    api.tasks.getRun,
    api.tasks.settings,
  ].map((endpoint) => endpoint.getQueryKey());
  const invalidate = () =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  const create = useMutation({
    ...api.tasks.create.use(),
    onSuccess: invalidate,
  });
  const update = useMutation({
    ...api.tasks.update.use(),
    onSuccess: invalidate,
  });
  const destroy = useMutation({
    ...api.tasks.delete.use(),
    onSuccess: invalidate,
  });
  const run = useMutation({ ...api.tasks.run.use(), onSuccess: invalidate });
  const cancelRun = useMutation({
    ...api.tasks.cancelRun.use(),
    onSuccess: invalidate,
  });
  const checkAccess = useMutation(api.tasks.checkAccess.use());
  const updateSettings = useMutation({
    ...api.tasks.updateSettings.use(),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    destroy,
    run,
    cancelRun,
    checkAccess,
    updateSettings,
  };
});
