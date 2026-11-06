import { authedEndpoint } from "../builder";
import {
  UpdateAccountRequestSchema,
  UpdateAccountResponseSchema,
  ChangePasswordRequestSchema,
  ChangePasswordResponseSchema,
  type UpdateAccountRequest,
  type ChangePasswordRequest,
  ListApiTokensRequestSchema,
  ListApiTokensResponseSchema,
  CreateApiTokenRequestSchema,
  CreateApiTokenResponseSchema,
  DeleteApiTokenRequestSchema,
  DeleteApiTokenResponseSchema,
  type CreateApiTokenRequest,
  type DeleteApiTokenRequest,
} from "../schemas/parlance/v1/AccountSchema";

export const account = {
  update: authedEndpoint.mutate(
    (data: UpdateAccountRequest) => ({
      method: "post",
      url: "/parlance.v1.AccountService/UpdateAccount",
      json: data,
    }),
    { input: UpdateAccountRequestSchema, output: UpdateAccountResponseSchema },
  ),
  changePassword: authedEndpoint.mutate(
    (data: ChangePasswordRequest) => ({
      method: "post",
      url: "/parlance.v1.AccountService/ChangePassword",
      json: data,
    }),
    {
      input: ChangePasswordRequestSchema,
      output: ChangePasswordResponseSchema,
    },
  ),
  apiTokens: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.AccountService/ListApiTokens",
      json: {},
    }),
    { input: ListApiTokensRequestSchema, output: ListApiTokensResponseSchema },
  ),
  createApiToken: authedEndpoint.mutate(
    (data: CreateApiTokenRequest) => ({
      method: "post",
      url: "/parlance.v1.AccountService/CreateApiToken",
      json: data,
    }),
    {
      input: CreateApiTokenRequestSchema,
      output: CreateApiTokenResponseSchema,
    },
  ),
  deleteApiToken: authedEndpoint.mutate(
    (data: DeleteApiTokenRequest) => ({
      method: "post",
      url: "/parlance.v1.AccountService/DeleteApiToken",
      json: data,
    }),
    {
      input: DeleteApiTokenRequestSchema,
      output: DeleteApiTokenResponseSchema,
    },
  ),
};
