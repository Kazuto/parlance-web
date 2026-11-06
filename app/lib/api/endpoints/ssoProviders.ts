import { authedEndpoint } from "../builder";
import {
  ListSsoProvidersRequestSchema,
  ListSsoProvidersResponseSchema,
  CreateSsoProviderRequestSchema,
  CreateSsoProviderResponseSchema,
  UpdateSsoProviderRequestSchema,
  UpdateSsoProviderResponseSchema,
  DeleteSsoProviderRequestSchema,
  DeleteSsoProviderResponseSchema,
  TestSsoProviderRequestSchema,
  TestSsoProviderResponseSchema,
  type CreateSsoProviderRequest,
  type UpdateSsoProviderRequest,
  type DeleteSsoProviderRequest,
  type TestSsoProviderRequest,
} from "../schemas/parlance/v1/SsoSchema";

export const ssoProviders = {
  list: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.SsoProviderService/ListSsoProviders",
      json: {},
    }),
    {
      input: ListSsoProvidersRequestSchema,
      output: ListSsoProvidersResponseSchema,
    },
  ),
  create: authedEndpoint.mutate(
    (data: CreateSsoProviderRequest) => ({
      method: "post",
      url: "/parlance.v1.SsoProviderService/CreateSsoProvider",
      json: data,
    }),
    {
      input: CreateSsoProviderRequestSchema,
      output: CreateSsoProviderResponseSchema,
    },
  ),
  update: authedEndpoint.mutate(
    (data: UpdateSsoProviderRequest) => ({
      method: "post",
      url: "/parlance.v1.SsoProviderService/UpdateSsoProvider",
      json: data,
    }),
    {
      input: UpdateSsoProviderRequestSchema,
      output: UpdateSsoProviderResponseSchema,
    },
  ),
  delete: authedEndpoint.mutate(
    (data: DeleteSsoProviderRequest) => ({
      method: "post",
      url: "/parlance.v1.SsoProviderService/DeleteSsoProvider",
      json: data,
    }),
    {
      input: DeleteSsoProviderRequestSchema,
      output: DeleteSsoProviderResponseSchema,
    },
  ),
  test: authedEndpoint.mutate(
    (data: TestSsoProviderRequest) => ({
      method: "post",
      url: "/parlance.v1.SsoProviderService/TestSsoProvider",
      json: data,
    }),
    {
      input: TestSsoProviderRequestSchema,
      output: TestSsoProviderResponseSchema,
    },
  ),
};
