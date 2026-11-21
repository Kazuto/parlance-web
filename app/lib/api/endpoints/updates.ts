import { authedEndpoint } from "../builder";
import {
  GetUpdatesRequestSchema,
  GetUpdatesResponseSchema,
  type GetUpdatesRequest,
} from "../schemas/parlance/v1/UpdateSchema";

export const updates = {
  get: authedEndpoint.query(
    (data: GetUpdatesRequest) => ({
      method: "post",
      url: "/parlance.v1.UpdateService/GetUpdates",
      json: data,
    }),
    {
      input: GetUpdatesRequestSchema,
      output: GetUpdatesResponseSchema,
    },
  ),
};
