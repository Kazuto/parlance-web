import { authedEndpoint } from "../builder";
import {
  ExportJsonRequestSchema,
  ExportJsonResponseSchema,
  ExportPhpRequestSchema,
  ExportPhpResponseSchema,
  type ExportJsonRequest,
  type ExportPhpRequest,
  ExportPoRequestSchema,
  ExportPoResponseSchema,
  type ExportPoRequest,
  ExportZipRequestSchema,
  ExportZipResponseSchema,
  type ExportZipRequest,
} from "../schemas/parlance/v1/ExportSchema";

export const exports = {
  po: authedEndpoint.mutate(
    (data: ExportPoRequest) => ({
      method: "post",
      url: "/parlance.v1.ExportService/ExportPo",
      json: data,
    }),
    { input: ExportPoRequestSchema, output: ExportPoResponseSchema },
  ),
  json: authedEndpoint.mutate(
    (data: ExportJsonRequest) => ({
      method: "post",
      url: "/parlance.v1.ExportService/ExportJson",
      json: data,
    }),
    { input: ExportJsonRequestSchema, output: ExportJsonResponseSchema },
  ),
  php: authedEndpoint.mutate(
    (data: ExportPhpRequest) => ({
      method: "post",
      url: "/parlance.v1.ExportService/ExportPhp",
      json: data,
    }),
    { input: ExportPhpRequestSchema, output: ExportPhpResponseSchema },
  ),
  exportZip: authedEndpoint.mutate(
    (data: ExportZipRequest) => ({
      method: "post",
      url: "/parlance.v1.ExportService/ExportZip",
      json: data,
    }),
    { input: ExportZipRequestSchema, output: ExportZipResponseSchema },
  ),
};
