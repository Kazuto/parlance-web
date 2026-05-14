import type { Options as KyOptions, KyInstance, ResponsePromise } from "ky";
import type { ZodType } from "zod";
import {
  type OperationValidationError,
  OperationValidationType,
  validate,
} from "../utils/validation";
import qs from "qs";
import {
  type ComponentInternalInstance,
  type ComputedRef,
  hasInjectionContext,
  type MaybeRefOrGetter,
  withCtx,
} from "vue";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOperation = Operation<any, any, any>;

export type BaseCreateOptions<Input, Output> = {
  input?: ZodType<Input>;
  onSuccess?: (data: { input: Input; output: Output }) => void;
  output?: ZodType<Output>;
  responseTransformer?: (response: ResponsePromise) => Promise<unknown>;
};

export type MiddlewareFunction = () => MiddlewareResult;

export type MiddlewareResult = {
  beforeRequest?: BeforeRequest;
  enabled?: MaybeRefOrGetter<boolean>;
  key?: unknown;
};

export type RequestOptions = Omit<KyOptions, "searchParams"> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchParams?: Record<string, any>;
  url: string;
};

type BeforeRequest = (
  options: RequestOptions,
  context: Context,
) => RequestOptions;

type Context = {
  context: ComponentInternalInstance | null;
  key?: readonly unknown[];
};

export abstract class Operation<
  Input,
  Output,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ExtraParameters extends any[] = [],
> {
  /** For types only! */
  public inputType!: Input;

  /** For types only! */
  public outputType!: Output;

  constructor(
    private kyInstance: KyInstance,
    private middlewares: MiddlewareFunction[],
    private resolver: (
      input: Input,
      ...arguments_: ExtraParameters
    ) => RequestOptions,
    private onValidationError?: (error: OperationValidationError) => void,
    private inputSchema?: ZodType<Input>,
    private outputSchema?: ZodType<Output>,
    private responseTransformer: (
      response: ResponsePromise,
    ) => Promise<unknown> = (response) => response.json(),
    private onSuccess?: (data: { input: Input; output: Output }) => void,
    public key?: string,
  ) {}

  protected async fetch(
    input: unknown,
    beforeRequest: BeforeRequest[],
    enabled: ComputedRef<boolean>,
    context: Context,
    ...arguments_: ExtraParameters
  ) {
    if (!enabled.value) {
      throw new Error(`Not enabled. Key: ${JSON.stringify(context.key)}`);
    }

    const parsedInput = validate(
      this.inputSchema,
      input,
      OperationValidationType.INPUT,
      this,
      this.onValidationError,
    );

    let requestOptions = this.resolver(parsedInput, ...arguments_);

    for (const beforeRequest_ of beforeRequest) {
      requestOptions = beforeRequest_(requestOptions, context);
    }

    const { url, ...kyOptions } = requestOptions;
    const output = await this.responseTransformer(
      this.kyInstance<Output>(url, {
        ...kyOptions,
        searchParams: kyOptions.searchParams
          ? qs.stringify(kyOptions.searchParams, {
              arrayFormat: "comma",
              skipNulls: true,
            })
          : undefined,
      }),
    );

    const parsedOutput = validate(
      this.outputSchema,
      output,
      OperationValidationType.OUTPUT,
      this,
      this.onValidationError,
    );

    try {
      withCtx(
        () =>
          this.onSuccess?.({
            input: parsedInput,
            output: parsedOutput,
          }),
        context.context,
      )();
    } catch {
      // Ignore for now
      // TODO: Add error callback
    }

    return parsedOutput;
  }

  protected runMiddlewares() {
    if (!hasInjectionContext()) {
      throw new Error("Middlewares outside of injection context not supported");
    }

    const middlewareResults = this.middlewares.map((middleware) =>
      middleware(),
    );

    return {
      beforeRequest: middlewareResults
        .map(({ beforeRequest }) => beforeRequest)
        .filter((beforeRequest) => beforeRequest !== undefined),
      enabled: middlewareResults
        .map(({ enabled }) => enabled)
        .filter((enabled) => enabled !== undefined),
      key: middlewareResults
        .map(({ key }) => key)
        .filter((key) => key !== undefined),
    };
  }
}
