import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useWebhookStore = defineStore("webhookStore", () => {
  const queryClient = useQueryClient();
  // A webhook's card shows its last delivery, so tests and redeliveries refresh the
  // list too. Query keys need the setup context, so they are taken here.
  const queryKeys = [
    api.webhooks.list,
    api.webhooks.deliveries,
    api.webhooks.getDelivery,
  ].map((endpoint) => endpoint.getQueryKey());
  const invalidate = () =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  const create = useMutation({
    ...api.webhooks.create.use(),
    onSuccess: invalidate,
  });
  const update = useMutation({
    ...api.webhooks.update.use(),
    onSuccess: invalidate,
  });
  const destroy = useMutation({
    ...api.webhooks.delete.use(),
    onSuccess: invalidate,
  });
  const test = useMutation({
    ...api.webhooks.test.use(),
    onSuccess: invalidate,
  });
  const redeliver = useMutation({
    ...api.webhooks.redeliver.use(),
    onSuccess: invalidate,
  });

  return { create, update, destroy, test, redeliver };
});
