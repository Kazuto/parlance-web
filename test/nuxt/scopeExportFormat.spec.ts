import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Select } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import ScopeFormDialog from "~/components/scope/FormDialog.vue";
import TaskGitExportFields from "~/components/task/GitExportFields.vue";
import TransferDialog from "~/components/entry/TransferDialog.vue";
import { taskToForm } from "~/lib/taskForm";
import {
  ALL_PERMISSIONS,
  loginAs,
  mockRpc,
  pagination,
  settle,
  t,
} from "./helpers";

// Mail and Backend are exported as PHP by default, Web as JSON and Help as PO;
// Docs has no default.
const scopes = [
  { id: "s1", name: "Mail", exportFormat: "EXPORT_FORMAT_PHP" },
  { id: "s2", name: "Backend", exportFormat: "EXPORT_FORMAT_PHP" },
  { id: "s3", name: "Web", exportFormat: "EXPORT_FORMAT_JSON" },
  { id: "s4", name: "Docs", exportFormat: "EXPORT_FORMAT_UNSPECIFIED" },
  { id: "s5", name: "Help", exportFormat: "EXPORT_FORMAT_PO" },
];

const provide = { toastStack: ref(null) };

/** The select whose label or options include this text. */
const selectWith = (wrapper: VueWrapper, text: string) =>
  wrapper
    .findAllComponents(Select)
    .find(
      (select) =>
        select.text().includes(text) ||
        (select.props() as { options: { label: string }[] }).options.some(
          (option) => option.label === text,
        ),
    )!;

async function choose(wrapper: VueWrapper, text: string, value: unknown) {
  selectWith(wrapper, text).vm.$emit("update:modelValue", value);
  await settle();
}

async function click(wrapper: VueWrapper, label: string) {
  await wrapper
    .findAll("dialog[open] button")
    .find((button) => button.text().trim() === label)!
    .trigger("click");
  await settle();
}

describe("default export format in the scope form", () => {
  async function openForm(item?: Record<string, unknown>) {
    const calls: Record<string, unknown>[] = [];

    loginAs(ALL_PERMISSIONS);
    mockRpc("ScopeService/CreateScope", (body) => {
      calls.push(body);

      return { scope: { id: "s9", ...body } };
    });
    mockRpc("ScopeService/UpdateScope", (body) => {
      calls.push(body);

      return { scope: { ...item, ...body } };
    });

    const wrapper = await mountSuspended(ScopeFormDialog, {
      props: { open: false, item },
      global: { provide },
    });

    await wrapper.setProps({ open: true });
    await settle();

    return { wrapper, calls };
  }

  it("is saved with a new scope", async () => {
    const { wrapper, calls } = await openForm();

    await wrapper.find("dialog[open] input").setValue("Mail");
    await choose(wrapper, t("scopes.exportFormat"), "EXPORT_FORMAT_PO");
    await click(wrapper, t("scopes.create"));

    expect(calls).toEqual([
      expect.objectContaining({
        name: "Mail",
        slug: "mail",
        exportFormat: "EXPORT_FORMAT_PO",
      }),
    ]);
  });

  it("shows the scope's format and can be cleared", async () => {
    const { wrapper, calls } = await openForm({
      id: "s1",
      name: "Mail",
      slug: "mail",
      exportFormat: "EXPORT_FORMAT_PHP",
    });
    const select = selectWith(wrapper, t("scopes.exportFormat"));

    expect(select.props("modelValue")).toBe("EXPORT_FORMAT_PHP");

    await choose(
      wrapper,
      t("scopes.exportFormat"),
      "EXPORT_FORMAT_UNSPECIFIED",
    );
    await click(wrapper, t("common.save"));

    expect(calls).toEqual([
      expect.objectContaining({
        id: "s1",
        exportFormat: "EXPORT_FORMAT_UNSPECIFIED",
      }),
    ]);
  });
});

describe("format of an export from the transfer dialog", () => {
  async function openExport() {
    const calls: string[] = [];

    loginAs(ALL_PERMISSIONS);
    mockRpc("ScopeService/ListScopes", {
      scopes,
      pagination: pagination(scopes.length),
    });

    for (const format of ["Json", "Php", "Po"]) {
      mockRpc(`ExportService/Export${format}`, () => {
        calls.push(format);

        return { content: "", filename: "en.txt" };
      });
    }

    URL.createObjectURL = () => "blob:export";

    URL.revokeObjectURL = () => {};

    const wrapper = await mountSuspended(TransferDialog, {
      props: {
        open: false,
        action: "export",
        locales: [{ id: "en", code: "en", isDefault: true }],
      },
      global: { provide },
    });

    await wrapper.setProps({ open: true });
    await settle();

    return { wrapper, calls };
  }

  const pickScopes = (wrapper: VueWrapper, ids: string[]) =>
    choose(wrapper, "Mail", ids);

  it("follows the default the selected scopes share", async () => {
    const { wrapper, calls } = await openExport();

    await pickScopes(wrapper, ["s1", "s2"]);

    expect(wrapper.text()).toContain(t("transfer.formatFromScopes"));

    await click(wrapper, t("transfer.download"));

    expect(calls).toEqual(["Php"]);
  });

  it("stays as it is when the scopes' defaults differ", async () => {
    const { wrapper, calls } = await openExport();

    for (const ids of [
      ["s1", "s3"],
      ["s1", "s4"],
    ]) {
      await pickScopes(wrapper, ids);

      expect(wrapper.text()).not.toContain(t("transfer.formatFromScopes"));
    }

    await click(wrapper, t("transfer.download"));

    expect(calls).toEqual(["Json"]);
  });

  it("keeps a format picked by hand", async () => {
    const { wrapper, calls } = await openExport();

    await choose(wrapper, t("transfer.po"), "po");
    await pickScopes(wrapper, ["s1"]);
    await click(wrapper, t("transfer.download"));

    expect(wrapper.text()).not.toContain(t("transfer.formatFromScopes"));
    expect(calls).toEqual(["Po"]);
  });
});

describe("files of a git export", () => {
  it("adds the selected scopes' default format first", async () => {
    loginAs(ALL_PERMISSIONS);

    const form = taskToForm(undefined, "TASK_TYPE_GIT_EXPORT").git;

    form.scopeIds = ["s5"];

    const wrapper = await mountSuspended(TaskGitExportFields, {
      props: {
        modelValue: form,
        token: "",
        removeToken: false,
        localeOptions: [],
        scopeOptions: scopes.map((scope) => ({
          label: scope.name,
          value: scope.id,
          exportFormat:
            scope.exportFormat === "EXPORT_FORMAT_UNSPECIFIED"
              ? undefined
              : (scope.exportFormat as "EXPORT_FORMAT_PHP"),
        })),
      },
      global: { provide },
    });
    const addFile = () =>
      wrapper
        .findAll("button")
        .find((button) => button.text().trim() === t("tasks.git.addFile"))!
        .trigger("click");

    // JSON is there already; Help's PO comes before PHP.
    await addFile();
    await addFile();

    expect(form.files.map((file) => file.format)).toEqual([
      "EXPORT_FORMAT_JSON",
      "EXPORT_FORMAT_PO",
      "EXPORT_FORMAT_PHP",
    ]);
    expect(form.files[1]!.path).toBe("locale/{locale}/LC_MESSAGES/messages.po");
  });
});
