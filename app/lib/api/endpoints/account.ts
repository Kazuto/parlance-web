import { authedEndpoint } from "../builder";
import {
  UpdateAccountRequestSchema,
  UpdateAccountResponseSchema,
  ChangePasswordRequestSchema,
  ChangePasswordResponseSchema,
  type UpdateAccountRequest,
  type ChangePasswordRequest,
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
};
