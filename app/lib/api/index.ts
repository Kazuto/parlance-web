import { defineApi } from "./client";
import { auth } from "./endpoints/auth";
import { definitions } from "./endpoints/definitions";
import { entries } from "./endpoints/entries";
import { locales } from "./endpoints/locales";
import { localizations } from "./endpoints/localizations";
import { permissions } from "./endpoints/permissions";
import { roles } from "./endpoints/roles";
import { terminologies } from "./endpoints/terminologies";
import { users } from "./endpoints/users";

export const api = defineApi({
  auth,
  definitions,
  entries,
  locales,
  localizations,
  permissions,
  roles,
  terminologies,
  users,
});

export * from "./schemas";
