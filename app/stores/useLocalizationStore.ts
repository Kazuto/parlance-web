import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";

// The editors keep the translations they save, so nothing needs refetching.
export const useLocalizationStore = defineStore("localizationStore", () => {
  const create = useMutation(api.localizations.create.use());
  const update = useMutation(api.localizations.update.use());
  const destroy = useMutation(api.localizations.delete.use());
  const restore = useMutation(api.localizations.restore.use());

  return {
    create,
    update,
    destroy,
    restore,
  };
});
