import { describe, expect, it } from "vitest";
import { ConfirmDialog, DatePicker, TimePicker } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import ReleasesPage from "~/pages/releases/index.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
  type MountedPage,
} from "../helpers";

const MANAGER = [
  ...VIEWER,
  "create_release",
  "update_release",
  "delete_release",
];

// As the server orders them: pending by date, unscheduled last, then those that
// went out.
const releases = [
  {
    id: "r1",
    name: "Spring",
    description: "New checkout",
    releaseAt: "2030-04-01T09:00:00Z",
    entryCount: 3,
  },
  { id: "r2", name: "Summer" },
  {
    id: "r3",
    name: "Winter",
    releaseAt: "2026-01-10T09:00:00Z",
    releasedAt: "2026-01-10T09:01:00Z",
    entryCount: 2,
  },
];

async function openReleases(permissions: readonly string[] = MANAGER) {
  const calls: { method: string; body: Record<string, unknown> }[] = [];

  loginAs(permissions);
  mockRpc("ReleaseService/ListReleases", {
    releases,
    pagination: pagination(releases.length),
  });

  for (const method of [
    "CreateRelease",
    "UpdateRelease",
    "DeleteRelease",
    "PublishRelease",
  ]) {
    mockRpc(`ReleaseService/${method}`, (body) => {
      calls.push({ method, body });

      return { release: releases[0] };
    });
  }

  const page = await mountPage(ReleasesPage);

  return { page, calls };
}

const row = (page: MountedPage, name: string) =>
  page.wrapper.findAll("tr").find((item) => item.text().includes(name))!;

async function clickIn(wrapper: { find: VueWrapper["find"] }, label: string) {
  await wrapper.find(`button[aria-label="${label}"]`).trigger("click");
  await settle();
}

/** The component of this kind inside the open dialog. */
function inDialog<T extends VueWrapper>(found: T[]) {
  return found.find((item) => item.element.closest("dialog[open]"));
}

async function submit(page: MountedPage) {
  await page.wrapper.find("dialog[open] form").trigger("submit");
  await settle();
}

const releaseDate = (at: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(at));

