import {
  watch,
  type Directive,
  type DirectiveBinding,
  type WatchStopHandle,
} from "vue";
import type { Permission } from "~/lib/api/schemas/parlance/v1/PermissionSchema";

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
  __vCanValue?: CanBindingValue;
  __vCanStop?: WatchStopHandle;
}

function checkPermission(
  value: CanBindingValue,
  authStore: ReturnType<typeof useAuthStore>,
): boolean {
  if (!authStore.user) return false;

  const allPermissions = (authStore.user.roles ?? []).flatMap(
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
    return (authStore.user.roles ?? []).some((r) => r.name === value.role);
  }

  return false;
}

function toBindingValue(value: string | CanBindingValue): CanBindingValue {
  // Handle simple string usage: v-can="'create_entry'"
  return typeof value === "string" ? { permission: value } : value;
}

// Swaps the element for a comment placeholder while the permission is missing.
function apply(element: ElementWithComment, hasPermission: boolean) {
  const comment = element.__vCanComment;

  if (!hasPermission && element.parentNode) {
    if (!comment) {
      const newComment = document.createComment("v-can");
      element.parentNode.insertBefore(newComment, element);
      element.__vCanComment = newComment;
    }
    element.remove();
  } else if (hasPermission && comment?.parentNode && !element.parentNode) {
    comment.parentNode.insertBefore(element, comment.nextSibling);
  }
}

export const vCan: Directive = {
  mounted(
    el: HTMLElement,
    binding: DirectiveBinding<string | CanBindingValue>,
  ) {
    const element = el as ElementWithComment;
    const authStore = useAuthStore();
    element.__vCanValue = toBindingValue(binding.value);

    // Follow the store too: the user and their permissions can be reloaded after
    // the element mounted, without its component rendering again.
    element.__vCanStop = watch(
      () => checkPermission(element.__vCanValue!, authStore),
      (hasPermission) => apply(element, hasPermission),
      { immediate: true },
    );
  },

  updated(
    el: HTMLElement,
    binding: DirectiveBinding<string | CanBindingValue>,
  ) {
    const element = el as ElementWithComment;
    element.__vCanValue = toBindingValue(binding.value);
    apply(element, checkPermission(element.__vCanValue, useAuthStore()));
  },

  unmounted(el: HTMLElement) {
    const element = el as ElementWithComment;
    element.__vCanStop?.();
    // Clean up comment node
    const comment = element.__vCanComment;
    if (comment?.parentNode) {
      comment.remove();
    }
  },
};
