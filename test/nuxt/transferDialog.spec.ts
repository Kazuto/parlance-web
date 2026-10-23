import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TransferDialog from "~/components/entry/TransferDialog.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, settle, t } from "./helpers";

const locales = [{ id: "en", code: "en", isDefault: true, names: {} }];

async function openDialog(action: "import" | "export") {
  const calls: { method: string; body: Record<string, unknown> }[] = [];

  loginAs(ALL_PERMISSIONS);
  mockRpc("ExportService/ExportJson", (body) => {
    calls.push({ method: "ExportJson", body });

    return { content: "{}", filename: "en.json" };
  });
  mockRpc("ImportService/ImportJson", (body) => {
    calls.push({ method: "ImportJson", body });

    return { result: { entriesCreated: 2 } };
  });

  // The dialog opens when its open prop turns true.
  const wrapper = await mountSuspended(TransferDialog, {
    props: { open: false, action, locales },
    // The layout provides the toast stack the dialog reports through.
    global: { provide: { toastStack: ref(null) } },
  });

  await wrapper.setProps({ open: true });
  await settle();

  return { wrapper, calls };
}

describe("transfer dialog", () => {
  it("shows its actions in the dialog footer", async () => {
    const { wrapper } = await openDialog("export");
    const form = wrapper.find("dialog[open] form");
    const footerButtons = wrapper
      .findAll("dialog[open] button")
      .filter((button) => !form.element.contains(button.element))
      .map((button) => button.text().trim());

    expect(footerButtons).toContain(t("common.cancel"));
    expect(footerButtons).toContain(t("transfer.download"));
    expect(form.text()).not.toContain(t("transfer.download"));
  });

  it("exports from the footer", async () => {
    const { wrapper, calls } = await openDialog("export");

    URL.createObjectURL = () => "blob:export";

    URL.revokeObjectURL = () => {};

    await wrapper
      .findAll("dialog[open] button")
      .find((button) => button.text().trim() === t("transfer.download"))!
      .trigger("click");
    await settle();

    expect(calls).toEqual([
      {
        method: "ExportJson",
        body: { localeCode: "en", scopeIds: [], includeDrafts: false },
      },
    ]);
  });

  it("imports from the footer and then offers to close", async () => {
    const { wrapper, calls } = await openDialog("import");
    const input = wrapper.find<HTMLInputElement>(
      "dialog[open] input[type='file']",
    );

    Object.defineProperty(input.element, "files", {
      value: [new File(['{"a":"b"}'], "en.json", { type: "application/json" })],
    });
    await input.trigger("change");
    await settle();

    await wrapper
      .findAll("dialog[open] button")
      .find((button) => button.text().trim() === t("entries.import"))!
      .trigger("click");
    await settle();

    expect(calls.map((call) => call.method)).toEqual(["ImportJson"]);
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    expect(wrapper.text()).toContain(
      t("transfer.summary", { created: 2, updated: 0, skipped: 0, failed: 0 }),
    );
    expect(
      wrapper
        .findAll("dialog[open] button")
        .some((button) => button.text().trim() === t("common.close")),
    ).toBe(true);
  });
});
