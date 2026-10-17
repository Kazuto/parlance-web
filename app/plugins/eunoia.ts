import { computed } from "vue";
import { LOCALE_KEY, type LocaleMessages } from "@thkzt/eunoia";
import type { Composer } from "vue-i18n";
import { defineNuxtPlugin } from "#imports";
import { NuxtLink } from "#components";
// Read as text: nuxt-i18n nests and precompiles the imported JSON object in place,
// so walking it would yield keys like "select.placeholder.body.static".
import eunoiaSource from "~~/i18n/locales/eunoia/en.json?raw";

const PREFIX = "eunoia.";
const eunoiaMessages = JSON.parse(eunoiaSource) as Record<string, string>;

// Eunoia fills `{name}` placeholders itself, so hand them back unchanged.
const eunoiaKeys = Object.entries(eunoiaMessages).map(([key, message]) => ({
  key,
  placeholders: Object.fromEntries(
    [...message.matchAll(/\{(\w+)\}/g)].map(([placeholder, name]) => [
      name,
      placeholder,
    ]),
  ),
}));

export default defineNuxtPlugin({
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const { t } = nuxtApp.$i18n as Composer;
    nuxtApp.vueApp.provide("eunoiaLinkComponent", NuxtLink);
    nuxtApp.vueApp.provide(
      LOCALE_KEY,
      computed<LocaleMessages>(() =>
        Object.fromEntries(
          eunoiaKeys.map(({ key, placeholders }) => [
            key.slice(PREFIX.length),
            t(key, placeholders),
          ]),
        ),
      ),
    );
  },
});
