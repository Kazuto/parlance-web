import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import RelativeTime from "~/components/RelativeTime.vue";

const now = Date.UTC(2026, 9, 23, 12, 0, 0);
const minute = 60_000;

// eunoia formats the times; these check what the app passes it.
describe("RelativeTime", () => {
  afterEach(async () => {
    vi.useRealTimers();
    await useNuxtApp().$i18n.setLocale("en");
  });

  it("keeps up as time passes", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    vi.setSystemTime(now);

    const wrapper = await mountSuspended(RelativeTime, {
      props: { timestamp: new Date(now + minute).toISOString() },
    });
    const shown = () => wrapper.find("span").text();

    expect(shown()).toBe("in 1 minute");

    vi.advanceTimersByTime(30_000);
    await nextTick();
    expect(shown()).toBe("in 30 seconds");

    vi.advanceTimersByTime(31_000);
    await nextTick();
    expect(shown()).toBe("1 second ago");
  });

  it("follows the interface language", async () => {
    const wrapper = await mountSuspended(RelativeTime, {
      props: { timestamp: new Date(Date.now() - 60 * minute).toISOString() },
    });

    expect(wrapper.find("span").text()).toBe("1 hour ago");

    await useNuxtApp().$i18n.setLocale("de");
    await nextTick();

    expect(wrapper.find("span").text()).toBe("vor 1 Stunde");
  });
});
