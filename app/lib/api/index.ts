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
import { imports } from "./endpoints/imports";
import { exports } from "./endpoints/exports";
import { scopes } from "./endpoints/scopes";
import { activity } from "./endpoints/activity";
import { stats } from "./endpoints/stats";
import { setup } from "./endpoints/setup";
import { translationServers } from "./endpoints/translationServers";
import { tasks } from "./endpoints/tasks";
import { webhooks } from "./endpoints/webhooks";

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
  imports,
  exports,
  scopes,
  activity,
  stats,
  setup,
  translationServers,
  tasks,
  webhooks,
});

export * from "./schemas";