describe("releases page", () => {
  it("lists each release's date, status and entries", async () => {
    const { page } = await openReleases(VIEWER);
    const spring = row(page, "Spring").text();

    expect(spring).toContain("New checkout");
    expect(spring).toContain(releaseDate(releases[0]!.releaseAt!));
    expect(spring).toContain(t("releases.pending"));
    expect(spring).toContain("3");
    expect(row(page, "Summer").text()).toContain(t("releases.notScheduled"));
    expect(row(page, "Winter").text()).toContain(t("releases.released"));
    expect(
      row(page, "Spring")
        .find(`a[aria-label="${t("releases.showEntries")}"]`)
        .attributes("href"),
    ).toBe("/entries?releases=r1");
  });

  it("lets readers only look", async () => {
    const { page } = await openReleases(VIEWER);

    expect(page.headerActions()).toEqual([]);
    expect(page.iconButtons()).not.toContain(t("releases.publish"));
    expect(page.iconButtons()).not.toContain(t("releases.edit"));
    expect(page.iconButtons()).not.toContain(t("releases.delete"));
  });

  it("offers to release only those that haven't gone out", async () => {
    const { page } = await openReleases();

    expect(page.headerActions()).toEqual([t("releases.create")]);
    expect(
      page.iconButtons().filter((label) => label === t("releases.publish")),
    ).toHaveLength(2);
    expect(
      row(page, "Winter")
        .find(`button[aria-label="${t("releases.publish")}"]`)
        .exists(),
    ).toBe(false);
  });

  it("creates a release going out on the picked day and time", async () => {
    const { page, calls } = await openReleases();

    page.options().primaryAction?.onClick?.();
    await settle();
    await submit(page);

    expect(calls).toEqual([]);
    expect(page.wrapper.find("dialog[open]").text()).toContain(
      t("releases.nameRequired"),
    );

    await page.wrapper.find("dialog[open] input").setValue("Autumn");
    inDialog(page.wrapper.findAllComponents(DatePicker))!.vm.$emit(
      "update:modelValue",
      new Date(2030, 8, 15),
    );
    await settle();
    inDialog(page.wrapper.findAllComponents(TimePicker))!.vm.$emit(
      "update:modelValue",
      "14:30",
    );
    await settle();
    await submit(page);

    expect(calls).toEqual([
      {
        method: "CreateRelease",
        body: {
          name: "Autumn",
          description: "",
          releaseAt: new Date(2030, 8, 15, 14, 30).toISOString(),
        },
      },
    ]);
  });

  it("creates an unscheduled release", async () => {
    const { page, calls } = await openReleases();

    page.options().primaryAction?.onClick?.();
    await settle();

    expect(page.wrapper.find("dialog[open]").text()).toContain(
      t("releases.noDateHelp"),
    );

    await page.wrapper.find("dialog[open] input").setValue("Autumn");
    await submit(page);

    expect(calls).toEqual([
      { method: "CreateRelease", body: { name: "Autumn", description: "" } },
    ]);
  });

  it("clears a pending release's date", async () => {
    const { page, calls } = await openReleases();

    await clickIn(row(page, "Spring"), t("releases.edit"));

    // The picked time is the release's, in the browser's time zone.
    const at = new Date(releases[0]!.releaseAt!);
    const pad = (value: number) => String(value).padStart(2, "0");

    expect(
      inDialog(page.wrapper.findAllComponents(TimePicker))!.props("modelValue"),
    ).toBe(`${pad(at.getHours())}:${pad(at.getMinutes())}`);

    await page.wrapper
      .findAll("dialog[open] button")
      .find((button) => button.text().trim() === t("releases.clearDate"))!
      .trigger("click");
    await settle();
    await submit(page);

    expect(calls).toEqual([
      {
        method: "UpdateRelease",
        body: {
          id: "r1",
          name: "Spring",
          description: "New checkout",
          clearReleaseAt: true,
        },
      },
    ]);
  });

  it("keeps the date of a release that went out", async () => {
    const { page, calls } = await openReleases();

    await clickIn(row(page, "Winter"), t("releases.edit"));

    expect(
      inDialog(page.wrapper.findAllComponents(DatePicker)),
    ).toBeUndefined();
    expect(page.wrapper.find("dialog[open]").text()).toContain(
      t("releases.wentOut", { date: releaseDate(releases[2]!.releasedAt!) }),
    );

    await submit(page);

    expect(calls).toEqual([
      {
        method: "UpdateRelease",
        body: { id: "r3", name: "Winter", description: "" },
      },
    ]);
  });

  it("releases now once confirmed, saying how many entries go out", async () => {
    const { page, calls } = await openReleases();

    await clickIn(row(page, "Spring"), t("releases.publish"));

    const dialog = page.wrapper.find("dialog[open]");

    expect(dialog.text()).toContain(
      t("releases.publishConfirm", { count: 3 }, 3),
    );

    await dialog
      .findAll("button")
      .find((button) => button.text().trim() === t("releases.publish"))!
      .trigger("click");
    await settle();

    expect(calls).toEqual([{ method: "PublishRelease", body: { id: "r1" } }]);
  });

  it.each([
    ["Spring", "r1", "releases.deletePending"],
    ["Summer", "r2", "releases.deleteEmpty"],
    ["Winter", "r3", "releases.deleteReleased"],
  ])("says what deleting %s does, then deletes it", async (name, id, key) => {
    const { page, calls } = await openReleases();
    const consequence = t(key, { count: 3 }, 3);

    await clickIn(row(page, name), t("releases.delete"));

    const confirm = page.wrapper
      .findAllComponents(ConfirmDialog)
      .find((item) => item.props("open"))!;

    expect(confirm.props("title")).toBe(t("releases.deleteTitle", { name }));
    expect(confirm.text()).toContain(consequence);

    confirm.vm.$emit("confirm");
    await settle();

    expect(calls).toEqual([{ method: "DeleteRelease", body: { id } }]);
  });
});
