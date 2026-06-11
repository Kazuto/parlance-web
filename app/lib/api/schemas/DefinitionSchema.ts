import { z } from "zod";
import {
  FilterRequestSchema,
  PaginationRequestSchema,
  PaginationResponseSchema,
} from "./CommonSchema";

export const DefinitionSchema = z.object({
  id: z.string(),
  terminologyId: z.string(),
  localeId: z.string(),
  translation: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullish(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

// List Definitions
export const ListDefinitionsRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
  filter: FilterRequestSchema.optional(),
});

export const ListDefinitionsResponseSchema = z.object({
  definitions: z.array(DefinitionSchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Definition
export const GetDefinitionRequestSchema = z.object({
  id: z.string(),
});

export const GetDefinitionResponseSchema = z.object({
  definition: DefinitionSchema,
});

// Create Definition
export const CreateDefinitionRequestSchema = z.object({
  terminologyId: z.string(),
  localeId: z.string(),
  translation: z.string(),
});

export const CreateDefinitionResponseSchema = z.object({
  definition: DefinitionSchema,
});

// Update Definition
export const UpdateDefinitionRequestSchema = z.object({
  id: z.string(),
  translation: z.string().optional(),
});

export const UpdateDefinitionResponseSchema = z.object({
  definition: DefinitionSchema,
});

// Delete Definition
export const DeleteDefinitionRequestSchema = z.object({
  id: z.string(),
});

export const DeleteDefinitionResponseSchema = z.object({});

// Restore Definition
export const RestoreDefinitionRequestSchema = z.object({
  id: z.string(),
});

export const RestoreDefinitionResponseSchema = z.object({
  definition: DefinitionSchema,
});

// Types
export type Definition = z.infer<typeof DefinitionSchema>;
export type ListDefinitionsRequest = z.infer<
  typeof ListDefinitionsRequestSchema
>;
export type ListDefinitionsResponse = z.infer<
  typeof ListDefinitionsResponseSchema
>;
export type GetDefinitionRequest = z.infer<typeof GetDefinitionRequestSchema>;
export type GetDefinitionResponse = z.infer<typeof GetDefinitionResponseSchema>;
export type CreateDefinitionRequest = z.infer<
  typeof CreateDefinitionRequestSchema
>;
export type CreateDefinitionResponse = z.infer<
  typeof CreateDefinitionResponseSchema
>;
export type UpdateDefinitionRequest = z.infer<
  typeof UpdateDefinitionRequestSchema
>;
export type UpdateDefinitionResponse = z.infer<
  typeof UpdateDefinitionResponseSchema
>;
export type DeleteDefinitionRequest = z.infer<
  typeof DeleteDefinitionRequestSchema
>;
export type DeleteDefinitionResponse = z.infer<
  typeof DeleteDefinitionResponseSchema
>;
export type RestoreDefinitionRequest = z.infer<
  typeof RestoreDefinitionRequestSchema
>;
export type RestoreDefinitionResponse = z.infer<
  typeof RestoreDefinitionResponseSchema
>;
