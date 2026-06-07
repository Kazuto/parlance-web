import { useMutation } from "@tanstack/vue-query";
import { useLocalStorage, useNow } from "@vueuse/core";
import { jwtDecode as _jwtDecode } from "jwt-decode";
import type { User } from "~/lib/api/schemas/UserSchema";
import { api } from "~/lib/api";

export type JWTPayload = {
  user_id: string;
  email: string;
  exp: number; // Expiration time (seconds since epoch)
  nbf: number; // Not before
  iat: number; // Issued at
};

const oneMinute = 60 * 1000;

function jwtDecode<T>(token: Ref<string | undefined>): T | undefined {
  if (!token.value) {
    return undefined;
  }

  try {
    return _jwtDecode<T>(token.value);
  } catch {
    return undefined;
  }
}

export const useAuthStore = defineStore("authStore", () => {
  const timer = ref<ReturnType<typeof setTimeout>>();
  const isRefreshing = ref(false);

  const token = useLocalStorage<string | undefined>(
    "parlance-token",
    undefined,
  );

  const refreshToken = useLocalStorage<string | undefined>(
    "parlance-refreshToken",
    undefined,
  );

  const user = useLocalStorage<User | undefined>("parlance-user", undefined, {
    serializer: {
      read: (v: string) => (v ? JSON.parse(v) : undefined),
      write: (v: User | undefined) => JSON.stringify(v),
    },
  });

  const now = useNow({ interval: oneMinute });

  const tokenPayload = computed<JWTPayload | undefined>(() =>
    jwtDecode<JWTPayload>(token),
  );

  const refreshTokenPayload = computed<JWTPayload | undefined>(() =>
    jwtDecode<JWTPayload>(refreshToken),
  );

  const isRefreshTokenExpired = computed<boolean>(() => {
    if (refreshTokenPayload.value === undefined) {
      return true;
    }

    return refreshTokenPayload.value.exp * 1000 - now.value.getTime() < 0;
  });

  const isTokenExpired = computed<boolean>(() => {
    if (tokenPayload.value?.exp === undefined) {
      return true;
    }

    return tokenPayload.value.exp * 1000 - now.value.getTime() - oneMinute < 0;
  });

  const isLoggedIn = computed<boolean>(
    () => token.value !== undefined && !isTokenExpired.value,
  );

  const isLoggedOut = computed<boolean>(
    () => token.value === undefined && refreshToken.value === undefined,
  );

  const loginEndpoint = api.auth.login.use();

  const { mutateAsync: loginCall } = useMutation({
    ...loginEndpoint,
    onError: (error: Error) => {
      // Clear any existing tokens on login error
      setToken();
      user.value = undefined;
      throw error;
    },
    onSuccess: (data) => {
      setToken({
        refreshToken: data.refreshToken,
        token: data.accessToken,
      });
      user.value = data.user;
    },
  });

  const refreshEndpoint = api.auth.refreshToken.use();

  const { mutateAsync: refreshCall } = useMutation({
    ...refreshEndpoint,
    onError: (error: Error) => {
      // Clear tokens on refresh error
      setToken();
      user.value = undefined;
      throw error;
    },
    onSuccess: (data) => {
      setToken({
        refreshToken: data.refreshToken,
        token: data.accessToken,
      });
      user.value = data.user;
    },
  });

  async function login(email: string, password: string) {
    await loginCall({
      email,
      password,
    });

    reloadNuxtApp();
  }

  function logout() {
    if (!isLoggedIn.value) {
      return;
    }

    setToken();
    user.value = undefined;

    reloadNuxtApp();
  }

  async function refresh() {
    // Don't refresh if already refreshing or refresh token is expired
    if (isRefreshing.value || isRefreshTokenExpired.value) {
      return;
    }

    if (!refreshToken.value) {
      return;
    }

    isRefreshing.value = true;
    try {
      await refreshCall({ refreshToken: refreshToken.value });
    } finally {
      isRefreshing.value = false;
    }
  }

  function startRefreshTokenTimer() {
    if (timer.value) clearTimeout(timer.value);

    if (!tokenPayload.value?.exp) {
      console.warn('"exp" not set in JWT!');
      return;
    }

    const timeout =
      tokenPayload.value.exp * 1000 - now.value.getTime() - oneMinute;

    // Don't set timer if token is already expired or about to expire
    if (timeout <= 0) {
      void refresh();

      return;
    }

    timer.value = setTimeout(() => {
      refresh().catch((error) => {
        console.error("Failed to refresh token:", error);
        // Clear tokens on refresh failure
        setToken();
        user.value = undefined;
      });
    }, timeout);
  }

  function setToken(tokenData?: { refreshToken?: string; token?: string }) {
    refreshToken.value = tokenData?.refreshToken;
    token.value = tokenData?.token;

    if (token.value && tokenPayload.value?.exp) {
      startRefreshTokenTimer();
    } else if (timer.value) {
      clearTimeout(timer.value);
      timer.value = undefined;
    }
  }

  watchEffect(() => {
    if (isTokenExpired.value && !isRefreshTokenExpired.value) {
      if (isLoggedOut.value) {
        logout();
      } else {
        void refresh();
      }
    }
  });

  setToken({
    refreshToken: refreshToken.value,
    token: token.value,
  });

  return {
    isLoggedIn,
    isLoggedOut,
    isRefreshing: readonly(isRefreshing),
    isRefreshTokenExpired,
    isTokenExpired,
    login,
    logout,
    payload: readonly(tokenPayload),
    refresh,
    refreshToken: readonly(refreshToken),
    setToken,
    token: readonly(token),
    user: readonly(user),
  };
});
