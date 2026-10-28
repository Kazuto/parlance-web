import { humanizePermission } from "~/lib/permissions";

/**
 * Names a permission's resource or action in the interface language, e.g. "entry"
 * as "Entries". One the catalogs don't know yet is shown as words, e.g. "new thing".
 */
export function usePermissionLabels() {
  const { t, te } = useI18n();

  const label = (kind: "resource" | "action", text: string) => {
    const key = `permissions.${kind}.${text}`;

    return te(key) ? t(key) : humanizePermission(text);
  };

  return {
    resourceLabel: (resource: string) => label("resource", resource),
    actionLabel: (action: string) => label("action", action),
  };
}
