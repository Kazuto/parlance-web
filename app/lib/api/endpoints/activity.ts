import { authedEndpoint } from "../builder";
import {
  ListRecentActivityRequestSchema,
  ListRecentActivityResponseSchema,
  type ListRecentActivityRequest,
} from "../schemas/parlance/v1/ActivitySchema";

export const activity = {
  recent: authedEndpoint.query(
    (data: ListRecentActivityRequest) => ({
      method: "post",
      url: "/parlance.v1.ActivityService/ListRecentActivity",
      json: data,
    }),
    {
      input: ListRecentActivityRequestSchema,
      output: ListRecentActivityResponseSchema,
    },
  ),
};
