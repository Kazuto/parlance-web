import { watch } from "vue";
import { setDefaultLocale } from "@thkzt/eunoia";
import type { Composer } from "vue-i18n";
import { defineNuxtPlugin } from "#imports";
import { NuxtLink } from "#components";

export default defineNuxtPlugin({
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const { locale } = nuxtApp.$i18n as Composer;

    // Set Eunoia's default locale to match the app's locale
    setDefaultLocale(locale.value);

    // Update Eunoia's locale when the app's locale changes
    watch(locale, (newLocale) => {
      setDefaultLocale(newLocale);
    });

    // Provide NuxtLink component to Eunoia
    nuxtApp.vueApp.provide("eunoiaLinkComponent", NuxtLink);
  },
});
