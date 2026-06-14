import type { PageOptions } from "@thkzt/eunoia";

export const PAGE_OPTIONS_KEY = Symbol("pageOptions");

export function usePageProvider() {
  const options = ref<PageOptions>({
    title: "Placeholder. Please set a title in the page options.",
  });

  provide(PAGE_OPTIONS_KEY, options);

  return options;
}

export function usePage(pageOptions: MaybeRefOrGetter<PageOptions>) {
  const options = inject<Ref<PageOptions>>(PAGE_OPTIONS_KEY);

  watchEffect(() => {
    if (options) options.value = toValue(pageOptions);
  });
}
