import { authedEndpoint } from "../builder";
import {
  ListScopesRequestSchema,
  ListScopesResponseSchema,
  CreateScopeRequestSchema,
  CreateScopeResponseSchema,
  UpdateScopeRequestSchema,
  UpdateScopeResponseSchema,
  DeleteScopeRequestSchema,
  DeleteScopeResponseSchema,
  RestoreScopeRequestSchema,
  RestoreScopeResponseSchema,
  type ListScopesRequest,
  type CreateScopeRequest,
  type UpdateScopeRequest,
  type DeleteScopeRequest,
  type RestoreScopeRequest,
} from "../schemas/parlance/v1/ScopeSchema";

export const scopes = {
  list: authedEndpoint.query(
    (data: ListScopesRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/ListScopes",
      json: data,
    }),
    { input: ListScopesRequestSchema, output: ListScopesResponseSchema },
  ),
  create: authedEndpoint.mutate(
    (data: CreateScopeRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/CreateScope",
      json: data,
    }),
    { input: CreateScopeRequestSchema, output: CreateScopeResponseSchema },
  ),
  update: authedEndpoint.mutate(
    (data: UpdateScopeRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/UpdateScope",
      json: data,
    }),
    { input: UpdateScopeRequestSchema, output: UpdateScopeResponseSchema },
  ),
  delete: authedEndpoint.mutate(
    (data: DeleteScopeRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/DeleteScope",
      json: data,
    }),
    { input: DeleteScopeRequestSchema, output: DeleteScopeResponseSchema },
  ),
  restore: authedEndpoint.mutate(
    (data: RestoreScopeRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/RestoreScope",
      json: data,
    }),
    { input: RestoreScopeRequestSchema, output: RestoreScopeResponseSchema },
  ),
};
