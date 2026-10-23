/**
 * Every permission the app knows. Permission checks in the app may only use these;
 * test/unit/permission-catalog.spec.ts makes sure they do.
 */
export const ALL_PERMISSIONS = [
  "create_locale",
  "read_locale",
  "update_locale",
  "delete_locale",
  "permanent_delete_locale",
  "create_entry",
  "read_entry",
  "update_entry",
  "delete_entry",
  "review_entry",
  "import_entry",
  "export_entry",
  "create_user",
  "read_user",
  "update_user",
  "delete_user",
  "create_role",
  "read_role",
  "update_role",
  "delete_role",
  "read_permission",
  "create_terminology",
  "read_terminology",
  "update_terminology",
  "delete_terminology",
  "create_scope",
  "read_scope",
  "update_scope",
  "delete_scope",
  "create_definition",
  "read_definition",
  "update_definition",
  "delete_definition",
  "review_definition",
  "create_translation_server",
  "read_translation_server",
  "update_translation_server",
  "delete_translation_server",
  "use_machine_translation",
  "create_task",
  "read_task",
  "update_task",
  "delete_task",
  "run_task",
] as const;

export type PermissionName = (typeof ALL_PERMISSIONS)[number];

/** The seeded "viewer" role: it may read and export content but change nothing. */
export const VIEWER: PermissionName[] = [
  "read_locale",
  "read_entry",
  "read_terminology",
  "read_definition",
  "read_scope",
  "export_entry",
];
