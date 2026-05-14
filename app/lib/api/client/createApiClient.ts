import ky, { type Options as KyOptions } from "ky";
import type { OperationValidationError } from "./utils/validation";
import type { MiddlewareFunction } from "./operations";
import { MutateOperation } from "./operations/mutate";
import { QueryOperation } from "./operations/query";

export type ApiClient = {
  mutate: ReturnType<(typeof MutateOperation)["create"]>;
  query: ReturnType<(typeof QueryOperation)["create"]>;
  use: (middlewareFunction: MiddlewareFunction) => ApiClient;
};

export function createApiClient(
  options: KyOptions & {
    onValidationError?: (error: OperationValidationError) => void;
  },
  middlewares: MiddlewareFunction[] = [],
): ApiClient {
  const { onValidationError, ...kyOptions } = options;
  const kyInstance = ky.extend({ retry: 0, ...kyOptions });

  return {
    mutate: MutateOperation.create(kyInstance, middlewares, onValidationError),
    query: QueryOperation.create(kyInstance, middlewares, onValidationError),
    use: (
      middlewareFunction: MiddlewareFunction,
    ): ReturnType<typeof createApiClient> =>
      createApiClient(options, [...middlewares, middlewareFunction]),
  };
}
