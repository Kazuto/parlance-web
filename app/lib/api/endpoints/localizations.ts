import { authedEndpoint } from "../builder";
import {
  ListLocalizationsRequestSchema,
  ListLocalizationsResponseSchema,
  GetLocalizationRequestSchema,
  GetLocalizationResponseSchema,
  CreateLocalizationRequestSchema,
  CreateLocalizationResponseSchema,
  UpdateLocalizationRequestSchema,
  UpdateLocalizationResponseSchema,
  DeleteLocalizationRequestSchema,
  DeleteLocalizationResponseSchema,
  type ListLocalizationsRequest,
  type GetLocalizationRequest,
  type CreateLocalizationRequest,
  type UpdateLocalizationRequest,
  type DeleteLocalizationRequest,
  RestoreLocalizationRequestSchema,
  RestoreLocalizationResponseSchema,
  type RestoreLocalizationRequest,
} from "../schemas/LocalizationSchema";

export const localizations = {
  list: authedEndpoint.query(
    (data: ListLocalizationsRequest) => ({
      method: "post",
      url: "/parlance.v1.LocalizationService/ListLocalizations",
      json: data,
    }),
    {
      input: ListLocalizationsRequestSchema,
      output: ListLocalizationsResponseSchema,
    },
  ),

  get: authedEndpoint.query(
    (data: GetLocalizationRequest) => ({
      method: "post",
      url: "/parlance.v1.LocalizationService/GetLocalization",
      json: data,
    }),
    {
      input: GetLocalizationRequestSchema,
      output: GetLocalizationResponseSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: CreateLocalizationRequest) => ({
      method: "post",
      url: "/parlance.v1.LocalizationService/CreateLocalization",
      json: data,
    }),
    {
      input: CreateLocalizationRequestSchema,
      output: CreateLocalizationResponseSchema,
    },
  ),

  update: authedEndpoint.mutate(
    (data: UpdateLocalizationRequest) => ({
      method: "post",
      url: "/parlance.v1.LocalizationService/UpdateLocalization",
      json: data,
    }),
    {
      input: UpdateLocalizationRequestSchema,
      output: UpdateLocalizationResponseSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (data: DeleteLocalizationRequest) => ({
      method: "post",
      url: "/parlance.v1.LocalizationService/DeleteLocalization",
      json: data,
    }),
    {
      input: DeleteLocalizationRequestSchema,
      output: DeleteLocalizationResponseSchema,
    },
  ),

  restore: authedEndpoint.mutate(
    (data: RestoreLocalizationRequest) => ({
      method: "post",
      url: "/parlance.v1.LocalizationService/RestoreLocalization",
      json: data,
    }),
    {
      input: RestoreLocalizationRequestSchema,
      output: RestoreLocalizationResponseSchema,
    },
  ),
};
