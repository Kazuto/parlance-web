import { authedEndpoint, publicEndpoint } from "../builder";
import {
  RegisterRequestSchema,
  RegisterResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RefreshTokenRequestSchema,
  RefreshTokenResponseSchema,
  LogoutRequestSchema,
  LogoutResponseSchema,
  GetCurrentUserRequestSchema,
  GetCurrentUserResponseSchema,
  type RegisterRequest,
  type LoginRequest,
  type RefreshTokenRequest,
} from "../schemas/AuthSchema";

export const auth = {
  register: publicEndpoint.mutate(
    (data: RegisterRequest) => ({
      method: "post",
      url: "/parlance.v1.AuthService/Register",
      json: data,
    }),
    {
      input: RegisterRequestSchema,
      output: RegisterResponseSchema,
    },
  ),

  login: publicEndpoint.mutate(
    (data: LoginRequest) => ({
      method: "post",
      url: "/parlance.v1.AuthService/Login",
      json: data,
    }),
    {
      input: LoginRequestSchema,
      output: LoginResponseSchema,
    },
  ),

  refreshToken: publicEndpoint.mutate(
    (data: RefreshTokenRequest) => ({
      method: "post",
      url: "/parlance.v1.AuthService/RefreshToken",
      json: data,
    }),
    {
      input: RefreshTokenRequestSchema,
      output: RefreshTokenResponseSchema,
    },
  ),

  logout: authedEndpoint.mutate(
    () => ({
      method: "post",
      url: "/parlance.v1.AuthService/Logout",
      json: {},
    }),
    {
      input: LogoutRequestSchema,
      output: LogoutResponseSchema,
    },
  ),

  getCurrentUser: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.AuthService/GetCurrentUser",
      json: {},
    }),
    {
      input: GetCurrentUserRequestSchema,
      output: GetCurrentUserResponseSchema,
    },
  ),
};
