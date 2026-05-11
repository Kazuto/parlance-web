import { z } from "zod";
import { authedEndpoint } from "../builder";
import { UserSchema } from "../schemas/UserSchema";

export const users = {
  list: authedEndpoint.query(
    () => ({
      url: "/users",
    }),
    {
      output: z.array(UserSchema),
    },
  ),

  get: authedEndpoint.query(
    (id: number) => ({
      url: `/users/${id}`,
    }),
    {
      input: z.number(),
      output: UserSchema,
    },
  ),

  create: authedEndpoint.mutate(
    (data: Omit<z.infer<typeof UserSchema>, "id">) => ({
      method: "post",
      url: "/users",
      json: data,
    }),
    {
      input: UserSchema.omit({ id: true }),
      output: UserSchema,
    },
  ),

  update: authedEndpoint.mutate(
    ({
      id,
      data,
    }: {
      id: number;
      data: Partial<z.infer<typeof UserSchema>>;
    }) => ({
      method: "patch",
      url: `/users/${id}`,
      json: data,
    }),
    {
      input: z.object({
        id: z.number(),
        data: UserSchema.partial(),
      }),
      output: UserSchema,
    },
  ),

  delete: authedEndpoint.mutate(
    (id: number) => ({
      method: "delete",
      url: `/users/${id}`,
    }),
    {
      input: z.number(),
      output: z.object({ success: z.boolean() }),
    },
  ),
};
