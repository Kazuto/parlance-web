import { z } from "zod";
import {
  FilterRequestSchema,
  PaginationRequestSchema,
  PaginationResponseSchema,
} from "./CommonSchema";
import { LocalizationSchema } from "./LocalizationSchema";

export const EntrySchema = z.object({
  id: z.string(),
  key: z.string(),
  description: z.string(),
  localizations: LocalizationSchema.array(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullish(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

// List Entries
export const ListEntriesRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
  filter: FilterRequestSchema.optional(),
});

export const ListEntriesResponseSchema = z.object({
  entries: z.array(EntrySchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Entry
export const GetEntryRequestSchema = z.object({
  id: z.string(),
});

export const GetEntryResponseSchema = z.object({
  entry: EntrySchema,
});

// Create Entry
export const CreateEntryRequestSchema = z.object({
  key: z.string(),
  description: z.string(),
});

export const CreateEntryResponseSchema = z.object({
  entry: EntrySchema,
});

// Update Entry
export const UpdateEntryRequestSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
});

export const UpdateEntryResponseSchema = z.object({
  entry: EntrySchema,
});

// Delete Entry
export const DeleteEntryRequestSchema = z.object({
  id: z.string(),
});

export const DeleteEntryResponseSchema = z.object({});

// Types
export type Entry = z.infer<typeof EntrySchema>;
export type ListEntriesRequest = z.infer<typeof ListEntriesRequestSchema>;
export type ListEntriesResponse = z.infer<typeof ListEntriesResponseSchema>;
export type GetEntryRequest = z.infer<typeof GetEntryRequestSchema>;
export type GetEntryResponse = z.infer<typeof GetEntryResponseSchema>;
export type CreateEntryRequest = z.infer<typeof CreateEntryRequestSchema>;
export type CreateEntryResponse = z.infer<typeof CreateEntryResponseSchema>;
export type UpdateEntryRequest = z.infer<typeof UpdateEntryRequestSchema>;
export type UpdateEntryResponse = z.infer<typeof UpdateEntryResponseSchema>;
export type DeleteEntryRequest = z.infer<typeof DeleteEntryRequestSchema>;
export type DeleteEntryResponse = z.infer<typeof DeleteEntryResponseSchema>;
