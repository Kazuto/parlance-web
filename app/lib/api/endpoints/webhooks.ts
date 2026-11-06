import { authedEndpoint } from "../builder";
import {
  ListWebhooksRequestSchema,
  ListWebhooksResponseSchema,
  CreateWebhookRequestSchema,
  CreateWebhookResponseSchema,
  UpdateWebhookRequestSchema,
  UpdateWebhookResponseSchema,
  DeleteWebhookRequestSchema,
  DeleteWebhookResponseSchema,
  TestWebhookRequestSchema,
  TestWebhookResponseSchema,
  ListWebhookDeliveriesRequestSchema,
  ListWebhookDeliveriesResponseSchema,
  GetWebhookDeliveryRequestSchema,
  GetWebhookDeliveryResponseSchema,
  RedeliverWebhookDeliveryRequestSchema,
  RedeliverWebhookDeliveryResponseSchema,
  type CreateWebhookRequest,
  type UpdateWebhookRequest,
  type DeleteWebhookRequest,
  type TestWebhookRequest,
  type ListWebhookDeliveriesRequest,
  type GetWebhookDeliveryRequest,
  type RedeliverWebhookDeliveryRequest,
} from "../schemas/parlance/v1/WebhookSchema";

export const webhooks = {
  list: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.WebhookService/ListWebhooks",
      json: {},
    }),
    { input: ListWebhooksRequestSchema, output: ListWebhooksResponseSchema },
  ),
  create: authedEndpoint.mutate(
    (data: CreateWebhookRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/CreateWebhook",
      json: data,
    }),
    { input: CreateWebhookRequestSchema, output: CreateWebhookResponseSchema },
  ),
  update: authedEndpoint.mutate(
    (data: UpdateWebhookRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/UpdateWebhook",
      json: data,
    }),
    { input: UpdateWebhookRequestSchema, output: UpdateWebhookResponseSchema },
  ),
  delete: authedEndpoint.mutate(
    (data: DeleteWebhookRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/DeleteWebhook",
      json: data,
    }),
    { input: DeleteWebhookRequestSchema, output: DeleteWebhookResponseSchema },
  ),
  test: authedEndpoint.mutate(
    (data: TestWebhookRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/TestWebhook",
      json: data,
    }),
    { input: TestWebhookRequestSchema, output: TestWebhookResponseSchema },
  ),
  deliveries: authedEndpoint.query(
    (data: ListWebhookDeliveriesRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/ListWebhookDeliveries",
      json: data,
    }),
    {
      input: ListWebhookDeliveriesRequestSchema,
      output: ListWebhookDeliveriesResponseSchema,
    },
  ),
  getDelivery: authedEndpoint.query(
    (data: GetWebhookDeliveryRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/GetWebhookDelivery",
      json: data,
    }),
    {
      input: GetWebhookDeliveryRequestSchema,
      output: GetWebhookDeliveryResponseSchema,
    },
  ),
  redeliver: authedEndpoint.mutate(
    (data: RedeliverWebhookDeliveryRequest) => ({
      method: "post",
      url: "/parlance.v1.WebhookService/RedeliverWebhookDelivery",
      json: data,
    }),
    {
      input: RedeliverWebhookDeliveryRequestSchema,
      output: RedeliverWebhookDeliveryResponseSchema,
    },
  ),
};
