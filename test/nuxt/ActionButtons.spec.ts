import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ActionButtons from "~/components/base/ActionButtons.vue";
import { changePermissions, loginAs, settle } from "./helpers";

async function mountButtons() {
  const wrapper = await mountSuspended(ActionButtons, {
    props: {
      editPermission: "update_scope",
      deletePermission: "delete_scope",
      editLabel: "Edit scope",
      deleteLabel: "Delete scope",
    },
  });
  await settle();
  return wrapper;
}

const labels = (wrapper: Awaited<ReturnType<typeof mountButtons>>) =>
  wrapper.findAll("button").map((button) => button.attributes("aria-label"));

describe("BaseActionButtons", () => {
  it.each([
    [[], []],
    [["update_scope"], ["Edit scope"]],
    [["delete_scope"], ["Delete scope"]],
    [
      ["update_scope", "delete_scope"],
      ["Edit scope", "Delete scope"],
    ],
    // Permissions for another resource must not count.
    [["update_entry", "delete_entry"], []],
  ])("with %j shows %j", async (permissions, expected) => {
    loginAs(permissions);
    expect(labels(await mountButtons())).toEqual(expected);
  });

  it("emits edit and delete", async () => {
    loginAs(["update_scope", "delete_scope"]);
    const wrapper = await mountButtons();

    await wrapper.find('[aria-label="Edit scope"]').trigger("click");
    await wrapper.find('[aria-label="Delete scope"]').trigger("click");

    expect(wrapper.emitted("edit")).toHaveLength(1);
    expect(wrapper.emitted("delete")).toHaveLength(1);
  });

  it("follows permission changes", async () => {
    loginAs([]);
    const wrapper = await mountButtons();
    expect(labels(wrapper)).toEqual([]);

    changePermissions(["delete_scope"]);
    await settle();
    expect(labels(wrapper)).toEqual(["Delete scope"]);
  });
});
