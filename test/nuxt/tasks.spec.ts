import { describe, expect, it } from "vitest";
import TasksPage from "~/pages/tasks/index.vue";
import {
  ALL_PERMISSIONS,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
  type MountedPage,
} from "./helpers";

// As the API sends them: false and empty values are left out.
const tasks = [
  {
    id: "t1",
    name: "Ship translations",
    type: "TASK_TYPE_GIT_EXPORT",
    enabled: true,
    events: ["TASK_EVENT_TRANSLATIONS_APPROVED"],
    eventDelayMinutes: 10,
    hasToken: true,
    gitExport: {
      repository: "acme/app",
      baseBranch: "main",
      branch: "parlance/translations",
      files: [{ format: "EXPORT_FORMAT_JSON", path: "lang/{locale}.json" }],
    },
    lastRun: {
      id: "r1",
      taskId: "t1",
      trigger: "TASK_TRIGGER_EVENT",
      status: "TASK_RUN_STATUS_SUCCEEDED",
      createdAt: "2026-10-23T10:00:00Z",
      summary: {
        outcome: "updated",
        changedFiles: ["lang/de.json"],
        pullRequestUrl: "https://github.example/acme/app/pull/7",
      },
    },
  },
  {
    id: "t2",
    name: "Nightly drafts",
    type: "TASK_TYPE_AI_TRANSLATE",
    enabled: true,
    schedule: "0 3 * * *",
    nextRunAt: "2026-10-24T03:00:00Z",
    aiTranslate: { maxPairs: 200, applyTerminology: true },
  },
];

async function openTasks(permissions: readonly string[]) {
  const calls: { method: string; body: Record<string, unknown> }[] = [];

  loginAs(permissions);
  mockRpc("TaskService/ListTasks", { tasks });
  mockRpc("TaskService/GetTaskSettings", { settings: {} });
  mockRpc("TaskService/ListTaskRuns", {
    runs: [
      tasks[0]!.lastRun,
      {
        id: "r0",
        taskId: "t1",
        trigger: "TASK_TRIGGER_MANUAL",
        triggeredBy: "u1",
        triggeredByUser: { id: "u1", name: "Admin User" },
        status: "TASK_RUN_STATUS_FAILED",
        createdAt: "2026-10-23T09:00:00Z",
      },
    ],
    pagination: pagination(1),
  });
  mockRpc("TaskService/GetTaskRun", {
    run: {
      ...tasks[0]!.lastRun,
      log: "10:00:01 Changed 1 files: lang/de.json\n",
    },
  });

  for (const method of [
    "CreateTask",
    "UpdateTask",
    "RunTask",
    "UpdateTaskSettings",
  ]) {
    mockRpc(`TaskService/${method}`, (body) => {
      calls.push({ method, body });

      if (method === "RunTask") {
        return { run: { id: "r2", status: "TASK_RUN_STATUS_QUEUED" } };
      }

      return method === "UpdateTaskSettings"
        ? { settings: body }
        : { task: tasks[0] };
    });
  }

  const page = await mountPage(TasksPage);

  return { page, calls };
}

const button = (page: MountedPage, label: string) =>
  page.wrapper
    .findAll("button")
    .filter((item) => !item.element.closest("dialog:not([open])"))
    .find(
      (item) =>
        item.text().trim() === label || item.attributes("aria-label") === label,
    );

/** The open dialog's form fields, by their label text. */
function dialogField(page: MountedPage, label: string) {
  const dialog = page.wrapper.find("dialog[open]");
  const labelEl = dialog
    .findAll("label")
    .find((item) => item.text().trim().startsWith(label));
  const id = labelEl?.attributes("for");

  return id ? dialog.find(`#${CSS.escape(id)}`) : labelEl!.find("input");
}

