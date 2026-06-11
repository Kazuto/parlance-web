import { authedEndpoint } from "../builder";
import {
  ListRolesRequestSchema,
  ListRolesResponseSchema,
  GetRoleRequestSchema,
  GetRoleResponseSchema,
  CreateRoleRequestSchema,
  CreateRoleResponseSchema,
  UpdateRoleRequestSchema,
  UpdateRoleResponseSchema,
  DeleteRoleRequestSchema,
  DeleteRoleResponseSchema,
  type ListRolesRequest,
  type GetRoleRequest,
  type CreateRoleRequest,
  type UpdateRoleRequest,
  type DeleteRoleRequest,
  type RestoreRoleRequest,
  RestoreRoleResponseSchema,
  RestoreRoleRequestSchema,
} from "../schemas/RoleSchema";

export const roles = {
  list: authedEndpoint.query(
    (data: ListRolesRequest) => ({
      method: "post",
      url: "/parlance.v1.RoleService/ListRoles",
      json: data,
    }),
    {
      input: ListRolesRequestSchema,
      output: ListRolesResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetRoleRequest) => ({
      method: "post",
      url: "/parlance.v1.RoleService/GetRole",
      json: data,
    }),
    {
      input: GetRoleRequestSchema,
      output: GetRoleResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateRoleRequest) => ({
      method: "post",
      url: "/parlance.v1.RoleService/CreateRole",
      json: data,
    }),
    {
      input: CreateRoleRequestSchema,
      output: CreateRoleResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateRoleRequest) => ({
      method: "post",
      url: "/parlance.v1.RoleService/UpdateRole",
      json: data,
    }),
    {
      input: UpdateRoleRequestSchema,
      output: UpdateRoleResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteRoleRequest) => ({
      method: "post",
      url: "/parlance.v1.RoleService/DeleteRole",
      json: data,
    }),
    {
      input: DeleteRoleRequestSchema,
      output: DeleteRoleResponseSchema,
    },
  ),
  restore: authedEndpoint.mutate(
    (data: RestoreRoleRequest) => ({
      method: "post",
      url: "/parlance.v1.RoleService/RestoreRole",
      json: data,
    }),
    {
      input: RestoreRoleRequestSchema,
      output: RestoreRoleResponseSchema,
    },
  ),
};
