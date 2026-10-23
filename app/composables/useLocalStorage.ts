import {
  useLocalStorage as useVueUseLocalStorage,
  type RemovableRef,
  type UseStorageOptions,
} from "@vueuse/core";
import type { MaybeRefOrGetter } from "vue";

const KEY_PREFIX = "parlance-";

/**
 * A reactive localStorage value whose key is prefixed with the app's name, so
 * `useLocalStorage("token", …)` reads and writes `parlance-token`.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: MaybeRefOrGetter<T>,
  options?: UseStorageOptions<T>,
): RemovableRef<T> {
  return useVueUseLocalStorage<T>(`${KEY_PREFIX}${key}`, initialValue, options);
}
