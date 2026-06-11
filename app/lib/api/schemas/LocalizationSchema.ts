import { z } from "zod";
import {
  FilterRequestSchema,
  PaginationRequestSchema,
  PaginationResponseSchema,
} from "./CommonSchema";

export const LocalizationSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  localeId: z.string(),
  translation: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullish(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

// List Localizations
export const ListLocalizationsRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
  filter: FilterRequestSchema.optional(),
});

export const ListLocalizationsResponseSchema = z.object({
  localizations: z.array(LocalizationSchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Localization
export const GetLocalizationRequestSchema = z.object({
  id: z.string(),
});

export const GetLocalizationResponseSchema = z.object({
  localization: LocalizationSchema,
});

// Create Localization
export const CreateLocalizationRequestSchema = z.object({
  entryId: z.string(),
  localeId: z.string(),
  translation: z.string(),
});

export const CreateLocalizationResponseSchema = z.object({
  localization: LocalizationSchema,
});

// Update Localization
export const UpdateLocalizationRequestSchema = z.object({
  id: z.string(),
  translation: z.string().optional(),
});

export const UpdateLocalizationResponseSchema = z.object({
  localization: LocalizationSchema,
});

// Delete Localization
export const DeleteLocalizationRequestSchema = z.object({
  id: z.string(),
});

export const DeleteLocalizationResponseSchema = z.object({});

// Types
export type Localization = z.infer<typeof LocalizationSchema>;
export type ListLocalizationsRequest = z.infer<
  typeof ListLocalizationsRequestSchema
>;
export type ListLocalizationsResponse = z.infer<
  typeof ListLocalizationsResponseSchema
>;
export type GetLocalizationRequest = z.infer<
  typeof GetLocalizationRequestSchema
>;
export type GetLocalizationResponse = z.infer<
  typeof GetLocalizationResponseSchema
>;
export type CreateLocalizationRequest = z.infer<
  typeof CreateLocalizationRequestSchema
>;
export type CreateLocalizationResponse = z.infer<
  typeof CreateLocalizationResponseSchema
>;
export type UpdateLocalizationRequest = z.infer<
  typeof UpdateLocalizationRequestSchema
>;
export type UpdateLocalizationResponse = z.infer<
  typeof UpdateLocalizationResponseSchema
>;
export type DeleteLocalizationRequest = z.infer<
  typeof DeleteLocalizationRequestSchema
>;
export type DeleteLocalizationResponse = z.infer<
  typeof DeleteLocalizationResponseSchema
>;
