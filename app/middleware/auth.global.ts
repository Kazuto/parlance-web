export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();

  // Public routes that don't require authentication
  const publicRoutes = ["/login"];

  // If trying to access a protected route while logged out
  if (!authStore.isLoggedIn && !publicRoutes.includes(to.path)) {
    return navigateTo("/login");
  }

  // If trying to access login page while logged in
  if (authStore.isLoggedIn && to.path === "/login") {
    return navigateTo("/");
  }
});
