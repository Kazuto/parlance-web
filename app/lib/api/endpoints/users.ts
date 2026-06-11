import { authedEndpoint } from "../builder";
import {
  ListUsersRequestSchema,
  ListUsersResponseSchema,
  GetUserRequestSchema,
  GetUserResponseSchema,
  CreateUserRequestSchema,
  CreateUserResponseSchema,
  UpdateUserRequestSchema,
  UpdateUserResponseSchema,
  DeleteUserRequestSchema,
  DeleteUserResponseSchema,
  type ListUsersRequest,
  type GetUserRequest,
  type CreateUserRequest,
  type UpdateUserRequest,
  type DeleteUserRequest,
  type RestoreUserRequest,
  RestoreUserResponseSchema,
  RestoreUserRequestSchema,
} from "../schemas/UserSchema";

export const users = {
  list: authedEndpoint.query(
    (data: ListUsersRequest) => ({
      method: "post",
      url: "/parlance.v1.UserService/ListUsers",
      json: data,
    }),
    {
      input: ListUsersRequestSchema,
      output: ListUsersResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetUserRequest) => ({
      method: "post",
      url: "/parlance.v1.UserService/GetUser",
      json: data,
    }),
    {
      input: GetUserRequestSchema,
      output: GetUserResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateUserRequest) => ({
      method: "post",
      url: "/parlance.v1.UserService/CreateUser",
      json: data,
    }),
    {
      input: CreateUserRequestSchema,
      output: CreateUserResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateUserRequest) => ({
      method: "post",
      url: "/parlance.v1.UserService/UpdateUser",
      json: data,
    }),
    {
      input: UpdateUserRequestSchema,
      output: UpdateUserResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteUserRequest) => ({
      method: "post",
      url: "/parlance.v1.UserService/DeleteUser",
      json: data,
    }),
    {
      input: DeleteUserRequestSchema,
      output: DeleteUserResponseSchema,
    },
  ),

  restore: authedEndpoint.mutate(
    (data: RestoreUserRequest) => ({
      method: "post",
      url: "/parlance.v1.UserService/RestoreUser",
      json: data,
    }),
    {
      input: RestoreUserRequestSchema,
      output: RestoreUserResponseSchema,
    },
  ),
};
