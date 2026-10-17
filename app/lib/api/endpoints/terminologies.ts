import { authedEndpoint } from "../builder";
import {
  ListTerminologiesRequestSchema,
  ListTerminologiesResponseSchema,
  GetTerminologyRequestSchema,
  GetTerminologyResponseSchema,
  CreateTerminologyRequestSchema,
  CreateTerminologyResponseSchema,
  UpdateTerminologyRequestSchema,
  UpdateTerminologyResponseSchema,
  DeleteTerminologyRequestSchema,
  DeleteTerminologyResponseSchema,
  type ListTerminologiesRequest,
  type GetTerminologyRequest,
  type CreateTerminologyRequest,
  type UpdateTerminologyRequest,
  type DeleteTerminologyRequest,
  type RestoreTerminologyRequest,
  RestoreTerminologyResponseSchema,
  RestoreTerminologyRequestSchema,
  SuggestTerminologiesRequestSchema,
  SuggestTerminologiesResponseSchema,
  type SuggestTerminologiesRequest,
  GetDefinitionHistoryRequestSchema,
  GetDefinitionHistoryResponseSchema,
  type GetDefinitionHistoryRequest,
} from "../schemas/parlance/v1/TerminologySchema";

export const terminologies = {
  history: authedEndpoint.query(
    (data: GetDefinitionHistoryRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/GetDefinitionHistory",
      json: data,
    }),
    {
      input: GetDefinitionHistoryRequestSchema,
      output: GetDefinitionHistoryResponseSchema,
    },
  ),
  suggest: authedEndpoint.query(
    (data: SuggestTerminologiesRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/SuggestTerminologies",
      json: data,
    }),
    {
      input: SuggestTerminologiesRequestSchema,
      output: SuggestTerminologiesResponseSchema,
    },
  ),
  list: authedEndpoint.query(
    (data: ListTerminologiesRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/ListTerminologies",
      json: data,
    }),
    {
      input: ListTerminologiesRequestSchema,
      output: ListTerminologiesResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetTerminologyRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/GetTerminology",
      json: data,
    }),
    {
      input: GetTerminologyRequestSchema,
      output: GetTerminologyResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateTerminologyRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/CreateTerminology",
      json: data,
    }),
    {
      input: CreateTerminologyRequestSchema,
      output: CreateTerminologyResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateTerminologyRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/UpdateTerminology",
      json: data,
    }),
    {
      input: UpdateTerminologyRequestSchema,
      output: UpdateTerminologyResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteTerminologyRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/DeleteTerminology",
      json: data,
    }),
    {
      input: DeleteTerminologyRequestSchema,
      output: DeleteTerminologyResponseSchema,
    },
  ),

  restore: authedEndpoint.mutate(
    (data: RestoreTerminologyRequest) => ({
      method: "post",
      url: "/parlance.v1.TerminologyService/RestoreTerminology",
      json: data,
    }),
    {
      input: RestoreTerminologyRequestSchema,
      output: RestoreTerminologyResponseSchema,
    },
  ),
};
