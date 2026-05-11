import { defineApi } from "./client";
import { auth } from "./endpoints/auth";
import { users } from "./endpoints/users";

export const api = defineApi({
  auth,
  users,
});

export * from "./schemas";
