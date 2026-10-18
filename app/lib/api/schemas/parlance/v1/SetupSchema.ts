import { z } from "zod";

// GetSetupStatus
export const GetSetupStatusRequestSchema = z.object({});

export type GetSetupStatusRequest = z.infer<typeof GetSetupStatusRequestSchema>;

export const GetSetupStatusResponseSchema = z.object({
  needsSetup: z.boolean(),
});

export type GetSetupStatusResponse = z.infer<
  typeof GetSetupStatusResponseSchema
>;

// Initialize
export const InitializeRequestSchema = z.object({
  adminEmail: z.string(),
  adminPassword: z.string(),
  adminName: z.string(),
  deeplApiKey: z.string().optional(),
  s3Endpoint: z.string().optional(),
  s3AccessKey: z.string().optional(),
  s3SecretKey: z.string().optional(),
});

export type InitializeRequest = z.infer<typeof InitializeRequestSchema>;

export const InitializeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type InitializeResponse = z.infer<typeof InitializeResponseSchema>;
