import { z } from "zod";
import {
  FilterRequestSchema,
  PaginationRequestSchema,
  PaginationResponseSchema,
} from "./CommonSchema";
import { DefinitionSchema } from "./DefinitionSchema";

export const TerminologySchema = z.object({
  id: z.string(),
  term: z.string(),
  description: z.string(),
  definitions: DefinitionSchema.array(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullish(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

// List Terminologies
export const ListTerminologiesRequestSchema = z.object({
  pagination: PaginationRequestSchema.optional(),
  filter: FilterRequestSchema.optional(),
});

export const ListTerminologiesResponseSchema = z.object({
  terminologies: z.array(TerminologySchema),
  pagination: PaginationResponseSchema.optional(),
});

// Get Terminology
export const GetTerminologyRequestSchema = z.object({
  id: z.string(),
});

export const GetTerminologyResponseSchema = z.object({
  terminology: TerminologySchema,
});

// Create Terminology
export const CreateTerminologyRequestSchema = z.object({
  term: z.string(),
  description: z.string(),
});

export const CreateTerminologyResponseSchema = z.object({
  terminology: TerminologySchema,
});

// Update Terminology
export const UpdateTerminologyRequestSchema = z.object({
  id: z.string(),
  term: z.string().optional(),
  description: z.string().optional(),
});

export const UpdateTerminologyResponseSchema = z.object({
  terminology: TerminologySchema,
});

// Delete Terminology
export const DeleteTerminologyRequestSchema = z.object({
  id: z.string(),
});

export const DeleteTerminologyResponseSchema = z.object({});

// Types
export type Terminology = z.infer<typeof TerminologySchema>;
export type ListTerminologiesRequest = z.infer<
  typeof ListTerminologiesRequestSchema
>;
export type ListTerminologiesResponse = z.infer<
  typeof ListTerminologiesResponseSchema
>;
export type GetTerminologyRequest = z.infer<typeof GetTerminologyRequestSchema>;
export type GetTerminologyResponse = z.infer<
  typeof GetTerminologyResponseSchema
>;
export type CreateTerminologyRequest = z.infer<
  typeof CreateTerminologyRequestSchema
>;
export type CreateTerminologyResponse = z.infer<
  typeof CreateTerminologyResponseSchema
>;
export type UpdateTerminologyRequest = z.infer<
  typeof UpdateTerminologyRequestSchema
>;
export type UpdateTerminologyResponse = z.infer<
  typeof UpdateTerminologyResponseSchema
>;
export type DeleteTerminologyRequest = z.infer<
  typeof DeleteTerminologyRequestSchema
>;
export type DeleteTerminologyResponse = z.infer<
  typeof DeleteTerminologyResponseSchema
>;
