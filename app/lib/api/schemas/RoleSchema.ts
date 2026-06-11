import { z } from "zod";
import {
  PaginationResponseSchema,
  PaginationRequestSchema,
  FilterRequestSchema,
} from "./CommonSchema";
import { PermissionSchema } from "./PermissionSchema";

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  permissions: PermissionSchema.array().nullish(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullish(),
});

// List Roles
export const ListRolesRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
  filter: FilterRequestSchema.optional(),
});

export const ListRolesResponseSchema = z.object({
  roles: z.array(RoleSchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Role
export const GetRoleRequestSchema = z.object({
  id: z.string(),
});

export const GetRoleResponseSchema = z.object({
  role: RoleSchema,
});

// Create Role
export const CreateRoleRequestSchema = z.object({
  code: z.string(),
  names: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
});

export const CreateRoleResponseSchema = z.object({
  role: RoleSchema,
});

// Update Role
export const UpdateRoleRequestSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  names: z.record(z.string(), z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateRoleResponseSchema = z.object({
  role: RoleSchema,
});

// Delete Role
export const DeleteRoleRequestSchema = z.object({
  id: z.string(),
});

export const DeleteRoleResponseSchema = z.object({});

// Types
export type Role = z.infer<typeof RoleSchema>;
export type ListRolesRequest = z.infer<typeof ListRolesRequestSchema>;
export type ListRolesResponse = z.infer<typeof ListRolesResponseSchema>;
export type GetRoleRequest = z.infer<typeof GetRoleRequestSchema>;
export type GetRoleResponse = z.infer<typeof GetRoleResponseSchema>;
export type CreateRoleRequest = z.infer<typeof CreateRoleRequestSchema>;
export type CreateRoleResponse = z.infer<typeof CreateRoleResponseSchema>;
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>;
export type UpdateRoleResponse = z.infer<typeof UpdateRoleResponseSchema>;
export type DeleteRoleRequest = z.infer<typeof DeleteRoleRequestSchema>;
export type DeleteRoleResponse = z.infer<typeof DeleteRoleResponseSchema>;
