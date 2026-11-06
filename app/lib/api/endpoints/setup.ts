import { publicEndpoint } from "../builder";
import {
  GetSetupStatusRequestSchema,
  GetSetupStatusResponseSchema,
  InitializeRequestSchema,
  InitializeResponseSchema,
  type InitializeRequest,
} from "../schemas/parlance/v1/SetupSchema";

export const setup = {
  getStatus: publicEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.SetupService/GetSetupStatus",
      json: {},
    }),
    {
      input: GetSetupStatusRequestSchema,
      output: GetSetupStatusResponseSchema,
    },
  ),

  initialize: publicEndpoint.mutate(
    (data: InitializeRequest) => ({
      method: "post",
      url: "/parlance.v1.SetupService/Initialize",
      json: data,
    }),
    {
      input: InitializeRequestSchema,
      output: InitializeResponseSchema,
    },
  ),
};
