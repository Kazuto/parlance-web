<script setup lang="ts">
import { Alert } from "@thkzt/eunoia";

// Warns when the server runs a major version this web app isn't made for, which
// breaks parts of it until the one behind is updated.
const { t } = useI18n();
const { server, serverFits, supportedServerMajor } = useVersions();
</script>

<template>
  <Alert
    v-if="!serverFits"
    variant="warning"
    dense
    persistent
    data-testid="version-mismatch"
  >
    {{
      t("versions.mismatch", {
        major: supportedServerMajor,
        version: server ?? "",
      })
    }}
  </Alert>
</template>
