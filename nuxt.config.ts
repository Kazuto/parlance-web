import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { availableLocales } from "./i18n/availableLocales";

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
    "@nuxt/test-utils/module",
  ],

  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    // Every catalog in i18n/locales is a language of the interface.
    locales: availableLocales(
      fileURLToPath(new URL("./i18n/locales", import.meta.url)),
    ),
    detectBrowserLanguage: false,
    vueI18n: "./i18n.config.ts",
  },

  css: ["./app/assets/css/main.css"],

  // @nuxt/fonts only loads weight 400 by default; without the other weights the browser
  // fakes bold text by smearing the regular glyphs, which looks blurry or "glowing".
  fonts: {
    families: [
      {
        name: "Nunito Sans",
        weights: [400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },

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
    optimizeDeps: {
      include: ["@thkzt/eunoia"],
    },
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
