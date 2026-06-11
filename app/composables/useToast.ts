export function useToast() {
  type ToastOptions = {
    variant?: "info" | "success" | "warning" | "danger";
    dismissible?: boolean;
    persistent?: boolean;
    duration?: number;
  };

  type ToastStack = {
    add: ({
      message,
      variant,
      dismissible,
      persistent,
      duration,
    }: {
      message: string;
    } & ToastOptions) => void;
    dismiss: (id: number) => void;
    dismissAll: () => void;
  };

  const toastStack = inject<Ref<ToastStack>>("toastStack");

  function add(message: string, options: ToastOptions) {
    toastStack?.value?.add({
      message: message,
      variant: options.variant,
      dismissible: options.dismissible,
      persistent: options.persistent,
      duration: options.duration,
    });
  }

  function dismiss(id: number) {
    toastStack?.value?.dismiss(id);
  }

  return { add, dismiss };
}
