import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";

export default defineConfig({
  test: {
    // mountSuspended renders in <Suspense>, which Vue calls experimental once in
    // every file.
    onConsoleLog: (log) =>
      !log.startsWith("<Suspense> is an experimental feature"),
    projects: [
      // Plain Node tests that only read files.
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.spec.ts"],
          environment: "node",
        },
      },
      // Tests that mount app code inside a running Nuxt app.
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.spec.ts"],
          environment: "nuxt",
          setupFiles: ["test/nuxt/setup.ts"],
          environmentOptions: {
            nuxt: {
              domEnvironment: "happy-dom",
              overrides: {
                runtimeConfig: {
                  public: { apiBaseUrl: "http://api.test" },
                },
                // The app checks its build manifest a second after starting, with
                // $fetch; in a test file that ended by then, that throws and fails
                // the run.
                experimental: { appManifest: false },
              },
            },
          },
        },
      }),
    ],
  },
});
