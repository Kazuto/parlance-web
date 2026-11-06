import { formatHour } from "~/lib/taskSchedule";

/** The hours and weekdays a daily or weekly schedule picks from, in UTC. */
export function useScheduleOptions() {
  const { locale } = useI18n();

  const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: `${formatHour(hour)} UTC`,
  }));
  // 7 January 2024 was a Sunday, day 0 in cron.
  const weekdayOptions = computed(() => {
    const format = new Intl.DateTimeFormat(locale.value, {
      weekday: "long",
      timeZone: "UTC",
    });

    return Array.from({ length: 7 }, (_, day) => ({
      value: day,
      label: format.format(new Date(Date.UTC(2024, 0, 7 + day))),
    }));
  });

  return { hourOptions, weekdayOptions };
}
