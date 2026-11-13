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
  CreateTagRequestSchema,
  CreateTagResponseSchema,
  UpdateTagRequestSchema,
  UpdateTagResponseSchema,
  DeleteTagRequestSchema,
  DeleteTagResponseSchema,
  type ListScopesRequest,
  type CreateScopeRequest,
  type UpdateScopeRequest,
  type DeleteScopeRequest,
  type RestoreScopeRequest,
  type CreateTagRequest,
  type UpdateTagRequest,
  type DeleteTagRequest,
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
  createTag: authedEndpoint.mutate(
    (data: CreateTagRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/CreateTag",
      json: data,
    }),
    { input: CreateTagRequestSchema, output: CreateTagResponseSchema },
  ),
  updateTag: authedEndpoint.mutate(
    (data: UpdateTagRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/UpdateTag",
      json: data,
    }),
    { input: UpdateTagRequestSchema, output: UpdateTagResponseSchema },
  ),
  deleteTag: authedEndpoint.mutate(
    (data: DeleteTagRequest) => ({
      method: "post",
      url: "/parlance.v1.ScopeService/DeleteTag",
      json: data,
    }),
    { input: DeleteTagRequestSchema, output: DeleteTagResponseSchema },
  ),
};
