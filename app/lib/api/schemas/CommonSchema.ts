import { z } from "zod";

export const PaginationRequestSchema = z.object({
  page: z.number().int().optional(),
  perPage: z.number().int().optional(),
});

export const PaginationResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
  totalPages: z.number().int(),
});

export const FilterRequestSchema = z.object({
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.union([z.literal("asc"), z.literal("desc")]).optional(),
  includeDeleted: z.boolean().optional(),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
export type FilterRequest = z.infer<typeof FilterRequestSchema>;
