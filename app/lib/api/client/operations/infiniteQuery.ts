import type { MaybeRefDeep } from "../utils/types";
import type { QueryFunctionContext } from "@tanstack/vue-query";
import type { KyInstance } from "ky";
import type { OperationValidationError } from "../utils/validation";
import type { BaseCreateOptions, MiddlewareFunction, RequestOptions } from ".";
import { computed, getCurrentInstance, toValue } from "vue";
import { Operation } from ".";

export type InfiniteQueryCreateOptions<Input, Output, PageParam> =
  BaseCreateOptions<Input, Output> & {
    /** Page param for the first page, e.g. an empty cursor. */
    initialPageParam: PageParam;
    /** Page param for the page after `lastPage`; `undefined` when it was the last. */
    getNextPageParam: (lastPage: Output) => PageParam | undefined;
    /** Request input for one page: the shared input plus that page's param. */
    withPageParam: (input: Input, pageParam: PageParam) => Input;
  };

/**
 * A paged list read with `useInfiniteQuery`. The endpoint owns the paging rules,
 * so callers only pass the shared input (filters) and spread `use()` into it.
 */
export class InfiniteQueryOperation<Input, Output, PageParam> extends Operation<
  Input,
  Output
> {
  constructor(
    kyInstance: KyInstance,
    middlewares: MiddlewareFunction[],
    resolver: (input: Input) => RequestOptions,
    onValidationError: ((error: OperationValidationError) => void) | undefined,
    private paging: InfiniteQueryCreateOptions<Input, Output, PageParam>,
  ) {
    super(
      kyInstance,
      middlewares,
      resolver,
      onValidationError,
      paging.input,
      paging.output,
      paging.responseTransformer,
      paging.onSuccess,
    );
  }

  static create(
    kyInstance: KyInstance,
    middlewares: MiddlewareFunction[],
    onValidationError?: (error: OperationValidationError) => void,
  ) {
    return <Input = unknown, Output = unknown, PageParam = unknown>(
      resolver: (input: NoInfer<Input>) => RequestOptions,
      options: InfiniteQueryCreateOptions<Input, Output, PageParam>,
    ) =>
      new InfiniteQueryOperation<
        NoInfer<Input>,
        NoInfer<Output>,
        NoInfer<PageParam>
      >(kyInstance, middlewares, resolver, onValidationError, options);
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
    const { initialPageParam, getNextPageParam, withPageParam } = this.paging;

    return {
      enabled,
      initialPageParam,
      getNextPageParam,
      queryFn: async ({
        queryKey,
        pageParam,
      }: QueryFunctionContext<
        readonly [string | undefined, unknown[], unknown],
        PageParam
      >) =>
        this.fetch(
          withPageParam(queryKey[2] as Input, pageParam as PageParam),
          beforeRequest,
          enabled,
          { context, key: queryKey },
        ),
      queryKey: [this.key, key, input as unknown] as const,
    };
  }
}
