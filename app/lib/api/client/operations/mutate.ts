import type { OperationValidationError } from "../utils/validation";
import type { KyInstance } from "ky";
import { computed, getCurrentInstance, toValue } from "vue";
import {
  type BaseCreateOptions,
  Operation,
  type MiddlewareFunction,
  type RequestOptions,
} from ".";

export class MutateOperation<Input, Output> extends Operation<Input, Output> {
  static create(
    kyInstance: KyInstance,
    middlewares: MiddlewareFunction[],
    onValidationError?: (error: OperationValidationError) => void,
  ) {
    return <Input = unknown, Output = unknown>(
      resolver: (input: Input) => RequestOptions,
      options?: BaseCreateOptions<Input, Output>,
    ) =>
      new MutateOperation<Input, Output>(
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

  async mutate(
    ...[input]: undefined extends Input ? [input?: Input] : [input: Input]
  ): Promise<Output> {
    const { beforeRequest, enabled: middlewaresEnabled } =
      this.runMiddlewares();
    const enabled = computed(() =>
      middlewaresEnabled.every((enabled) => toValue(enabled)),
    );
    const context = getCurrentInstance();

    return this.fetch(input, beforeRequest, enabled, { context });
  }

  use() {
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
      mutationFn: async (
        ...[input]: undefined extends Input ? [input?: Input] : [input: Input]
      ) => this.fetch(input, beforeRequest, enabled, { context }),
      mutationKey: [this.key, key] as const,
    };
  }
}
