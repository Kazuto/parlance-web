function messageOf(error: unknown): string | undefined {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  return undefined;
}

/**
 * Composable for handling API errors with localized messages and toast notifications
 */
export function useErrorHelper() {
  const { t } = useI18n();
  const { add: addToast } = useToast();

  /**
   * Extracts the error code from a Connect error message
   * Error format: "[ERROR_CODE] message"
   */
  function extractErrorCode(error: unknown): string | null {
    const match = messageOf(error)?.match(/^\[([A-Z_]+)\]/);

    return match?.[1] ?? null;
  }

  /**
   * Gets a localized error message for an error code
   */
  function getErrorMessage(error: unknown): string {
    const code = extractErrorCode(error);

    if (!code) {
      // Fallback to the original message if no code is found
      return messageOf(error) ?? t("errors.unknown");
    }

    // Map error codes to i18n keys
    const errorKey = `errors.${code.toLowerCase()}`;

    // Try to get the translated message
    const translated = t(errorKey);

    // If translation not found, return a generic error
    if (translated === errorKey) {
      return t("errors.unknown");
    }

    return translated;
  }

  /**
   * Shows an error toast with localized message
   */
  function showError(
    error: unknown,
    options?: {
      dismissible?: boolean;
      persistent?: boolean;
      duration?: number;
    },
  ) {
    const message = getErrorMessage(error);

    addToast(message, {
      variant: "danger",
      dismissible: options?.dismissible ?? true,
      persistent: options?.persistent ?? false,
      duration: options?.duration,
    });
  }

  /**
   * Shows a success toast
   */
  function showSuccess(
    message: string,
    options?: {
      dismissible?: boolean;
      persistent?: boolean;
      duration?: number;
    },
  ) {
    addToast(message, {
      variant: "success",
      dismissible: options?.dismissible ?? true,
      persistent: options?.persistent ?? false,
      duration: options?.duration,
    });
  }

  return {
    extractErrorCode,
    getErrorMessage,
    showError,
    showSuccess,
  };
}
