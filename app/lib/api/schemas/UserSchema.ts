import { z } from "zod";
import {
  PaginationResponseSchema,
  PaginationRequestSchema,
} from "./CommonSchema";
import { RoleSchema } from "./RoleSchema";

export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  roles: z.array(RoleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// List Users
export const ListUsersRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
});

export const ListUsersResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get User
export const GetUserRequestSchema = z.object({
  id: z.string(),
});

export const GetUserResponseSchema = z.object({
  user: UserSchema,
});

// Create User
export const CreateUserRequestSchema = z.object({
  code: z.string(),
  names: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
});

export const CreateUserResponseSchema = z.object({
  user: UserSchema,
});

// Update User
export const UpdateUserRequestSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  names: z.record(z.string(), z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateUserResponseSchema = z.object({
  user: UserSchema,
});

// Delete User
export const DeleteUserRequestSchema = z.object({
  id: z.string(),
});

export const DeleteUserResponseSchema = z.object({});

// Types
export type User = z.infer<typeof UserSchema>;
export type ListUsersRequest = z.infer<typeof ListUsersRequestSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
export type GetUserRequest = z.infer<typeof GetUserRequestSchema>;
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type DeleteUserRequest = z.infer<typeof DeleteUserRequestSchema>;
export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;
