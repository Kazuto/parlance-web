import type { HeaderAction, PageOptions } from "@thkzt/eunoia";

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

  // The header's actions can be run from the command palette too, under the page's
  // title. Pages only add the actions the user may take.
  useCommands(() => {
    const { title, primaryAction, actions, secondaryActions } =
      toValue(pageOptions);

    return [primaryAction, ...(actions ?? []), ...(secondaryActions ?? [])]
      .filter((action): action is HeaderAction => !!action)
      .map((action, index) => ({
        label: action.content,
        value: `header:${index}`,
        group: title,
        icon: action.icon,
        disabled: action.disabled,
        run: () => action.onClick?.(),
      }));
  });
}
