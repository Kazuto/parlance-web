import type { Permission } from "~/lib/api/schemas/parlance/v1/PermissionSchema";

/** Groups permissions by resource, each group sorted by action. */
export function groupPermissionsByResource(permissions: Permission[]) {
  const grouped: Record<string, Permission[]> = {};

  permissions.forEach((permission: Permission) => {
    const resource = permission.resource || "other";

    if (!grouped[resource]) {
      grouped[resource] = [];
    }

    grouped[resource].push(permission);
  });

  // Sort permissions within each group by action
  Object.keys(grouped).forEach((resource) => {
    const group = grouped[resource];

    if (group) {
      group.sort((a: Permission, b: Permission) =>
        (a.action || "").localeCompare(b.action || ""),
      );
    }
  });

  return grouped;
}

/** Shows a permission's resource or action as words, e.g. "translation server". */
export function humanizePermission(text: string) {
  return text.replaceAll("_", " ");
}
