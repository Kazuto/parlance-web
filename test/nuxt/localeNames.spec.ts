import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import LocaleCreateDialog from "~/components/locale/CreateDialog.vue";
import LocaleEditDialog from "~/components/locale/EditDialog.vue";
import { ALL_PERMISSIONS, loginAs, settle, t } from "./helpers";

async function mountDialog(
  dialog: typeof LocaleCreateDialog | typeof LocaleEditDialog,
  props: Record<string, unknown> = {},
) {
  loginAs(ALL_PERMISSIONS);

  const wrapper = await mountSuspended(dialog, {
    props: { open: false, ...props },
    global: { provide: { toastStack: ref(null) } },
  });

  await wrapper.setProps({ open: true });
  await settle();

  return wrapper;
}

describe("language names", () => {
  it("show as the code is typed, with either separator", async () => {
    const wrapper = await mountDialog(LocaleCreateDialog);
    const code = wrapper.find("dialog[open] input[type='text']");

    expect(wrapper.text()).toContain(t("locales.codeHelp"));

    await code.setValue("pt_BR");
    expect(wrapper.text()).toContain(
      t("locales.namedAs", { name: "Brazilian Portuguese" }),
    );

    // An unknown code names nothing, so the help stays.
    await code.setValue("xx");
    expect(wrapper.text()).toContain(t("locales.codeHelp"));
    expect(wrapper.text()).not.toContain(t("locales.namedAs", { name: "" }));
  });

  it("follow a changed code when editing", async () => {
    const wrapper = await mountDialog(LocaleEditDialog, {
      item: { id: "l2", code: "de", name: "German" },
    });
    const code = wrapper.find("dialog[open] input[type='text']");

    expect((code.element as HTMLInputElement).value).toBe("de");
    expect(wrapper.text()).toContain(t("locales.namedAs", { name: "German" }));

    await code.setValue("de-AT");
    expect(wrapper.text()).toContain(
      t("locales.namedAs", { name: "Austrian German" }),
    );
  });
});

describe("the default language", () => {
  const checkbox = (wrapper: Awaited<ReturnType<typeof mountDialog>>) =>
    wrapper.find("dialog[open] input[type='checkbox']")
      .element as HTMLInputElement;

  it("stays the default until another one is set", async () => {
    const wrapper = await mountDialog(LocaleEditDialog, {
      item: { id: "l1", code: "en", name: "English", isDefault: true },
    });

    expect(checkbox(wrapper).checked).toBe(true);
    expect(checkbox(wrapper).disabled).toBe(true);
  });

  it("can be replaced by another language", async () => {
    const wrapper = await mountDialog(LocaleEditDialog, {
      item: { id: "l2", code: "de", name: "German" },
    });

    expect(checkbox(wrapper).checked).toBe(false);
    expect(checkbox(wrapper).disabled).toBe(false);
  });
});
