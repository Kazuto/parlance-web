import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { changePermissions, loginAs, logout, settle } from "./helpers";

// Renders a guarded button between two fixed siblings, so the tests can also check
// that the button comes back in the same place.
function guarded(binding: string) {
  return defineComponent({
    props: { value: { type: [String, Object], default: undefined } },
    template: `
      <div>
        <span id="before" />
        <button id="guarded" v-can="${binding}">Guarded</button>
        <span id="after" />
      </div>
    `,
  });
}

async function mountGuarded(binding: string, props = {}) {
  const wrapper = await mountSuspended(guarded(binding), { props });

  await settle();

  return wrapper;
}

const isShown = (wrapper: Awaited<ReturnType<typeof mountGuarded>>) =>
  wrapper.find("#guarded").exists();

describe("v-can", () => {
  it("hides the element while signed out", async () => {
    logout();
    expect(isShown(await mountGuarded("'read_entry'"))).toBe(false);
  });

  it.each([
    ["a permission name", "'update_entry'", ["update_entry"], ["read_entry"]],
    [
      "a permission object",
      "{ permission: 'update_entry' }",
      ["update_entry"],
      ["read_entry"],
    ],
    [
      "a resource and action",
      "{ resource: 'entry', action: 'delete' }",
      ["delete_entry"],
      ["delete_locale", "update_entry"],
    ],
    [
      "any of several permissions",
      "{ any: ['create_definition', 'update_definition'] }",
      ["update_definition"],
      ["read_definition", "delete_definition"],
    ],
    [
      "all of several permissions",
      "{ all: ['create_entry', 'update_entry'] }",
      ["create_entry", "update_entry"],
      ["create_entry"],
    ],
    ["a role", "{ role: 'test' }", ["read_entry"], undefined],
  ])(
    "checks %s",
    async (_name, binding, granted, denied: string[] | undefined) => {
      loginAs(granted);
      expect(isShown(await mountGuarded(binding))).toBe(true);

      if (denied) {
        loginAs(denied);
        expect(isShown(await mountGuarded(binding))).toBe(false);
      }
    },
  );

  it("hides the element when the role does not match", async () => {
    loginAs(["read_entry"]);
    expect(isShown(await mountGuarded("{ role: 'admin' }"))).toBe(false);
  });

  it("hides the element for an empty binding", async () => {
    loginAs(["read_entry"]);
    expect(isShown(await mountGuarded("{}"))).toBe(false);
  });

  it("follows permissions that change after mounting", async () => {
    loginAs(["read_entry"]);

    const wrapper = await mountGuarded("'update_entry'");

    expect(isShown(wrapper)).toBe(false);

    changePermissions(["read_entry", "update_entry"]);
    await settle();
    expect(isShown(wrapper)).toBe(true);

    changePermissions(["read_entry"]);
    await settle();
    expect(isShown(wrapper)).toBe(false);
  });

  it("puts the element back in its original place", async () => {
    loginAs([]);

    const wrapper = await mountGuarded("'update_entry'");

    changePermissions(["update_entry"]);
    await settle();

    const ids = [...wrapper.element.children].map((child) => child.id);

    expect(ids).toEqual(["before", "guarded", "after"]);
  });

  it("follows a binding that changes", async () => {
    loginAs(["update_entry"]);

    const wrapper = await mountGuarded("value", { value: "update_entry" });

    expect(isShown(wrapper)).toBe(true);

    await wrapper.setProps({ value: "delete_entry" });
    await settle();
    expect(isShown(wrapper)).toBe(false);

    await wrapper.setProps({ value: "update_entry" });
    await settle();
    expect(isShown(wrapper)).toBe(true);
  });

  it("stops following permissions once unmounted", async () => {
    loginAs([]);

    const wrapper = await mountGuarded("'update_entry'");
    const button = wrapper.element.querySelector("#guarded");

    wrapper.unmount();

    // A leftover watcher would try to put the button back into a dead tree.
    changePermissions(["update_entry"]);
    await settle();
    expect(button?.isConnected ?? false).toBe(false);
  });
});
