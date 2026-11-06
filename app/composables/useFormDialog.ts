/**
 * The shared part of a create or edit dialog: `reset` fills the form each time the
 * dialog opens, and `submit` runs an action while the dialog stays open. The
 * action returns false to stay open, e.g. after setting `error` for invalid
 * input; a failure is toasted and shown as `error` too.
 */
export function useFormDialog(options: {
  open: () => boolean;
  isPending: () => boolean;
  reset: () => void;
  close: () => void;
}) {
  const { showError, getErrorMessage } = useErrorHelper();
  const error = ref<string>();
  const isPending = computed(options.isPending);

  watch(
    options.open,
    (open) => {
      if (!open) return;
      options.reset();
      error.value = undefined;
    },
    { immediate: true },
  );

  async function submit(action: () => Promise<unknown>) {
    if (isPending.value) return;
    error.value = undefined;

    try {
      if ((await action()) === false) return;
    } catch (cause) {
      showError(cause);
      error.value = getErrorMessage(cause);

      return;
    }

    options.close();
  }

  function cancel() {
    if (!isPending.value) options.close();
  }

  return { error, isPending, submit, cancel };
}
