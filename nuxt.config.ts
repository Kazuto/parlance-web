import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxt/icon"],

  css: ["./app/assets/css/main.css"],

  typescript: {
    typeCheck: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
