export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();
  const publicRoutes = ["/login", "/setup"];

  // Check if setup is needed (only for non-setup pages)
  if (to.path !== "/setup") {
    try {
      const config = useRuntimeConfig();
      const response = await fetch(
        `${config.public.apiBaseUrl}/parlance.v1.SetupService/GetSetupStatus`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.needsSetup) {
          return navigateTo("/setup");
        }
      }
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
