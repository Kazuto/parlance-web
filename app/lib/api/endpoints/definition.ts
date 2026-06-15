import { authedEndpoint } from "../builder";
import {
  ListDefinitionsRequestSchema,
  ListDefinitionsResponseSchema,
  GetDefinitionRequestSchema,
  GetDefinitionResponseSchema,
  CreateDefinitionRequestSchema,
  CreateDefinitionResponseSchema,
  UpdateDefinitionRequestSchema,
  UpdateDefinitionResponseSchema,
  DeleteDefinitionRequestSchema,
  DeleteDefinitionResponseSchema,
  type ListDefinitionsRequest,
  type GetDefinitionRequest,
  type CreateDefinitionRequest,
  type UpdateDefinitionRequest,
  type DeleteDefinitionRequest,
} from "../schemas/DefinitionSchema";

export const definitions = {
  list: authedEndpoint.query(
    (data: ListDefinitionsRequest) => ({
      method: "post",
      url: "/parlance.v1.DefinitionService/ListDefinitions",
      json: data,
    }),
    {
      input: ListDefinitionsRequestSchema,
      output: ListDefinitionsResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetDefinitionRequest) => ({
      method: "post",
      url: "/parlance.v1.DefinitionService/GetDefinition",
      json: data,
    }),
    {
      input: GetDefinitionRequestSchema,
      output: GetDefinitionResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateDefinitionRequest) => ({
      method: "post",
      url: "/parlance.v1.DefinitionService/CreateDefinition",
      json: data,
    }),
    {
      input: CreateDefinitionRequestSchema,
      output: CreateDefinitionResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateDefinitionRequest) => ({
      method: "post",
      url: "/parlance.v1.DefinitionService/UpdateDefinition",
      json: data,
    }),
    {
      input: UpdateDefinitionRequestSchema,
      output: UpdateDefinitionResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteDefinitionRequest) => ({
      method: "post",
      url: "/parlance.v1.DefinitionService/DeleteDefinition",
      json: data,
    }),
    {
      input: DeleteDefinitionRequestSchema,
      output: DeleteDefinitionResponseSchema,
    },
  ),
};
