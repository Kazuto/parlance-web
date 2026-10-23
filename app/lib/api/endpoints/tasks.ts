import { authedEndpoint } from "../builder";
import {
  ListTasksRequestSchema,
  ListTasksResponseSchema,
  CreateTaskRequestSchema,
  CreateTaskResponseSchema,
  UpdateTaskRequestSchema,
  UpdateTaskResponseSchema,
  DeleteTaskRequestSchema,
  DeleteTaskResponseSchema,
  RunTaskRequestSchema,
  RunTaskResponseSchema,
  ListTaskRunsRequestSchema,
  ListTaskRunsResponseSchema,
  GetTaskRunRequestSchema,
  GetTaskRunResponseSchema,
  CancelTaskRunRequestSchema,
  CancelTaskRunResponseSchema,
  CheckTaskAccessRequestSchema,
  CheckTaskAccessResponseSchema,
  GetTaskSettingsRequestSchema,
  GetTaskSettingsResponseSchema,
  UpdateTaskSettingsRequestSchema,
  UpdateTaskSettingsResponseSchema,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type DeleteTaskRequest,
  type RunTaskRequest,
  type ListTaskRunsRequest,
  type GetTaskRunRequest,
  type CancelTaskRunRequest,
  type CheckTaskAccessRequest,
  type UpdateTaskSettingsRequest,
} from "../schemas/parlance/v1/TaskSchema";

export const tasks = {
  list: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.TaskService/ListTasks",
      json: {},
    }),
    { input: ListTasksRequestSchema, output: ListTasksResponseSchema },
  ),
  create: authedEndpoint.mutate(
    (data: CreateTaskRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/CreateTask",
      json: data,
    }),
    { input: CreateTaskRequestSchema, output: CreateTaskResponseSchema },
  ),
  update: authedEndpoint.mutate(
    (data: UpdateTaskRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/UpdateTask",
      json: data,
    }),
    { input: UpdateTaskRequestSchema, output: UpdateTaskResponseSchema },
  ),
  delete: authedEndpoint.mutate(
    (data: DeleteTaskRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/DeleteTask",
      json: data,
    }),
    { input: DeleteTaskRequestSchema, output: DeleteTaskResponseSchema },
  ),
  run: authedEndpoint.mutate(
    (data: RunTaskRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/RunTask",
      json: data,
    }),
    { input: RunTaskRequestSchema, output: RunTaskResponseSchema },
  ),
  runs: authedEndpoint.query(
    (data: ListTaskRunsRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/ListTaskRuns",
      json: data,
    }),
    { input: ListTaskRunsRequestSchema, output: ListTaskRunsResponseSchema },
  ),
  getRun: authedEndpoint.query(
    (data: GetTaskRunRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/GetTaskRun",
      json: data,
    }),
    { input: GetTaskRunRequestSchema, output: GetTaskRunResponseSchema },
  ),
  cancelRun: authedEndpoint.mutate(
    (data: CancelTaskRunRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/CancelTaskRun",
      json: data,
    }),
    { input: CancelTaskRunRequestSchema, output: CancelTaskRunResponseSchema },
  ),
  checkAccess: authedEndpoint.mutate(
    (data: CheckTaskAccessRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/CheckTaskAccess",
      json: data,
    }),
    {
      input: CheckTaskAccessRequestSchema,
      output: CheckTaskAccessResponseSchema,
    },
  ),
  settings: authedEndpoint.query(
    () => ({
      method: "post",
      url: "/parlance.v1.TaskService/GetTaskSettings",
      json: {},
    }),
    {
      input: GetTaskSettingsRequestSchema,
      output: GetTaskSettingsResponseSchema,
    },
  ),
  updateSettings: authedEndpoint.mutate(
    (data: UpdateTaskSettingsRequest) => ({
      method: "post",
      url: "/parlance.v1.TaskService/UpdateTaskSettings",
      json: data,
    }),
    {
      input: UpdateTaskSettingsRequestSchema,
      output: UpdateTaskSettingsResponseSchema,
    },
  ),
};
