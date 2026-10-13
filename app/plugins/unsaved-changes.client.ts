export default defineNuxtPlugin(() => {
  const router = useRouter();
  const { count, saving } = useUnsavedChanges();
  router.beforeEach((to, from) => {
    if (to.fullPath === from.fullPath) return true;
    if (saving.value) return false;
    if (!count.value) return true;
    return window.confirm(
      `You have ${count.value} unsaved change${count.value === 1 ? "" : "s"}. Leave this page and discard them?`,
    );
  });
  window.addEventListener("beforeunload", (event) => {
    if (!count.value && !saving.value) return;
    event.preventDefault();
    event.returnValue = "";
  });
});