describe("tasks page", () => {
  it("lists the tasks with their triggers and last run", async () => {
    const { page } = await openTasks(["read_task"]);
    const text = page.wrapper.text();

    expect(text).toContain("Ship translations");
    expect(text).toContain("acme/app · main ← parlance/translations");
    expect(text).toContain(
      t("tasks.describe.onApproval", { count: 10 }).split(" | ")[2] ?? "",
    );
    expect(text).toContain(t("tasks.describe.daily", { time: "03:00" }));
    expect(text).toContain(t("tasks.outcome.updated", { count: 1 }));
    expect(text).toContain(t("tasks.neverRun"));
    // Reading only: no way to start, change or add tasks.
    expect(button(page, t("tasks.runNow"))).toBeUndefined();
    expect(page.headerActions()).toEqual([]);
  });

  it("pauses all tasks", async () => {
    const { page, calls } = await openTasks(ALL_PERMISSIONS);
    const runTasks = page.wrapper.find<HTMLInputElement>(
      `input[role="switch"][aria-label="${t("tasks.runTasks")}"]`,
    );

    expect(runTasks.element.checked).toBe(true);
    await runTasks.setValue(false);
    await settle();

    expect(calls).toEqual([
      { method: "UpdateTaskSettings", body: { paused: true } },
    ]);
  });

  it("shows readers whether tasks run, without letting them change it", async () => {
    const { page } = await openTasks(["read_task"]);

    expect(
      page.wrapper
        .find(`input[role="switch"][aria-label="${t("tasks.runTasks")}"]`)
        .attributes("disabled"),
    ).toBeDefined();
  });

  it("starts a run and shows the task's runs", async () => {
    const { page, calls } = await openTasks(ALL_PERMISSIONS);

    await button(page, t("tasks.runNow"))!.trigger("click");
    await settle();

    expect(calls).toEqual([{ method: "RunTask", body: { id: "t1" } }]);
    expect(button(page, t("tasks.hideRuns"))).toBeDefined();
  });

  it("opens a run with its log", async () => {
    const { page } = await openTasks(["read_task"]);

    await button(page, t("tasks.showRuns"))!.trigger("click");
    await settle();
    await page.wrapper
      .findAll("li button")
      .find((item) =>
        item.text().includes(t("tasks.triggerType.TASK_TRIGGER_EVENT")),
      )!
      .trigger("click");
    await settle();

    expect(page.wrapper.find("dialog[open]").text()).toContain(
      "Changed 1 files: lang/de.json",
    );
    // Runs started by hand say by whom.
    expect(page.wrapper.text()).toContain(
      `Admin User · ${t("tasks.triggerType.TASK_TRIGGER_MANUAL")}`,
    );
  });

  it("keeps a saved token unless one is typed", async () => {
    const { page, calls } = await openTasks(ALL_PERMISSIONS);
    const edit = () =>
      button(page, t("tasks.editFor", { name: "Ship translations" }))!;

    await edit().trigger("click");
    await settle();
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(calls.at(-1)?.method).toBe("UpdateTask");
    expect(calls.at(-1)?.body).not.toHaveProperty("token");
    expect(calls.at(-1)?.body).not.toHaveProperty("aiTranslate");
    expect(calls.at(-1)?.body).toMatchObject({
      id: "t1",
      events: ["TASK_EVENT_TRANSLATIONS_APPROVED"],
      eventDelayMinutes: 10,
      gitExport: { repository: "acme/app" },
    });

    await edit().trigger("click");
    await settle();
    await dialogField(page, t("tasks.git.token")).setValue("ghp_new");
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(calls.at(-1)?.body).toMatchObject({ id: "t1", token: "ghp_new" });
  });

  it("adds a machine translation task", async () => {
    const { page, calls } = await openTasks(ALL_PERMISSIONS);

    page.options().primaryAction?.onClick?.();
    await settle();
    await dialogField(page, t("common.name")).setValue("Fill gaps");
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(calls).toEqual([
      {
        method: "CreateTask",
        body: {
          name: "Fill gaps",
          type: "TASK_TYPE_AI_TRANSLATE",
          enabled: true,
          schedule: "",
          events: [],
          eventDelayMinutes: 10,
          aiTranslate: {
            sourceLocaleId: "",
            targetLocaleIds: [],
            scopeIds: [],
            applyTerminology: true,
            maxPairs: 200,
          },
        },
      },
    ]);
  });
});
