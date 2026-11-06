import {
  watch,
  type Directive,
  type DirectiveBinding,
  type WatchStopHandle,
} from "vue";

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

function checkPermission(value: CanBindingValue): boolean {
  const { can, canDo, canAny, canAll, hasRole } = usePermission();

  if (value.permission) return can.value(value.permission);
  if (value.resource && value.action)
    return canDo.value(value.resource, value.action);
  if (value.any) return canAny.value(value.any);
  if (value.all) return canAll.value(value.all);
  if (value.role) return hasRole.value(value.role);

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

    element.__vCanValue = toBindingValue(binding.value);

    // Follow the store too: the user and their permissions can be reloaded after
    // the element mounted, without its component rendering again.
    element.__vCanStop = watch(
      () => checkPermission(element.__vCanValue!),
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
    apply(element, checkPermission(element.__vCanValue));
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
