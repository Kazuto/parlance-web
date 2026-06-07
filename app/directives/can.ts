import type { Directive, DirectiveBinding } from "vue";
import type { Permission } from "~/lib/api/schemas/PermissionSchema";

interface CanBindingValue {
  permission?: string;
  resource?: string;
  action?: string;
  any?: string[];
  all?: string[];
  role?: string;
}

interface ElementWithComment extends HTMLElement {
  __vCanComment?: Comment;
}

function checkPermission(
  value: CanBindingValue,
  authStore: ReturnType<typeof useAuthStore>,
): boolean {
  if (!authStore.user) return false;

  const allPermissions = authStore.user.roles.flatMap(
    (role) => role.permissions ?? [],
  );

  // Check by permission name
  if (value.permission) {
    return allPermissions.some(
      (permission: Permission) => permission.name === value.permission,
    );
  }

  // Check by resource and action
  if (value.resource && value.action) {
    return allPermissions.some(
      (permission: Permission) =>
        permission.resource === value.resource &&
        permission.action === value.action,
    );
  }

  // Check if has any of the permissions
  if (value.any) {
    return value.any.some((name) =>
      allPermissions.some((permission: Permission) => permission.name === name),
    );
  }

  // Check if has all of the permissions
  if (value.all) {
    return value.all.every((name) =>
      allPermissions.some((permission: Permission) => permission.name === name),
    );
  }

  // Check by role
  if (value.role) {
    return authStore.user.roles.some((r) => r.name === value.role);
  }

  return false;
}

export const vCan: Directive = {
  mounted(
    el: HTMLElement,
    binding: DirectiveBinding<string | CanBindingValue>,
  ) {
    const element = el as ElementWithComment;
    const authStore = useAuthStore();

    // Handle simple string usage: v-can="'create_entry'"
    const value =
      typeof binding.value === "string"
        ? { permission: binding.value }
        : binding.value;

    const hasPermission = checkPermission(value, authStore);

    if (!hasPermission) {
      // Store a comment node as placeholder for potential updates
      const comment = document.createComment("v-can");
      element.parentNode?.insertBefore(comment, element);
      element.__vCanComment = comment;
      element.remove();
    }
  },

  updated(
    el: HTMLElement,
    binding: DirectiveBinding<string | CanBindingValue>,
  ) {
    const element = el as ElementWithComment;
    const authStore = useAuthStore();

    const value =
      typeof binding.value === "string"
        ? { permission: binding.value }
        : binding.value;

    const hasPermission = checkPermission(value, authStore);
    const comment = element.__vCanComment;

    if (!hasPermission && element.parentNode) {
      // Remove from DOM if it exists
      if (!comment) {
        const newComment = document.createComment("v-can");
        element.parentNode.insertBefore(newComment, element);
        element.__vCanComment = newComment;
      }
      element.remove();
    } else if (hasPermission && comment && comment.parentNode) {
      // Re-insert element if permission was granted
      comment.parentNode.insertBefore(element, comment.nextSibling);
    }
  },

  unmounted(el: HTMLElement) {
    const element = el as ElementWithComment;
    // Clean up comment node
    const comment = element.__vCanComment;
    if (comment?.parentNode) {
      comment.remove();
    }
  },
};
