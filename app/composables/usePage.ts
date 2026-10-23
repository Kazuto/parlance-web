import type { PageOptions } from "@thkzt/eunoia";

export type AppPageOptions = PageOptions & { layout?: "workspace" };

export const PAGE_OPTIONS_KEY = Symbol("pageOptions");

export function usePageProvider() {
  const { t } = useI18n();
  const options = ref<AppPageOptions>({
    title: t("app.pagePlaceholder"),
  });

  provide(PAGE_OPTIONS_KEY, options);

  return options;
}

export function usePage(pageOptions: MaybeRefOrGetter<AppPageOptions>) {
  const options = inject<Ref<AppPageOptions>>(PAGE_OPTIONS_KEY);

  watchEffect(() => {
    if (options) options.value = toValue(pageOptions);
  });
}
