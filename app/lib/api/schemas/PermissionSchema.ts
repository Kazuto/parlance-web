import { z } from "zod";
import {
  PaginationResponseSchema,
  PaginationRequestSchema,
} from "./CommonSchema";

export const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  resource: z.string(),
  action: z.string(),
});

// List Permissions
export const ListPermissionsRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
});

export const ListPermissionsResponseSchema = z.object({
  permissions: z.array(PermissionSchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Permission
export const GetPermissionRequestSchema = z.object({
  id: z.string(),
});

export const GetPermissionResponseSchema = z.object({
  permission: PermissionSchema,
});

export const DeletePermissionResponseSchema = z.object({});

// Types
export type Permission = z.infer<typeof PermissionSchema>;
export type ListPermissionsRequest = z.infer<
  typeof ListPermissionsRequestSchema
>;
export type ListPermissionsResponse = z.infer<
  typeof ListPermissionsResponseSchema
>;
export type GetPermissionRequest = z.infer<typeof GetPermissionRequestSchema>;
export type GetPermissionResponse = z.infer<typeof GetPermissionResponseSchema>;
