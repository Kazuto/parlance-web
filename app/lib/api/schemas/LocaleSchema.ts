import { z } from "zod";
import {
  FilterRequestSchema,
  PaginationRequestSchema,
  PaginationResponseSchema,
} from "./CommonSchema";

export const LocaleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  names: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullish(),
});

// List Locales
export const ListLocalesRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
  filter: FilterRequestSchema.optional(),
});

export const ListLocalesResponseSchema = z.object({
  locales: z.array(LocaleSchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Locale
export const GetLocaleRequestSchema = z.object({
  id: z.string(),
});

export const GetLocaleResponseSchema = z.object({
  locale: LocaleSchema,
});

// Create Locale
export const CreateLocaleRequestSchema = z.object({
  code: z.string(),
  names: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
});

export const CreateLocaleResponseSchema = z.object({
  locale: LocaleSchema,
});

// Update Locale
export const UpdateLocaleRequestSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  names: z.record(z.string(), z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateLocaleResponseSchema = z.object({
  locale: LocaleSchema,
});

// Delete Locale
export const DeleteLocaleRequestSchema = z.object({
  id: z.string(),
});

export const DeleteLocaleResponseSchema = z.object({});

// Get Default Locale
export const GetDefaultLocaleRequestSchema = z.object({});

export const GetDefaultLocaleResponseSchema = z.object({
  locale: LocaleSchema,
});

// Set Default Locale
export const SetDefaultLocaleRequestSchema = z.object({
  localeId: z.string(),
});

export const SetDefaultLocaleResponseSchema = z.object({
  locale: LocaleSchema,
});

// Types
export type Locale = z.infer<typeof LocaleSchema>;
export type ListLocalesRequest = z.infer<typeof ListLocalesRequestSchema>;
export type ListLocalesResponse = z.infer<typeof ListLocalesResponseSchema>;
export type GetLocaleRequest = z.infer<typeof GetLocaleRequestSchema>;
export type GetLocaleResponse = z.infer<typeof GetLocaleResponseSchema>;
export type CreateLocaleRequest = z.infer<typeof CreateLocaleRequestSchema>;
export type CreateLocaleResponse = z.infer<typeof CreateLocaleResponseSchema>;
export type UpdateLocaleRequest = z.infer<typeof UpdateLocaleRequestSchema>;
export type UpdateLocaleResponse = z.infer<typeof UpdateLocaleResponseSchema>;
export type DeleteLocaleRequest = z.infer<typeof DeleteLocaleRequestSchema>;
export type DeleteLocaleResponse = z.infer<typeof DeleteLocaleResponseSchema>;
export type GetDefaultLocaleRequest = z.infer<
  typeof GetDefaultLocaleRequestSchema
>;
export type GetDefaultLocaleResponse = z.infer<
  typeof GetDefaultLocaleResponseSchema
>;
export type SetDefaultLocaleRequest = z.infer<
  typeof SetDefaultLocaleRequestSchema
>;
export type SetDefaultLocaleResponse = z.infer<
  typeof SetDefaultLocaleResponseSchema
>;
