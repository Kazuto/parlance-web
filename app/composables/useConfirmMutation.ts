type Mutation<Variables> = {
  isPending: boolean;
  mutateAsync: (variables: Variables) => Promise<unknown>;
};

/**
 * Runs a confirm dialog's mutation, e.g. a store's destroy: toasts the outcome
 * and closes the dialog once it succeeded. The dialog stays open while it runs.
 */
export function useConfirmMutation<Variables>(
  mutation: () => Mutation<Variables>,
  close: () => void,
) {
  const { showSuccess, showError } = useErrorHelper();
  const isPending = computed(() => mutation().isPending);

  /** Resolves to whether the mutation succeeded. */
  async function run(variables: Variables, successMessage: string) {
    if (isPending.value) return false;

    try {
      await mutation().mutateAsync(variables);
    } catch (error) {
      showError(error);

      return false;
    }

    showSuccess(successMessage);
    close();

    return true;
  }

  function cancel() {
    if (!isPending.value) close();
  }

  return { isPending, run, cancel };
}
