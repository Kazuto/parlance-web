import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "Parlance",
    },
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@pinia/nuxt",
    "@nuxtjs/i18n",
    "@nuxt/a11y",
  ],

  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    locales: [
      {
        code: "en",
        language: "en",
        name: "English",
        files: ["en.json", "eunoia/en.json"],
      },
      {
        code: "de",
        language: "de",
        name: "Deutsch",
        files: ["de.json", "eunoia/de.json"],
      },
      {
        code: "fr",
        language: "fr",
        name: "Français",
        files: ["fr.json", "eunoia/fr.json"],
      },
      {
        code: "es",
        language: "es",
        name: "Español",
        files: ["es.json", "eunoia/es.json"],
      },
    ],
    detectBrowserLanguage: false,
    vueI18n: "./i18n.config.ts",
  },

  css: ["./app/assets/css/main.css"],

  typescript: {
    typeCheck: true,
  },

  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
    },
  },

  ssr: false,

  vite: {
    plugins: [tailwindcss()],
    server: {
      hmr: {
        port: 24678,
      },
      watch: {
        usePolling: true, // required for file watching in Docker
      },
    },
  },
});
