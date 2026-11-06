// Pages register their dirty state; the client plugin guards all route changes.
export function useUnsavedChanges() {
  const sources = useState<Record<string, { count: number; saving: boolean }>>(
    "unsaved-changes",
    () => ({}),
  );

  const count = computed(() =>
    Object.values(sources.value).reduce(
      (total, source) => total + source.count,
      0,
    ),
  );

  const saving = computed(() =>
    Object.values(sources.value).some((source) => source.saving),
  );

  return { sources, count, saving };
}

export function registerUnsavedChanges(
  id: string,
  count: Ref<number>,
  saving: Ref<boolean>,
) {
  const state = useUnsavedChanges();

  watch(
    [count, saving],
    ([count, saving]) => {
      state.sources.value[id] = { count, saving };
    },
    { immediate: true, flush: "sync" },
  );

  onScopeDispose(() => {
    Reflect.deleteProperty(state.sources.value, id);
  });
}
