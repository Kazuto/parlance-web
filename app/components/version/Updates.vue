<script setup lang="ts">
import { Alert, Badge, Card, Headline, Text } from "@thkzt/eunoia";
import type { AvailableRelease } from "~/lib/api/schemas/parlance/v1/UpdateSchema";
import { parseVersion } from "~/lib/version";

// Whether newer releases of the server and the web app are out, for those with
// read_update. The server asks GitHub for them, unless UPDATE_CHECK=false.
const { t, locale } = useI18n();
const { data, isLoading, versions, server, web } = useUpdates();

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "";

const parts = computed(() => [
  {
    id: "server",
    label: t("versions.server"),
    running: versions.server.value,
    newest: data.value?.server,
    update: server.value,
  },
  {
    id: "web",
    label: t("versions.web"),
    running: versions.web.value,
    newest: data.value?.web,
    update: web.value,
  },
]);

// What to say about a part that has no update.
function status(running: string | undefined, newest?: AvailableRelease | null) {
  if (!newest?.version) return t("versions.noRelease");
  // A build that isn't a release can't be compared.
  if (!parseVersion(running))
    return t("versions.newest", { version: newest.version });

  return t("versions.upToDate");
}
</script>

<template>
  <Card id="updates">
    <div class="space-y-4">
      <div>
        <Headline :level="4">{{ t("versions.updates") }}</Headline>
        <Text muted size="sm">{{ t("versions.updatesDescription") }}</Text>
      </div>

      <Text v-if="data && !data.enabled" size="sm" data-testid="updates-off">
        {{ t("versions.checkOff") }}
      </Text>

      <ul v-else-if="!isLoading" class="space-y-3">
        <li
          v-for="part in parts"
          :key="part.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          :data-testid="`update-${part.id}`"
        >
          <span class="font-semibold">{{ part.label }}</span>
          <span class="text-neutral-500 dark:text-neutral-400">{{
            t("versions.running", {
              version: part.running ?? t("versions.unknown"),
            })
          }}</span>
          <template v-if="part.update">
            <Badge variant="primary" dense>{{
              t("versions.available", { version: part.update.version ?? "" })
            }}</Badge>
            <span class="text-neutral-500 dark:text-neutral-400">{{
              formatDate(part.update.publishedAt)
            }}</span>
            <a
              v-if="part.update.url"
              :href="part.update.url"
              target="_blank"
              rel="noopener"
              class="font-semibold text-primary-600 hover:underline dark:text-primary-300"
              >{{ t("versions.releaseNotes") }}</a
            >
          </template>
          <span v-else class="text-neutral-500 dark:text-neutral-400">{{
            status(part.running, part.newest)
          }}</span>
        </li>
      </ul>

      <VersionMismatchAlert />

      <Alert v-if="data?.error" variant="warning" dense persistent>
        {{ t("versions.checkFailed", { error: data.error }) }}
      </Alert>
      <Text
        v-if="data?.checkedAt"
        muted
        size="sm"
        data-testid="updates-checked"
      >
        {{ t("versions.checkedAt", { date: formatDate(data.checkedAt) }) }}
      </Text>
    </div>
  </Card>
</template>
