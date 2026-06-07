import type { Permission } from "~/lib/api/schemas/PermissionSchema";

export function usePermission() {
  const authStore = useAuthStore();

  /**
   * Check if user has a specific permission by name
   */
  const can = (permissionName: string): boolean => {
    if (!authStore.user) return false;

    return authStore.user.roles
      .flatMap((role) => role.permissions ?? [])
      .some((permission: Permission) => permission.name === permissionName);
  };

  /**
   * Check if user has a specific permission by resource and action
   */
  const canDo = (resource: string, action: string): boolean => {
    if (!authStore.user) return false;

    return authStore.user.roles
      .flatMap((role) => role.permissions ?? [])
      .some(
        (permission: Permission) =>
          permission.resource === resource && permission.action === action,
      );
  };

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = (permissionNames: string[]): boolean => {
    return permissionNames.some((name) => can(name));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (permissionNames: string[]): boolean => {
    return permissionNames.every((name) => can(name));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (roleName: string): boolean => {
    if (!authStore.user) return false;

    return authStore.user.roles.some((role) => role.name === roleName);
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some((name) => hasRole(name));
  };

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = (roleNames: string[]): boolean => {
    return roleNames.every((name) => hasRole(name));
  };

  return {
    can: computed(() => can),
    canDo: computed(() => canDo),
    canAny: computed(() => canAny),
    canAll: computed(() => canAll),
    hasRole: computed(() => hasRole),
    hasAnyRole: computed(() => hasAnyRole),
    hasAllRoles: computed(() => hasAllRoles),
  };
}
