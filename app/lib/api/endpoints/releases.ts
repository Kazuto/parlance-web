import { authedEndpoint } from "../builder";
import {
  ListReleasesRequestSchema,
  ListReleasesResponseSchema,
  CreateReleaseRequestSchema,
  CreateReleaseResponseSchema,
  UpdateReleaseRequestSchema,
  UpdateReleaseResponseSchema,
  DeleteReleaseRequestSchema,
  DeleteReleaseResponseSchema,
  PublishReleaseRequestSchema,
  PublishReleaseResponseSchema,
  type ListReleasesRequest,
  type CreateReleaseRequest,
  type UpdateReleaseRequest,
  type DeleteReleaseRequest,
  type PublishReleaseRequest,
} from "../schemas/parlance/v1/ReleaseSchema";

export const releases = {
  list: authedEndpoint.query(
    (data: ListReleasesRequest) => ({
      method: "post",
      url: "/parlance.v1.ReleaseService/ListReleases",
      json: data,
    }),
    { input: ListReleasesRequestSchema, output: ListReleasesResponseSchema },
  ),
  create: authedEndpoint.mutate(
    (data: CreateReleaseRequest) => ({
      method: "post",
      url: "/parlance.v1.ReleaseService/CreateRelease",
      json: data,
    }),
    { input: CreateReleaseRequestSchema, output: CreateReleaseResponseSchema },
  ),
  update: authedEndpoint.mutate(
    (data: UpdateReleaseRequest) => ({
      method: "post",
      url: "/parlance.v1.ReleaseService/UpdateRelease",
      json: data,
    }),
    { input: UpdateReleaseRequestSchema, output: UpdateReleaseResponseSchema },
  ),
  delete: authedEndpoint.mutate(
    (data: DeleteReleaseRequest) => ({
      method: "post",
      url: "/parlance.v1.ReleaseService/DeleteRelease",
      json: data,
    }),
    { input: DeleteReleaseRequestSchema, output: DeleteReleaseResponseSchema },
  ),
  publish: authedEndpoint.mutate(
    (data: PublishReleaseRequest) => ({
      method: "post",
      url: "/parlance.v1.ReleaseService/PublishRelease",
      json: data,
    }),
    {
      input: PublishReleaseRequestSchema,
      output: PublishReleaseResponseSchema,
    },
  ),
};
