// Once set up, an instance stays set up, so the status is only asked until then.
let setupComplete = false;

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();
  const publicRoutes = ["/login", "/setup"];

  // Check if setup is needed (only for non-setup pages)
  if (to.path !== "/setup" && !setupComplete) {
    try {
      if (await useSetupClient().checkStatus()) {
        return navigateTo("/setup");
      }

      setupComplete = true;
    } catch (err) {
      console.error("Failed to check setup status:", err);
    }
  }

  // If trying to access a protected route while logged out
  if (!authStore.isLoggedIn && !publicRoutes.includes(to.path)) {
    return navigateTo("/login");
  }

  // If trying to access login page while logged in
  if (authStore.isLoggedIn && to.path === "/login") {
    return navigateTo("/");
  }
});
