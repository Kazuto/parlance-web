import { VueQueryPlugin } from "@tanstack/vue-query";
import type { VueQueryPluginOptions } from "@tanstack/vue-query";

export default defineNuxtPlugin((nuxt) => {
  const queryClientOptions: VueQueryPluginOptions = {
    queryClientConfig: {
      defaultOptions: {
        queries: {
          staleTime: 5000,
          retry: false,
        },
      },
    },
  };

  nuxt.vueApp.use(VueQueryPlugin, queryClientOptions);
});
