import { defineNuxtPlugin } from "#imports";
import { NuxtLink } from "#components";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.provide("eunoiaLinkComponent", NuxtLink);
});
