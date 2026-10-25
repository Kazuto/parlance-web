import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import { SidebarToggle } from "@thkzt/eunoia";
import DefaultLayout from "~/layouts/default.vue";
import { ALL_PERMISSIONS, VIEWER, loginAs, settle, t } from "./helpers";

// Stands in for a page that adds its own commands.
function pageWithCommands(run: () => unknown) {
  return defineComponent({
    setup() {
      useCommands(() => [
        { label: "Reload the list", value: "reload", group: "List", run },
      ]);

      return () => h("p", "page");
    },
  });
}

async function mountLayout(page: () => unknown = () => "content") {
  const wrapper = await mountSuspended(DefaultLayout, {
    slots: { default: page },
    attachTo: document.body,
  });

  await settle();

  return wrapper;
}

async function openPalette(wrapper: VueWrapper) {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle();

  return wrapper.findAll('dialog[open] [role="option"]');
}

const labels = async (wrapper: VueWrapper) =>
  (await openPalette(wrapper)).map((option) => option.text());

describe("command palette", () => {
  it("lists the pages the user may open, on any page", async () => {
    loginAs(VIEWER);

    expect(await labels(await mountLayout())).toEqual([
      t("nav.dashboard"),
      t("nav.locales"),
      t("nav.entries"),
      t("nav.transfer"),
      t("nav.glossary"),
      t("nav.scopes"),
      t("nav.settings"),
    ]);
  });

  it("goes to the chosen page", async () => {
    loginAs(ALL_PERMISSIONS);

    const options = await openPalette(await mountLayout());

    await options
      .find((option) => option.text() === t("nav.webhooks"))!
      .trigger("click");

    // The route changes once the page's code has loaded.
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.path).toBe("/webhooks"),
    );
  });

  it("lists the open page's commands first, while it is open", async () => {
    loginAs([]);

    const run = vi.fn();
    const Page = pageWithCommands(run);
    const showPage = ref(true);
    const wrapper = await mountLayout(() => (showPage.value ? h(Page) : null));

    expect(await labels(wrapper)).toEqual([
      "Reload the list",
      t("nav.dashboard"),
      t("nav.settings"),
    ]);

    await (await openPalette(wrapper))[0]!.trigger("click");
    await settle();
    expect(run).toHaveBeenCalledOnce();

    showPage.value = false;
    await settle();

    expect(await labels(wrapper)).toEqual([
      t("nav.dashboard"),
      t("nav.settings"),
    ]);
  });

  describe("hint below the settings", () => {
    const hint = (wrapper: VueWrapper) =>
      wrapper
        .findAll("aside button")
        .find((button) => button.text().includes(t("commands.open")));

    it("opens the palette", async () => {
      loginAs([]);

      const wrapper = await mountLayout();

      await hint(wrapper)!.trigger("click");
      await settle();

      expect(wrapper.findAll('dialog[open] [role="option"]')).toHaveLength(2);
    });

    it("leaves the collapsed sidebar to its icons", async () => {
      loginAs([]);

      const wrapper = await mountLayout();

      expect(hint(wrapper)).toBeDefined();
      await wrapper
        .findComponent(SidebarToggle)
        .find("button")
        .trigger("click");
      await settle();

      expect(hint(wrapper)).toBeUndefined();
    });
  });
});
