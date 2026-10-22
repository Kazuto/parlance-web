import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { SplitView } from "@thkzt/eunoia";
import ListItem from "~/components/editor/ListItem.vue";
import DefaultTranslation from "~/components/entry/DefaultTranslation.vue";
import EntriesPage from "~/pages/entries/index.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
} from "./helpers";

async function mountItem(translation?: string) {
  const wrapper = await mountSuspended(ListItem, {
    props: { label: "app.title", missingCount: 0, missingLabel: "" },
    slots:
      translation === undefined
        ? {}
        : {
            tooltip: () =>
              h(DefaultTranslation, { translation, localeName: "English" }),
          },
  });
  await settle();
  return wrapper;
}

function hoverLabel(wrapper: Awaited<ReturnType<typeof mountItem>>) {
  const anchor = wrapper.find("span.truncate").element.parentElement!;
  anchor.dispatchEvent(new MouseEvent("mouseenter"));
  return anchor;
}

const tooltip = () => document.querySelector('[role="tooltip"]');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("entry key tooltip", () => {
  it("shows the default translation when the pointer rests on the key", async () => {
    loginAs(VIEWER);
    const wrapper = await mountItem("Hello world");

    hoverLabel(wrapper);
    await wait(350);
    await settle();

    // Rendered at the end of the page, so the virtualized list cannot clip it.
    expect(tooltip()!.parentElement).toBe(document.body);
    expect(tooltip()!.textContent?.trim()).toBe("Hello world");
    // Above the key and lined up with it, rather than beside the whole row.
    expect(tooltip()!.getAttribute("style")).toContain(
      "position-area: top span-right",
    );
    expect(wrapper.find("[aria-describedby]").text()).toBe("app.title");
  });

  it("takes the text from the list instead of loading the entry", async () => {
    loginAs(VIEWER);
    const wrapper = await mountItem("Hello world");
    vi.mocked(fetch).mockClear();

    hoverLabel(wrapper);
    await wait(350);
    await settle();

    expect(tooltip()).not.toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("waits briefly, so moving through the list opens nothing", async () => {
    loginAs(VIEWER);
    const wrapper = await mountItem("Hello world");

    const anchor = hoverLabel(wrapper);
    await wait(150);
    expect(tooltip()).toBeNull();

    anchor.dispatchEvent(new MouseEvent("mouseleave"));
    await wait(300);
    await settle();
    expect(tooltip()).toBeNull();
  });

  it("says when the entry has no default text yet", async () => {
    loginAs(VIEWER);
    const wrapper = await mountSuspended(DefaultTranslation, {
      props: { translation: "", localeName: "English" },
    });

    expect(wrapper.text()).toBe(
      t("entries.noDefaultTranslation", { language: "English" }),
    );
  });

  it("keeps the plain title where no tooltip is given", async () => {
    loginAs(VIEWER);
    const wrapper = await mountItem();
    expect(wrapper.find("span.truncate").attributes("title")).toBe("app.title");
  });

  it("drops the plain title where the tooltip replaces it", async () => {
    loginAs(VIEWER);
    const wrapper = await mountItem("Hello world");
    expect(wrapper.find("span.truncate").attributes("title")).toBeUndefined();
  });
});

describe("entries list", () => {
  it("passes each entry's default translation from the list to its row", async () => {
    loginAs(VIEWER);
    mockRpc("LocaleService/ListLocales", {
      locales: [{ id: "l1", code: "en", name: "English", isDefault: true }],
      pagination: pagination(1),
    });
    mockRpc("EntryService/ListEntries", {
      entries: [
        { id: "e1", key: "app.title", defaultTranslation: "Hello world" },
        { id: "e2", key: "app.empty" },
      ],
      pagination: pagination(2),
    });
    const page = await mountPage(EntriesPage);

    // The list is virtualized and renders no rows without a layout, so check the
    // items it is given.
    const items = page.wrapper.findComponent(SplitView).props("items");
    expect(items.map((item) => [item.label, item.defaultTranslation])).toEqual([
      ["app.title", "Hello world"],
      ["app.empty", ""],
    ]);
  });
});
