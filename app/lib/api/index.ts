import { defineApi } from "./client";
import { auth } from "./endpoints/auth";
import { locale } from "./endpoints/locale";
import { users } from "./endpoints/users";

export const api = defineApi({
  auth,
  locale,
  users,
});

export * from "./schemas";
