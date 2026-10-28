import { describe, expect, it } from "vitest";
import { changePermissions, loginAs, logout } from "./helpers";

describe("usePermission", () => {
  it("denies everything while signed out", () => {
    logout();

    const { can, canDo, canAny, canAll, hasRole } = usePermission();

    expect(can.value("read_entry")).toBe(false);
    expect(canDo.value("entry", "read")).toBe(false);
    expect(canAny.value(["read_entry", "read_locale"])).toBe(false);
    expect(hasRole.value("test")).toBe(false);
    // `every` over nothing is true, but there is never a reason to check none.
    expect(canAll.value(["read_entry"])).toBe(false);
  });

  it("grants only the permissions the user holds", () => {
    loginAs(["read_entry", "update_entry"]);

    const { can } = usePermission();

    expect(can.value("read_entry")).toBe(true);
    expect(can.value("update_entry")).toBe(true);
    expect(can.value("create_entry")).toBe(false);
    expect(can.value("delete_entry")).toBe(false);
  });

  it("does not match permissions by prefix or resource alone", () => {
    loginAs(["delete_locale"]);

    const { can } = usePermission();

    expect(can.value("permanent_delete_locale")).toBe(false);
    expect(can.value("delete")).toBe(false);
    expect(can.value("locale")).toBe(false);
  });

  it("checks by resource and action", () => {
    loginAs(["update_scope", "permanent_delete_locale"]);

    const { canDo } = usePermission();

    expect(canDo.value("scope", "update")).toBe(true);
    expect(canDo.value("scope", "delete")).toBe(false);
    expect(canDo.value("entry", "update")).toBe(false);
  });

  it("checks any and all of several permissions", () => {
    loginAs(["create_entry"]);

    const { canAny, canAll } = usePermission();

    expect(canAny.value(["create_entry", "update_entry"])).toBe(true);
    expect(canAll.value(["create_entry", "update_entry"])).toBe(false);
    expect(canAny.value(["delete_entry", "update_entry"])).toBe(false);

    changePermissions(["create_entry", "update_entry"]);
    expect(canAll.value(["create_entry", "update_entry"])).toBe(true);
  });

  it("combines the permissions of every role", () => {
    loginAs([]);

    const user = makeUserWithRoles([["read_entry"], ["update_entry"]]);

    useAuthStore().setUser(user);

    const { can, hasRole, hasAnyRole, hasAllRoles } = usePermission();

    expect(can.value("read_entry")).toBe(true);
    expect(can.value("update_entry")).toBe(true);
    expect(hasRole.value("role-0")).toBe(true);
    expect(hasAnyRole.value(["role-1", "admin"])).toBe(true);
    expect(hasAllRoles.value(["role-0", "role-1"])).toBe(true);
    expect(hasAllRoles.value(["role-0", "admin"])).toBe(false);
  });

  it("copes with roles that come without permissions", () => {
    loginAs([]);
    useAuthStore().setUser({ id: "user-1", roles: [{ name: "empty" }] });

    const { can, hasRole } = usePermission();

    expect(can.value("read_entry")).toBe(false);
    expect(hasRole.value("empty")).toBe(true);
  });

  it("follows permission changes without being called again", () => {
    loginAs(VIEWER_LIKE);

    const { can } = usePermission();
    const canCreate = computed(() => can.value("create_entry"));

    expect(canCreate.value).toBe(false);
    changePermissions([...VIEWER_LIKE, "create_entry"]);
    expect(canCreate.value).toBe(true);
    changePermissions(VIEWER_LIKE);
    expect(canCreate.value).toBe(false);
  });
});

const VIEWER_LIKE = ["read_entry"];

function makeUserWithRoles(roles: string[][]) {
  return {
    id: "user-1",
    roles: roles.map((permissions, index) => ({
      id: `role-${index}`,
      name: `role-${index}`,
      permissions: permissions.map((name) => ({ name })),
    })),
  };
}
