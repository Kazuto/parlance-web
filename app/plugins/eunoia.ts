import { computed } from "vue";
import { LOCALE_KEY, type LocaleMessages } from "@thkzt/eunoia";
import type { Composer } from "vue-i18n";
import { defineNuxtPlugin } from "#imports";
import { NuxtLink } from "#components";
import eunoiaMessages from "~~/i18n/locales/eunoia/en.json";

const PREFIX = "eunoia.";

// vue-i18n's flatJson rewrites this same object into nested form, so accept both shapes.
function flatten(messages: object, path = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatten(value, `${path}${key}.`)
      : typeof value === "string"
        ? [[`${path}${key}`, value]]
        : [],
  );
}

export default defineNuxtPlugin({
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const { t } = nuxtApp.$i18n as Composer;
    // Eunoia fills `{name}` placeholders itself, so hand them back unchanged.
    const eunoiaKeys = flatten(eunoiaMessages).map(([key, message]) => ({
      key,
      placeholders: Object.fromEntries(
        [...message.matchAll(/\{(\w+)\}/g)].map(([placeholder, name]) => [
          name,
          placeholder,
        ]),
      ),
    }));
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
