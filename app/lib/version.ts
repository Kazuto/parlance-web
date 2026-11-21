/**
 * The major version of the server this web app is made for. Raise it with the
 * changes for a server release that breaks the API, e.g. to 3 for server 3.0.0.
 */
export const SUPPORTED_SERVER_MAJOR = 2;

/**
 * A release's numbers, e.g. [2, 1, 0] for "2.1.0" or "v2.1.0"; none for what isn't
 * a release, like "dev", a branch or a pre-release.
 */
export function parseVersion(version: string | null | undefined) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version?.trim() ?? "");

  return match
    ? ([Number(match[1]), Number(match[2]), Number(match[3])] as const)
    : undefined;
}

/** Whether `latest` is a newer release than `current`; never if either isn't one. */
export function isNewerVersion(
  latest: string | null | undefined,
  current: string | null | undefined,
) {
  const newest = parseVersion(latest);
  const running = parseVersion(current);

  if (!newest || !running) return false;

  for (let i = 0; i < 3; i++) {
    if (newest[i] !== running[i]) return newest[i]! > running[i]!;
  }

  return false;
}
