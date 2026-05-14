import type { ComputedRef, Ref } from "vue";

export type MaybeRefDeep<T> = MaybeRef<
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  T extends Function
    ? T
    : T extends object
      ? {
          [Property in keyof T]: MaybeRefDeep<T[Property]>;
        }
      : T
>;

type MaybeRef<T> = ComputedRef<T> | Ref<T> | T;
