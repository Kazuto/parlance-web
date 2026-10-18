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
  function extractErrorCode(error: Error | string): string | null {
    const message = typeof error === "string" ? error : error.message;
    const match = message.match(/^\[([A-Z_]+)\]/);
    return match?.[1] ?? null;
  }

  /**
   * Gets a localized error message for an error code
   */
  function getErrorMessage(error: Error | string): string {
    const code = extractErrorCode(error);

    if (!code) {
      // Fallback to the original message if no code is found
      return typeof error === "string" ? error : error.message;
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
    error: Error | string,
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

/**
 * Common error codes
 */
export const ErrorCodes = {
  // General errors
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  FAILED_PRECONDITION: "FAILED_PRECONDITION",

  // Locale errors
  LOCALE_NOT_FOUND: "LOCALE_NOT_FOUND",
  LOCALE_ALREADY_EXISTS: "LOCALE_ALREADY_EXISTS",
  LOCALE_DEFAULT_DELETE: "LOCALE_DEFAULT_DELETE",
  LOCALE_DEFAULT_DESTROY: "LOCALE_DEFAULT_DESTROY",
  LOCALE_MUST_BE_SOFT_DELETED: "LOCALE_MUST_BE_SOFT_DELETED",
  LOCALE_INSUFFICIENT_ACCESS: "LOCALE_INSUFFICIENT_ACCESS",

  // User errors
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  // Setup errors
  SETUP_ALREADY_COMPLETED: "SETUP_ALREADY_COMPLETED",
  SETUP_FAILED: "SETUP_FAILED",

  // Entry errors
  ENTRY_NOT_FOUND: "ENTRY_NOT_FOUND",
  ENTRY_ALREADY_EXISTS: "ENTRY_ALREADY_EXISTS",

  // Role errors
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  ROLE_ALREADY_EXISTS: "ROLE_ALREADY_EXISTS",

  // Permission errors
  PERMISSION_NOT_FOUND: "PERMISSION_NOT_FOUND",

  // Terminology errors
  TERMINOLOGY_NOT_FOUND: "TERMINOLOGY_NOT_FOUND",
  TERMINOLOGY_ALREADY_EXISTS: "TERMINOLOGY_ALREADY_EXISTS",

  // Definition errors
  DEFINITION_NOT_FOUND: "DEFINITION_NOT_FOUND",
  DEFINITION_ALREADY_EXISTS: "DEFINITION_ALREADY_EXISTS",

  // Scope errors
  SCOPE_NOT_FOUND: "SCOPE_NOT_FOUND",
  SCOPE_ALREADY_EXISTS: "SCOPE_ALREADY_EXISTS",

  // Localization errors
  LOCALIZATION_NOT_FOUND: "LOCALIZATION_NOT_FOUND",
} as const;
