import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TransferDialog from "~/components/entry/TransferDialog.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, settle, t } from "./helpers";

const locales = [
  { id: "en", code: "en", isDefault: true, names: {} },
  { id: "de", code: "de", names: {} },
];

// What importing the file into English would change, as its dry run tells.
const preview = {
  entriesCreated: 1,
  entriesUpdated: 4,
  translationsAdded: 1,
  translationsChanged: 2,
  translationsOutdated: 4,
  changes: [
    {
      key: "greeting",
      action: "IMPORT_CHANGE_ACTION_CHANGE",
      oldTranslation: "Hello",
      newTranslation: "Hi",
    },
    {
      key: "welcome",
      action: "IMPORT_CHANGE_ACTION_ADD",
      newTranslation: "Welcome",
    },
  ],
};

async function openDialog(action: "import" | "export") {
  const calls: { method: string; body: Record<string, unknown> }[] = [];

  loginAs(ALL_PERMISSIONS);
  mockRpc("ExportService/ExportJson", (body) => {
    calls.push({ method: "ExportJson", body });

    return { content: "{}", filename: "en.json" };
  });
  mockRpc("ImportService/ImportJson", (body) => {
    calls.push({ method: "ImportJson", body });

    return { result: body.dryRun ? preview : { entriesCreated: 2 } };
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

const SUMMARY = { created: 2, updated: 0, skipped: 0, failed: 0 };

type Wrapper = Awaited<ReturnType<typeof openDialog>>["wrapper"];

const buttons = (wrapper: Wrapper) =>
  wrapper.findAll("dialog[open] button").map((button) => button.text().trim());

async function click(wrapper: Wrapper, label: string) {
  await wrapper
    .findAll("dialog[open] button")
    .find((button) => button.text().trim() === label)!
    .trigger("click");
  await settle();
}

async function chooseFile(wrapper: Wrapper, name = "en.json") {
  const input = wrapper.find<HTMLInputElement>(
    "dialog[open] input[type='file']",
  );

  Object.defineProperty(input.element, "files", {
    value: [new File(['{"a":"b"}'], name, { type: "application/json" })],
    configurable: true,
  });
  await input.trigger("change");
  await settle();
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

  it("previews an import, then imports from the footer and offers to close", async () => {
    const { wrapper, calls } = await openDialog("import");

    await chooseFile(wrapper);
    await click(wrapper, t("transfer.preview"));

    // Nothing is imported yet.
    expect(calls.map((call) => call.body.dryRun)).toEqual([true]);
    expect(wrapper.text()).toContain(t("importPreview.hint"));
    expect(wrapper.text()).not.toContain(t("transfer.summary", SUMMARY));

    await click(wrapper, t("entries.import"));

    expect(calls.map((call) => call.method)).toEqual([
      "ImportJson",
      "ImportJson",
    ]);
    expect(calls[1]!.body).toMatchObject({ localeId: "en", dryRun: false });
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    expect(wrapper.text()).toContain(t("transfer.summary", SUMMARY));
    expect(wrapper.text()).not.toContain(t("importPreview.hint"));
    expect(buttons(wrapper)).toContain(t("common.close"));
    expect(buttons(wrapper)).not.toContain(t("transfer.preview"));
  });

  it("shows what the import would change", async () => {
    const { wrapper } = await openDialog("import");

    await chooseFile(wrapper);
    await click(wrapper, t("transfer.preview"));

    const changes = wrapper
      .findAll(`ol[aria-label="${t("importPreview.changes")}"] li`)
      .map((item) => item.text());

    expect(changes).toHaveLength(2);
    expect(changes[0]).toContain("greeting");
    expect(changes[0]).toContain(t("importPreview.changed"));
    expect(changes[0]).toContain("Hello");
    expect(changes[0]).toContain("Hi");
    expect(changes[1]).toContain(t("importPreview.added"));
    // One is created and four updated, but only three of them change.
    expect(wrapper.text()).toContain(`${t("importPreview.unchanged")} 2`);
    // One more change than listed, and other languages' translations outdated.
    expect(wrapper.text()).toContain(t("importPreview.more", { count: 1 }, 1));
    expect(wrapper.text()).toContain(
      t("importPreview.outdated", { count: 4 }, 4),
    );
  });

  it("goes back from the preview to the settings", async () => {
    const { wrapper, calls } = await openDialog("import");
    const fileInput = () => wrapper.find("dialog[open] input[type='file']");

    await chooseFile(wrapper);
    await click(wrapper, t("transfer.preview"));

    // The preview takes the settings' place.
    expect(fileInput().exists()).toBe(false);

    await click(wrapper, t("common.back"));

    expect(fileInput().exists()).toBe(true);
    expect(wrapper.text()).not.toContain(t("importPreview.hint"));

    await chooseFile(wrapper, "other.json");
    await click(wrapper, t("transfer.preview"));

    // The first step can be chosen too.
    await wrapper
      .find("[aria-current='step']")
      .element.previousElementSibling!.querySelector("button")!
      .click();
    await settle();

    expect(fileInput().exists()).toBe(true);
    expect(calls.map((call) => call.body.dryRun)).toEqual([true, true]);
    expect(calls[1]!.body).toMatchObject({ filename: "other.json" });
  });
});
