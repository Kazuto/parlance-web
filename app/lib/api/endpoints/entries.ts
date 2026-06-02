import { authedEndpoint } from "../builder";
import {
  ListEntriesRequestSchema,
  ListEntriesResponseSchema,
  GetEntryRequestSchema,
  GetEntryResponseSchema,
  CreateEntryRequestSchema,
  CreateEntryResponseSchema,
  UpdateEntryRequestSchema,
  UpdateEntryResponseSchema,
  DeleteEntryRequestSchema,
  DeleteEntryResponseSchema,
  type ListEntriesRequest,
  type GetEntryRequest,
  type CreateEntryRequest,
  type UpdateEntryRequest,
  type DeleteEntryRequest,
} from "../schemas/EntrySchema";

export const entries = {
  list: authedEndpoint.query(
    (data: ListEntriesRequest) => ({
      method: "post",
      url: "/parlance.v1.EntryService/ListEntries",
      json: data,
    }),
    {
      input: ListEntriesRequestSchema,
      output: ListEntriesResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetEntryRequest) => ({
      method: "post",
      url: "/parlance.v1.EntryService/GetEntry",
      json: data,
    }),
    {
      input: GetEntryRequestSchema,
      output: GetEntryResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateEntryRequest) => ({
      method: "post",
      url: "/parlance.v1.EntryService/CreateEntry",
      json: data,
    }),
    {
      input: CreateEntryRequestSchema,
      output: CreateEntryResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateEntryRequest) => ({
      method: "post",
      url: "/parlance.v1.EntryService/UpdateEntry",
      json: data,
    }),
    {
      input: UpdateEntryRequestSchema,
      output: UpdateEntryResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteEntryRequest) => ({
      method: "post",
      url: "/parlance.v1.EntryService/DeleteEntry",
      json: data,
    }),
    {
      input: DeleteEntryRequestSchema,
      output: DeleteEntryResponseSchema,
    },
  ),
};
