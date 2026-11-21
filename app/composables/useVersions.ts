import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { AvailableRelease } from "~/lib/api/schemas/parlance/v1/UpdateSchema";
import {
  SUPPORTED_SERVER_MAJOR,
  isNewerVersion,
  parseVersion,
} from "~/lib/version";

/**
 * The running versions of the web app and the server, and whether they fit: this
 * web app is made for one major version of the server. Builds that aren't
 * releases, like "dev", always fit.
 */
export function useVersions() {
  const authStore = useAuthStore();
  const config = useRuntimeConfig();
  // The same query the layout loads, so this reads from its cache.
  const { data } = useQuery({
    ...api.auth.getCurrentUser.use({}),
    enabled: computed(() => authStore.isLoggedIn),
  });

  const web = computed(() => String(config.public.appVersion || "dev"));
  // Servers from before they told their version say nothing.
  const server = computed(() => data.value?.serverVersion || undefined);
  const serverFits = computed(() => {
    const major = parseVersion(server.value)?.[0];

    return major === undefined || major === SUPPORTED_SERVER_MAJOR;
  });

  return {
    web,
    server,
    serverFits,
    supportedServerMajor: SUPPORTED_SERVER_MAJOR,
  };
}

/**
 * The releases on GitHub newer than the running ones, for those with read_update.
 * The server asks GitHub at most every 12 hours, so the answer is kept for an hour.
 */
export function useUpdates() {
  const { can } = usePermission();
  const versions = useVersions();
  const query = useQuery({
    ...api.updates.get.use({}),
    enabled: computed(() => can.value("read_update")),
    staleTime: 60 * 60 * 1000,
  });

  const newer = (
    release: AvailableRelease | null | undefined,
    running: string | undefined,
  ) => (isNewerVersion(release?.version, running) ? release! : undefined);

  const server = computed(() =>
    newer(query.data.value?.server, versions.server.value),
  );
  const web = computed(() => newer(query.data.value?.web, versions.web.value));

  return {
    ...query,
    versions,
    server,
    web,
    available: computed(() => !!server.value || !!web.value),
  };
}
