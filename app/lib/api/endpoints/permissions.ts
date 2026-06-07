import { authedEndpoint } from "../builder";
import {
  ListPermissionsRequestSchema,
  ListPermissionsResponseSchema,
  GetPermissionRequestSchema,
  GetPermissionResponseSchema,
  type ListPermissionsRequest,
  type GetPermissionRequest,
} from "../schemas/PermissionSchema";

export const permissions = {
  list: authedEndpoint.query(
    (data: ListPermissionsRequest) => ({
      method: "post",
      url: "/parlance.v1.PermissionService/ListPermissions",
      json: data,
    }),
    {
      input: ListPermissionsRequestSchema,
      output: ListPermissionsResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetPermissionRequest) => ({
      method: "post",
      url: "/parlance.v1.PermissionService/GetPermission",
      json: data,
    }),
    {
      input: GetPermissionRequestSchema,
      output: GetPermissionResponseSchema,
    },
  ),
};
