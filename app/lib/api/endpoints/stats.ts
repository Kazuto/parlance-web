import { authedEndpoint } from "../builder";
import {
  GetStatsRequestSchema,
  GetStatsResponseSchema,
  type GetStatsRequest,
} from "../schemas/parlance/v1/StatsSchema";

export const stats = {
  get: authedEndpoint.query(
    (data: GetStatsRequest) => ({
      method: "post",
      url: "/parlance.v1.StatsService/GetStats",
      json: data,
    }),
    {
      input: GetStatsRequestSchema,
      output: GetStatsResponseSchema,
    },
  ),
};
