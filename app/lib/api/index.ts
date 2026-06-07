import { defineApi } from "./client";
import { auth } from "./endpoints/auth";
import { definitions } from "./endpoints/definition";
import { entries } from "./endpoints/entries";
import { locale } from "./endpoints/locale";
import { localizations } from "./endpoints/localizations";
import { permissions } from "./endpoints/permissions";
import { roles } from "./endpoints/roles";
import { terminologies } from "./endpoints/terminologies";
import { users } from "./endpoints/users";

export const api = defineApi({
  auth,
  definitions,
  entries,
  locale,
  localizations,
  permissions,
  roles,
  terminologies,
  users,
});

export * from "./schemas";
