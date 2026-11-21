<script setup lang="ts">
import { Card, Headline, Text } from "@thkzt/eunoia";

// The running versions of the web app and the server, for everyone signed in.
const { t } = useI18n();
const { web, server } = useVersions();
</script>

<template>
  <Card>
    <div class="space-y-4">
      <div>
        <Headline :level="4">{{ t("versions.title") }}</Headline>
        <Text muted size="sm">{{ t("versions.description") }}</Text>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("versions.web") }}
        </dt>
        <dd data-testid="version-web">{{ web }}</dd>
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("versions.server") }}
        </dt>
        <dd data-testid="version-server">
          {{ server ?? t("versions.unknown") }}
        </dd>
      </dl>
      <VersionMismatchAlert />
    </div>
  </Card>
</template>
