import type { MenuItem } from "@thkzt/eunoia";

/**
 * The pages the user can open: the main ones, and those configuring the instance.
 * The sidebar, the bottom bar and the command palette list the same pages.
 */
export function useNavigation() {
  const { t } = useI18n();
  const { can, canAny } = usePermission();

  // Items without a permission are always shown.
  const mainItems = computed<MenuItem[]>(() =>
    (
      [
        { label: t("nav.dashboard"), to: "/", icon: "house-simple" },
        {
          label: t("nav.locales"),
          to: "/locales",
          icon: "globe-simple",
          permission: "read_locale",
        },
        {
          label: t("nav.entries"),
          to: "/entries",
          icon: "translate",
          permission: "read_entry",
        },
        {
          label: t("nav.transfer"),
          to: "/entries/transfer",
          icon: "arrows-down-up",
          permission: ["import_entry", "export_entry"],
        },
        {
          label: t("nav.glossary"),
          to: "/glossary",
          icon: "book-open-text",
          permission: "read_terminology",
        },
        {
          label: t("nav.scopes"),
          to: "/scopes",
          icon: "stack",
          permission: "read_scope",
        },
        {
          label: t("nav.roles"),
          to: "/roles",
          icon: "shield",
          permission: "read_role",
        },
        {
          label: t("nav.users"),
          to: "/users",
          icon: "users",
          permission: "read_user",
        },
      ] satisfies (MenuItem & { permission?: string | string[] })[]
    )
      // A list of permissions shows the item for any of them.
      .filter(
        (item) =>
          !item.permission ||
          (Array.isArray(item.permission)
            ? canAny.value(item.permission)
            : can.value(item.permission)),
      )
      .map(({ permission: _permission, ...item }) => item),
  );

  // Configuring the instance: automation for those who may see it, and settings.
  const settingsItems = computed<MenuItem[]>(() => [
    ...(can.value("read_task")
      ? [{ label: t("nav.tasks"), to: "/tasks", icon: "lightning" }]
      : []),
    ...(can.value("read_webhook")
      ? [{ label: t("nav.webhooks"), to: "/webhooks", icon: "webhooks-logo" }]
      : []),
    { label: t("nav.settings"), to: "/settings", icon: "gear" },
  ]);

  return { mainItems, settingsItems };
}
