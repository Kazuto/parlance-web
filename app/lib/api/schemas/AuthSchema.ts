import { z } from "zod";
import { UserSchema } from "./UserSchema";

// Register
export const RegisterRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const RegisterResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

// Login
export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

// Refresh Token
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

// Logout
export const LogoutRequestSchema = z.object({});
export const LogoutResponseSchema = z.object({});

// Get Current User
export const GetCurrentUserRequestSchema = z.object({});
export const GetCurrentUserResponseSchema = z.object({
  user: UserSchema,
});

// Types
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type GetCurrentUserResponse = z.infer<
  typeof GetCurrentUserResponseSchema
>;
