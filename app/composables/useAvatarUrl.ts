import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

/** Returns where a user's avatar loads from: avatars are served by the API. */
export function useAvatarUrl() {
  const baseUrl = String(useRuntimeConfig().public.apiBaseUrl);

  return (user?: Pick<User, "avatar"> | null) =>
    user?.avatar ? new URL(user.avatar, baseUrl).href : undefined;
}
