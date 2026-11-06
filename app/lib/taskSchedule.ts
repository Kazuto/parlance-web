/** How often a task runs on its own, as picked in the form. */
export type SchedulePreset = "none" | "hourly" | "daily" | "weekly" | "custom";

export type ScheduleChoice = {
  preset: SchedulePreset;
  /** UTC hour of daily and weekly runs. */
  hour: number;
  /** Day of weekly runs, 0 for Sunday as in cron. */
  weekday: number;
  /** The cron expression of a custom schedule. */
  custom: string;
};

/** Reads a stored cron expression back into the form's choices. */
export function parseSchedule(cron: string | null | undefined): ScheduleChoice {
  const choice: ScheduleChoice = {
    preset: "none",
    hour: 3,
    weekday: 1,
    custom: "",
  };
  const expression = (cron ?? "").trim();

  if (!expression) return choice;

  if (expression === "0 * * * *" || expression === "@hourly") {
    return { ...choice, preset: "hourly" };
  }

  const daily = /^0 (\d{1,2}) \* \* \*$/.exec(expression);

  if (daily) return { ...choice, preset: "daily", hour: Number(daily[1]) };

  const weekly = /^0 (\d{1,2}) \* \* ([0-6])$/.exec(expression);

  if (weekly) {
    return {
      ...choice,
      preset: "weekly",
      hour: Number(weekly[1]),
      weekday: Number(weekly[2]),
    };
  }

  return { ...choice, preset: "custom", custom: expression };
}

/** Builds the cron expression of the form's choices; "" for no schedule. */
export function buildSchedule(choice: ScheduleChoice): string {
  switch (choice.preset) {
    case "hourly":
      return "0 * * * *";
    case "daily":
      return `0 ${choice.hour} * * *`;
    case "weekly":
      return `0 ${choice.hour} * * ${choice.weekday}`;
    case "custom":
      return choice.custom.trim();
    default:
      return "";
  }
}

/** A UTC hour as "03:00". */
export function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}
