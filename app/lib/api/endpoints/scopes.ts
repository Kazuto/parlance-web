import { authedEndpoint } from "../builder";
import {
  ListScopesRequestSchema,
  ListScopesResponseSchema,
  type ListScopesRequest,
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
};
