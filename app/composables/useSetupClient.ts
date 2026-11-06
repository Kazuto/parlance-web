import { api } from "~/lib/api";
import type { InitializeRequest } from "~/lib/api";
import type { QueryFunctionContext } from "@tanstack/vue-query";
import { useQueryClient } from "@tanstack/vue-query";

export function useSetupClient() {
  const { setup } = api;
  const queryClient = useQueryClient();

  // Capture the mutation/query functions during setup when we have injection context
  const { queryFn: checkStatusFn, queryKey: checkStatusKey } =
    setup.getStatus.use({});
  const { mutationFn: initializeFn } = setup.initialize.use();

  return {
    async checkStatus() {
      const context: QueryFunctionContext<
        readonly [string | undefined, unknown[], unknown]
      > = {
        queryKey: checkStatusKey,
        meta: undefined,
        signal: new AbortController().signal,
        client: queryClient,
      };
      const result = await checkStatusFn(context);

      return result.needsSetup;
    },

    async initialize(data: InitializeRequest) {
      const result = await initializeFn(data);

      return result;
    },
  };
}
