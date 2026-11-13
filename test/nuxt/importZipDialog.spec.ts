import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ImportZipDialog from "~/components/locale/ImportZipDialog.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, settle, t } from "./helpers";

// The dry run of a ZIP with an English and a German file, and one for a language
// that doesn't exist.
const preview = {
  results: [
    {
      localeCode: "en",
      result: {
        entriesUpdated: 1,
        translationsChanged: 1,
        translationsOutdated: 1,
        changes: [
          {
            key: "greeting",
            action: "IMPORT_CHANGE_ACTION_CHANGE",
            oldTranslation: "Hello",
            newTranslation: "Hi",
          },
        ],
      },
    },
    {
      localeCode: "de",
      result: {
        entriesUpdated: 1,
        translationsChanged: 1,
        changes: [
          {
            key: "greeting",
            action: "IMPORT_CHANGE_ACTION_CHANGE",
            oldTranslation: "Hallo",
            newTranslation: "Hi {name}",
            sourceTranslation: "Hi",
          },
        ],
      },
    },
    { localeCode: "xx", error: "locale not found: xx" },
  ],
};

async function openDialog(imported: unknown = preview) {
  const calls: Record<string, unknown>[] = [];
  const toasts = { add: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn() };

  loginAs(ALL_PERMISSIONS);
  mockRpc("ImportService/ImportZip", (body) => {
    calls.push(body as Record<string, unknown>);

    return body.dryRun ? preview : imported;
  });

  const wrapper = await mountSuspended(ImportZipDialog, {
    props: { open: false },
    global: { provide: { toastStack: ref(toasts) } },
  });

  await wrapper.setProps({ open: true });
  await settle();

  const input = wrapper.find<HTMLInputElement>(
    "dialog[open] input[type='file']",
  );

  Object.defineProperty(input.element, "files", {
    value: [new File(["zip"], "all.zip", { type: "application/zip" })],
  });
  await input.trigger("change");
  await settle();

  return { wrapper, calls, toasts };
}

type Wrapper = Awaited<ReturnType<typeof openDialog>>["wrapper"];

async function click(wrapper: Wrapper, label: string) {
  await wrapper
    .findAll("dialog[open] button")
    .find((button) => button.text().trim() === label)!
    .trigger("click");
  await settle();
}

describe("ZIP import dialog", () => {
  it("previews each file before importing", async () => {
    const { wrapper, calls } = await openDialog();

    await click(wrapper, t("transfer.preview"));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ dryRun: true });
    expect(wrapper.emitted("close")).toBeUndefined();

    const file = (name: string) =>
      wrapper.find(`section[aria-label="${name}"]`);

    // The German text lost no placeholder, but gained one.
    expect(file("English (en)").text()).toContain("Hello");
    expect(file("English (en)").text()).toContain(
      t("importPreview.zipOutdated"),
    );
    expect(file("German (de)").text()).toContain("Hi {name}");
    expect(file("German (de)").text()).toContain(t("entries.suggestionCheck"));
    expect(file("xx").find("[role='alert']").text()).toBe(
      "locale not found: xx",
    );

    // Back to the settings and on again, which asks for a new preview.
    await click(wrapper, t("common.back"));

    expect(wrapper.find("dialog[open] input[type='file']").exists()).toBe(true);

    await click(wrapper, t("transfer.preview"));
    await click(wrapper, t("import.zip.import"));

    expect(calls.map((call) => call.dryRun)).toEqual([true, true, false]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("counts skipped files in the result", async () => {
    const { wrapper, toasts } = await openDialog({
      ...preview,
      totalUpdated: 2,
    });

    await click(wrapper, t("transfer.preview"));
    await click(wrapper, t("import.zip.import"));

    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "danger",
        message: t("import.zip.completedWithSkipped", {
          locales: 2,
          created: 0,
          updated: 2,
          failed: 0,
          skipped: 1,
        }),
      }),
    );
  });

  it("reports a clean import as a success", async () => {
    const { wrapper, toasts } = await openDialog({
      results: preview.results.slice(0, 2),
      totalUpdated: 2,
    });

    await click(wrapper, t("transfer.preview"));
    await click(wrapper, t("import.zip.import"));

    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        message: t("import.zip.success", {
          locales: 2,
          created: 0,
          updated: 2,
        }),
      }),
    );
  });
});
