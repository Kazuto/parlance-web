import { useQuery } from "@tanstack/vue-query";
import type {
  FilterRequest,
  PaginationRequest,
} from "~/lib/api/schemas/parlance/v1/CommonSchema";
import type { Permission } from "~/lib/api/schemas/parlance/v1/PermissionSchema";
import { api } from "~/lib/api";

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

export function usePermissionList() {
  const pagination = ref<PaginationRequest>({ perPage: 10, page: 1 });
  const filter = ref<FilterRequest>({
    search: undefined,
    sort: undefined,
    order: undefined,
    includeDeleted: false,
  });

  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...api.permissions.list.use({ pagination, filter }),
  });

  return {
    data,
    isLoading,
    isPending,
    error,
    refetch,
    pagination,
    filter,
  };
}
