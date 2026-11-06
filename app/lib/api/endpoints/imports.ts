import { authedEndpoint } from "../builder";
import {
  ImportJsonRequestSchema,
  ImportJsonResponseSchema,
  ImportPhpRequestSchema,
  ImportPhpResponseSchema,
  type ImportJsonRequest,
  type ImportPhpRequest,
  ImportPoRequestSchema,
  ImportPoResponseSchema,
  type ImportPoRequest,
  ImportZipRequestSchema,
  ImportZipResponseSchema,
  type ImportZipRequest,
} from "../schemas/parlance/v1/ImportSchema";

export const imports = {
  po: authedEndpoint.mutate(
    (data: ImportPoRequest) => ({
      method: "post",
      url: "/parlance.v1.ImportService/ImportPo",
      json: data,
    }),
    { input: ImportPoRequestSchema, output: ImportPoResponseSchema },
  ),
  json: authedEndpoint.mutate(
    (data: ImportJsonRequest) => ({
      method: "post",
      url: "/parlance.v1.ImportService/ImportJson",
      json: data,
    }),
    { input: ImportJsonRequestSchema, output: ImportJsonResponseSchema },
  ),
  php: authedEndpoint.mutate(
    (data: ImportPhpRequest) => ({
      method: "post",
      url: "/parlance.v1.ImportService/ImportPhp",
      json: data,
    }),
    { input: ImportPhpRequestSchema, output: ImportPhpResponseSchema },
  ),
  importZip: authedEndpoint.mutate(
    (data: ImportZipRequest) => ({
      method: "post",
      url: "/parlance.v1.ImportService/ImportZip",
      json: data,
    }),
    { input: ImportZipRequestSchema, output: ImportZipResponseSchema },
  ),
};
