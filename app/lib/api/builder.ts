import { isHTTPError } from "ky";
import { createApiClient } from "./client";

const baseClient = createApiClient({
  baseUrl: "",
  hooks: {
    // Use the server's message ("[ERROR_CODE] message") instead of ky's
    // "Request failed with status code …", so useErrorHelper can localize it.
    beforeError: [
      ({ error }) => {
        if (
          isHTTPError(error) &&
          typeof error.data === "object" &&
          error.data !== null &&
          "message" in error.data
        ) {
          error.message = String(error.data.message);
        }

        return error;
      },
    ],
  },
  onValidationError: (error) => {
    console.error(error);
  },
});

export const publicEndpoint = baseClient.use(() => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  return {
    beforeRequest: (options) => {
      const url = options.url?.startsWith("/")
        ? `${baseUrl}${options.url}`
        : options.url;

      return {
        ...options,
        url,
      };
    },
  };
});

export const authedEndpoint = publicEndpoint.use(() => {
  const authStore = useAuthStore();

  return {
    beforeRequest: (options) => ({
      ...options,
      headers: {
        ...options.headers,
        ...(authStore.token
          ? { Authorization: `Bearer ${authStore.token}` }
          : {}),
      },
    }),
    enabled: computed(() => authStore.isLoggedIn),
  };
});
