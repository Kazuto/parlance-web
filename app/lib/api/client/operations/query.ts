import type { MaybeRefDeep } from "../utils/types";
import type { QueryFunctionContext } from "@tanstack/vue-query";
import type { KyInstance } from "ky";
import type { OperationValidationError } from "../utils/validation";
import type { BaseCreateOptions, MiddlewareFunction, RequestOptions } from ".";
import { computed, getCurrentInstance, toValue } from "vue";
import { Operation } from ".";

export class QueryOperation<Input, Output> extends Operation<Input, Output> {
  static create(
    kyInstance: KyInstance,
    middlewares: MiddlewareFunction[],
    onValidationError?: (error: OperationValidationError) => void,
  ) {
    return <Input = unknown, Output = unknown>(
      resolver: (input: NoInfer<Input>) => RequestOptions,
      options?: BaseCreateOptions<Input, Output>,
    ) =>
      new QueryOperation<NoInfer<Input>, NoInfer<Output>>(
        kyInstance,
        middlewares,
        resolver,
        onValidationError,
        options?.input,
        options?.output,
        options?.responseTransformer,
        options?.onSuccess,
      );
  }

  async query(input: Input): Promise<Output> {
    const { beforeRequest, enabled: middlewaresEnabled } =
      this.runMiddlewares();
    const enabled = computed(() =>
      middlewaresEnabled.every((enabled) => toValue(enabled)),
    );
    const context = getCurrentInstance();

    return this.fetch(input, beforeRequest, enabled, {
      context,
    });
  }

  getQueryKey(input?: Input) {
    const { key } = this.runMiddlewares();

    return input === undefined
      ? ([this.key, key] as const)
      : ([this.key, key, input] as const);
  }

  use(
    ...[input]: undefined extends Input
      ? [input?: MaybeRefDeep<Input>]
      : [input: MaybeRefDeep<Input>]
  ) {
    const {
      beforeRequest,
      enabled: middlewaresEnabled,
      key,
    } = this.runMiddlewares();
    const enabled = computed(() =>
      middlewaresEnabled.every((enabled) => toValue(enabled)),
    );
    const context = getCurrentInstance();

    return {
      enabled,
      queryFn: async ({
        queryKey,
      }: QueryFunctionContext<
        readonly [string | undefined, unknown[], unknown]
      >) =>
        this.fetch(queryKey[2], beforeRequest, enabled, {
          context,
          key: queryKey,
        }),
      queryKey: [this.key, key, input as unknown] as const,
    };
  }
}
