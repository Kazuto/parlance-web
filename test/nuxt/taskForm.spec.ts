import { describe, expect, it } from "vitest";
import { formToSettings, taskToForm } from "~/lib/taskForm";
import { buildSchedule, parseSchedule } from "~/lib/taskSchedule";

describe("task schedules", () => {
  it.each([
    ["", "none"],
    ["0 * * * *", "hourly"],
    ["0 3 * * *", "daily"],
    ["0 18 * * 5", "weekly"],
    ["30 2 * * 1-5", "custom"],
  ])("reads %j back as %s and builds it again", (cron, preset) => {
    const choice = parseSchedule(cron);

    expect(choice.preset).toBe(preset);
    expect(buildSchedule(choice)).toBe(cron);
  });

  it("builds the picked hour and day", () => {
    expect(
      buildSchedule({ preset: "weekly", hour: 7, weekday: 0, custom: "" }),
    ).toBe("0 7 * * 0");
  });
});

describe("task form", () => {
  it("sends only the config of the task's type", () => {
    const form = taskToForm(undefined, "TASK_TYPE_GIT_EXPORT");

    form.name = "  Ship  ";
    form.git.repository = " acme/app ";
    form.onApproval = true;

    const settings = formToSettings(form);

    expect(settings).toMatchObject({
      name: "Ship",
      schedule: "",
      events: ["TASK_EVENT_TRANSLATIONS_APPROVED"],
      eventDelayMinutes: 10,
      gitExport: {
        repository: "acme/app",
        baseBranch: "main",
        branch: "parlance/translations",
        files: [{ format: "EXPORT_FORMAT_JSON", path: "lang/{locale}.json" }],
      },
    });
    expect(settings).not.toHaveProperty("aiTranslate");
  });

  it("keeps a saved task's settings when saved unchanged", () => {
    const task = {
      id: "t1",
      name: "Nightly",
      type: "TASK_TYPE_AI_TRANSLATE" as const,
      schedule: "0 3 * * *",
      aiTranslate: { targetLocaleIds: ["de"], maxPairs: 50 },
    };

    expect(formToSettings(taskToForm(task))).toEqual({
      name: "Nightly",
      // The API leaves out false values.
      enabled: false,
      schedule: "0 3 * * *",
      events: [],
      eventDelayMinutes: 0,
      aiTranslate: {
        sourceLocaleId: "",
        targetLocaleIds: ["de"],
        scopeIds: [],
        applyTerminology: false,
        maxPairs: 50,
      },
    });
  });
});
