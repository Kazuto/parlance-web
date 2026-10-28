<script setup lang="ts">
import { textDirection } from "~/lib/textDirection";

// The entry's text in the default language, as the entry list delivers it: already
// shortened by the server, so it is only a preview.
defineProps<{
  translation?: string;
  localeName: string;
  localeCode?: string;
}>();

const { t } = useI18n();
</script>

<template>
  <span class="block max-w-xs">
    <span
      v-if="translation"
      class="line-clamp-6 whitespace-pre-wrap"
      :dir="localeCode ? textDirection(localeCode) : undefined"
      >{{ translation }}</span
    >
    <span v-else class="italic opacity-70">{{
      t("entries.noDefaultTranslation", { language: localeName })
    }}</span>
  </span>
</template>
