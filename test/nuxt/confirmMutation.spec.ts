import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { Component } from "vue";
import { ConfirmDialog } from "@thkzt/eunoia";
import ScopeDeleteDialog from "~/components/scope/DeleteDialog.vue";
import EntryDeleteDialog from "~/components/entry/DeleteDialog.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, settle } from "./helpers";

async function mountDialog(component: Component, item: object) {
  const wrapper = await mountSuspended(component, {
    props: { open: true, item },
    global: { provide: { toastStack: ref(null) } },
  });
  const dialog = wrapper.findComponent(ConfirmDialog);

  return { wrapper, dialog };
}

describe("confirm dialogs", () => {
  it("close once the mutation succeeded", async () => {
    loginAs(ALL_PERMISSIONS);

    const deleted: unknown[] = [];

    mockRpc("ScopeService/DeleteScope", (body) => {
      deleted.push(body);

      return {};
    });

    const { wrapper, dialog } = await mountDialog(ScopeDeleteDialog, {
      id: "s1",
      name: "Frontend",
    });

    dialog.vm.$emit("confirm");
    await settle();

    expect(deleted).toEqual([{ id: "s1" }]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("stay open when the mutation fails", async () => {
    loginAs(ALL_PERMISSIONS);
    mockRpc("EntryService/DeleteEntry", () => {
      throw new Error("offline");
    });

    const { wrapper, dialog } = await mountDialog(EntryDeleteDialog, {
      id: "e1",
      key: "app.title",
    });

    dialog.vm.$emit("confirm");
    await settle();

    expect(wrapper.emitted("close")).toBeUndefined();
    expect(wrapper.emitted("deleted")).toBeUndefined();
  });

  it("report what they deleted", async () => {
    loginAs(ALL_PERMISSIONS);
    mockRpc("EntryService/DeleteEntry", {});

    const { wrapper, dialog } = await mountDialog(EntryDeleteDialog, {
      id: "e1",
      key: "app.title",
    });

    dialog.vm.$emit("confirm");
    await settle();

    expect(wrapper.emitted("deleted")).toEqual([["e1"]]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("cannot be dismissed while the mutation runs", async () => {
    loginAs(ALL_PERMISSIONS);

    let finish: () => void = () => {};

    mockRpc(
      "ScopeService/DeleteScope",
      () => new Promise<object>((resolve) => (finish = () => resolve({}))),
    );

    const { wrapper, dialog } = await mountDialog(ScopeDeleteDialog, {
      id: "s1",
      name: "Frontend",
    });

    dialog.vm.$emit("confirm");
    await settle();
    dialog.vm.$emit("cancel");
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(dialog.props("persistent")).toBe(true);

    finish();
    await settle();
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
