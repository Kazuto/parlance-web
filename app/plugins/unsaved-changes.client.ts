import type { Composer } from "vue-i18n";

export default defineNuxtPlugin({
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n as Composer;
    const router = useRouter();
    const { count, saving } = useUnsavedChanges();

    router.beforeEach((to, from) => {
      if (to.fullPath === from.fullPath) return true;
      if (saving.value) return false;
      if (!count.value) return true;

      return window.confirm(
        i18n.t("unsaved.leaveConfirm", { count: count.value }, count.value),
      );
    });
    window.addEventListener("beforeunload", (event) => {
      if (!count.value && !saving.value) return;
      event.preventDefault();
      event.returnValue = "";
    });
  },
});
