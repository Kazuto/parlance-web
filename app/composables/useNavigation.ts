import type { MenuItem } from "@thkzt/eunoia";

/** The settings page has a part for each of these permissions. */
export const INSTANCE_SETTINGS_PERMISSIONS = [
  "read_translation_server",
  "read_sso_provider",
  "read_user",
];

/**
 * The pages the user can open: the main ones, those configuring the instance, and
 * their own account. The sidebar, the bottom bar and the command palette list the
 * same pages; the open sidebar nests some of them, see sidebarItems. The account
 * opens from the user menu.
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
          label: t("entries.deletedEntries"),
          to: "/entries/deleted",
          icon: "trash",
          permission: "delete_entry",
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

  // Configuring the instance, for those who may see each part. The settings page
  // lets the same permissions in.
  const settingsItems = computed<MenuItem[]>(() => [
    ...(can.value("read_task")
      ? [{ label: t("nav.tasks"), to: "/tasks", icon: "lightning" }]
      : []),
    ...(can.value("read_webhook")
      ? [{ label: t("nav.webhooks"), to: "/webhooks", icon: "webhooks-logo" }]
      : []),
    ...(canAny.value(INSTANCE_SETTINGS_PERMISSIONS)
      ? [{ label: t("nav.settings"), to: "/settings", icon: "gear" }]
      : []),
  ]);

  // Everyone's own settings.
  const accountItem = computed<MenuItem>(() => ({
    label: t("nav.account"),
    to: "/account",
    icon: "user-circle",
  }));

  // The open sidebar groups the pages below the entries, e.g. the transfer, under
  // them. A section is no link itself, so the entries page becomes its first item.
  // Without the entries page, or any page below it, there is nothing to group.
  const sidebarItems = computed<MenuItem[]>(() => {
    const entries = mainItems.value.find((item) => item.to === "/entries");
    const below = mainItems.value.filter((item) =>
      item.to?.startsWith("/entries/"),
    );

    if (!entries || !below.length) return mainItems.value;

    return mainItems.value.flatMap((item) => {
      if (below.includes(item)) return [];
      if (item !== entries) return [item];

      return [
        {
          label: entries.label,
          icon: entries.icon,
          items: [{ ...entries, label: t("nav.allEntries") }, ...below],
        },
      ];
    });
  });

  return { mainItems, sidebarItems, settingsItems, accountItem };
}
