import { authedEndpoint } from "../builder";
import {
  ListLocalesRequestSchema,
  ListLocalesResponseSchema,
  GetLocaleRequestSchema,
  GetLocaleResponseSchema,
  CreateLocaleRequestSchema,
  CreateLocaleResponseSchema,
  UpdateLocaleRequestSchema,
  UpdateLocaleResponseSchema,
  DeleteLocaleRequestSchema,
  DeleteLocaleResponseSchema,
  GetDefaultLocaleRequestSchema,
  GetDefaultLocaleResponseSchema,
  SetDefaultLocaleRequestSchema,
  SetDefaultLocaleResponseSchema,
  type ListLocalesRequest,
  type GetLocaleRequest,
  type CreateLocaleRequest,
  type UpdateLocaleRequest,
  type DeleteLocaleRequest,
  type SetDefaultLocaleRequest,
} from "../schemas/LocaleSchema";

export const locale = {
  list: authedEndpoint.query(
    (data: ListLocalesRequest) => ({
      method: "post",
      url: "/parlance.v1.LocaleService/ListLocales",
      json: data,
    }),
    {
      input: ListLocalesRequestSchema,
      output: ListLocalesResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetLocaleRequest) => ({
      method: "post",
      url: "/parlance.v1.LocaleService/GetLocale",
      json: data,
    }),
    {
      input: GetLocaleRequestSchema,
      output: GetLocaleResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateLocaleRequest) => ({
      method: "post",
      url: "/parlance.v1.LocaleService/CreateLocale",
      json: data,
    }),
    {
      input: CreateLocaleRequestSchema,
      output: CreateLocaleResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateLocaleRequest) => ({
      method: "post",
      url: "/parlance.v1.LocaleService/UpdateLocale",
      json: data,
    }),
    {
      input: UpdateLocaleRequestSchema,
      output: UpdateLocaleResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteLocaleRequest) => ({
      method: "post",
      url: "/parlance.v1.LocaleService/DeleteLocale",
      json: data,
    }),
    {
      input: DeleteLocaleRequestSchema,
      output: DeleteLocaleResponseSchema,
    },
  ),

  getDefault: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.LocaleService/GetDefaultLocale",
      json: {},
    }),
    {
      input: GetDefaultLocaleRequestSchema,
      output: GetDefaultLocaleResponseSchema,
    },
  ),

  setDefault: authedEndpoint.mutate(
    (data: SetDefaultLocaleRequest) => ({
      method: "post",
      url: "/parlance.v1.LocaleService/SetDefaultLocale",
      json: data,
    }),
    {
      input: SetDefaultLocaleRequestSchema,
      output: SetDefaultLocaleResponseSchema,
    },
  ),
};
