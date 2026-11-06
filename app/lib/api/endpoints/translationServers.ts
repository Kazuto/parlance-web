import { authedEndpoint } from "../builder";
import {
  ListTranslationServersRequestSchema,
  ListTranslationServersResponseSchema,
  CreateTranslationServerRequestSchema,
  CreateTranslationServerResponseSchema,
  UpdateTranslationServerRequestSchema,
  UpdateTranslationServerResponseSchema,
  DeleteTranslationServerRequestSchema,
  DeleteTranslationServerResponseSchema,
  TestTranslationServerRequestSchema,
  TestTranslationServerResponseSchema,
  GetTranslationSettingsRequestSchema,
  GetTranslationSettingsResponseSchema,
  UpdateTranslationSettingsRequestSchema,
  UpdateTranslationSettingsResponseSchema,
  type CreateTranslationServerRequest,
  type UpdateTranslationServerRequest,
  type DeleteTranslationServerRequest,
  type TestTranslationServerRequest,
  type UpdateTranslationSettingsRequest,
} from "../schemas/parlance/v1/TranslationServerSchema";

export const translationServers = {
  list: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/ListTranslationServers",
      json: {},
    }),
    {
      input: ListTranslationServersRequestSchema,
      output: ListTranslationServersResponseSchema,
    },
  ),
  create: authedEndpoint.mutate(
    (data: CreateTranslationServerRequest) => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/CreateTranslationServer",
      json: data,
    }),
    {
      input: CreateTranslationServerRequestSchema,
      output: CreateTranslationServerResponseSchema,
    },
  ),
  update: authedEndpoint.mutate(
    (data: UpdateTranslationServerRequest) => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/UpdateTranslationServer",
      json: data,
    }),
    {
      input: UpdateTranslationServerRequestSchema,
      output: UpdateTranslationServerResponseSchema,
    },
  ),
  delete: authedEndpoint.mutate(
    (data: DeleteTranslationServerRequest) => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/DeleteTranslationServer",
      json: data,
    }),
    {
      input: DeleteTranslationServerRequestSchema,
      output: DeleteTranslationServerResponseSchema,
    },
  ),
  test: authedEndpoint.mutate(
    (data: TestTranslationServerRequest) => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/TestTranslationServer",
      json: data,
    }),
    {
      input: TestTranslationServerRequestSchema,
      output: TestTranslationServerResponseSchema,
    },
  ),
  settings: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/GetTranslationSettings",
      json: {},
    }),
    {
      input: GetTranslationSettingsRequestSchema,
      output: GetTranslationSettingsResponseSchema,
    },
  ),
  updateSettings: authedEndpoint.mutate(
    (data: UpdateTranslationSettingsRequest) => ({
      method: "post",
      url: "/parlance.v1.TranslationServerService/UpdateTranslationSettings",
      json: data,
    }),
    {
      input: UpdateTranslationSettingsRequestSchema,
      output: UpdateTranslationSettingsResponseSchema,
    },
  ),
};
