import { describe, expect, it } from "vitest";
import WebhooksPage from "~/pages/webhooks/index.vue";
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
const webhooks = [
  {
    id: "w1",
    name: "CI build",
    url: "https://ci.example/hooks/parlance",
    events: [
      "WEBHOOK_EVENT_TASK_RUN_FAILED",
      "WEBHOOK_EVENT_TRANSLATIONS_APPROVED",
    ],
    enabled: true,
    hasSecret: true,
    lastDelivery: {
      id: "d1",
      webhookId: "w1",
      event: "WEBHOOK_EVENT_TRANSLATIONS_APPROVED",
      status: "WEBHOOK_DELIVERY_STATUS_FAILED",
      attempts: 5,
      responseStatus: 503,
      error: "the receiver answered 503 Service Unavailable",
      createdAt: "2026-10-23T10:00:00Z",
    },
  },
  {
    id: "w2",
    name: "Chat",
    url: "http://chat.internal/hook",
    events: ["WEBHOOK_EVENT_ENTRIES_CREATED"],
    schedule: "0 9 * * *",
    collectedCount: 3,
  },
];

const payload =
  '{"id":"e1","event":"translations.approved","data":{"count":1}}';

async function openWebhooks(permissions: readonly string[]) {
  const calls: { method: string; body: Record<string, unknown> }[] = [];

  loginAs(permissions);
  mockRpc("WebhookService/ListWebhooks", { webhooks });
  mockRpc("WebhookService/ListWebhookDeliveries", {
    deliveries: [
      webhooks[0]!.lastDelivery,
      {
        id: "d0",
        webhookId: "w1",
        event: "WEBHOOK_EVENT_PING",
        status: "WEBHOOK_DELIVERY_STATUS_SUCCEEDED",
        attempts: 1,
        responseStatus: 200,
        durationMs: 42,
        createdAt: "2026-10-23T09:00:00Z",
      },
    ],
    pagination: pagination(2),
  });
  mockRpc("WebhookService/GetWebhookDelivery", (body) => ({
    delivery: {
      ...webhooks[0]!.lastDelivery,
      id: body.id,
      payload,
      responseBody: "upstream down",
    },
  }));

  for (const method of [
    "CreateWebhook",
    "UpdateWebhook",
    "TestWebhook",
    "RedeliverWebhookDelivery",
  ]) {
    mockRpc(`WebhookService/${method}`, (body) => {
      calls.push({ method, body });

      if (method === "TestWebhook") {
        return {
          delivery:
            body.id === "w1"
              ? {
                  id: "d2",
                  status: "WEBHOOK_DELIVERY_STATUS_SUCCEEDED",
                  responseStatus: 204,
                  durationMs: 120,
                }
              : {
                  id: "d3",
                  status: "WEBHOOK_DELIVERY_STATUS_FAILED",
                  error: "connection refused",
                },
        };
      }

      if (method === "RedeliverWebhookDelivery") {
        return {
          delivery: { id: "d4", status: "WEBHOOK_DELIVERY_STATUS_SUCCEEDED" },
        };
      }

      return { webhook: webhooks[0] };
    });
  }

  const page = await mountPage(WebhooksPage);

  return { page, calls };
}

// Closed dialogs stay in the DOM, so their buttons don't count.
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

const submitDialog = async (page: MountedPage) => {
  await page.wrapper.find("dialog[open] form").trigger("submit");
  await settle();
};

describe("webhooks page", () => {
  it("lists the webhooks for reading only", async () => {
    const { page } = await openWebhooks(["read_webhook"]);
    const text = page.wrapper.text();

    expect(text).toContain("https://ci.example/hooks/parlance");
    // Events in the form's order, whatever order they come in.
    expect(text).toContain(
      `${t("webhooks.event.WEBHOOK_EVENT_TRANSLATIONS_APPROVED")} · ${t("webhooks.event.WEBHOOK_EVENT_TASK_RUN_FAILED")}`,
    );
    expect(text).toContain(t("webhooks.signed"));
    expect(text).toContain("the receiver answered 503 Service Unavailable");
    expect(text).toContain(t("webhooks.inactive"));
    expect(text).toContain(t("webhooks.neverDelivered"));
    expect(text).toContain(t("webhooks.describe.immediate"));
    expect(text).toContain(t("webhooks.describe.daily", { time: "09:00" }));
    expect(text).toContain(
      t("webhooks.collected", { count: 3 }).split(" | ")[1] ?? "",
    );
    expect(page.headerActions()).toEqual([]);
    expect(button(page, t("webhooks.test"))).toBeUndefined();
    expect(
      button(page, t("webhooks.editFor", { name: "CI build" })),
    ).toBeUndefined();
    expect(
      page.wrapper
        .findAll('input[role="switch"]')
        .filter((item) => !item.element.closest("dialog:not([open])")),
    ).toEqual([]);
  });

  it("adds a webhook with a generated secret", async () => {
    const { page, calls } = await openWebhooks(ALL_PERMISSIONS);

    page.options().primaryAction?.onClick?.();
    await settle();
    await dialogField(page, t("common.name")).setValue("Deploy");
    await dialogField(page, t("webhooks.url")).setValue(
      "https://deploy.example/hook",
    );
    await button(page, t("webhooks.generateSecret"))!.trigger("click");
    await submitDialog(page);

    expect(calls).toEqual([
      {
        method: "CreateWebhook",
        body: {
          name: "Deploy",
          url: "https://deploy.example/hook",
          enabled: true,
          format: "WEBHOOK_FORMAT_JSON",
          schedule: "",
          events: ["WEBHOOK_EVENT_TRANSLATIONS_APPROVED"],
          secret: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      },
    ]);
  });

  it("picks the format a chat service's address takes", async () => {
    const { page, calls } = await openWebhooks(ALL_PERMISSIONS);

    page.options().primaryAction?.onClick?.();
    await settle();
    await dialogField(page, t("common.name")).setValue("Team chat");
    await dialogField(page, t("webhooks.url")).setValue(
      "https://discord.com/api/webhooks/1/token",
    );
    await submitDialog(page);

    expect(calls.at(-1)?.body).toMatchObject({
      format: "WEBHOOK_FORMAT_DISCORD",
    });

    // A saved webhook keeps its format, but says when its address takes another.
    await button(page, t("webhooks.editFor", { name: "Chat" }))!.trigger(
      "click",
    );
    await settle();
    await dialogField(page, t("webhooks.url")).setValue(
      "https://hooks.slack.com/services/T0/B0/x",
    );
    await settle();

    expect(page.wrapper.find("dialog[open] [role=status]").text()).toBe(
      t("webhooks.formatMismatch", {
        format: t("webhooks.format.WEBHOOK_FORMAT_SLACK"),
      }),
    );

    await submitDialog(page);

    // Its digest schedule stays as it was.
    expect(calls.at(-1)?.body).toMatchObject({
      id: "w2",
      format: "WEBHOOK_FORMAT_JSON",
      schedule: "0 9 * * *",
    });
  });

  it("needs at least one event", async () => {
    const { page, calls } = await openWebhooks(ALL_PERMISSIONS);

    page.options().primaryAction?.onClick?.();
    await settle();
    await dialogField(page, t("common.name")).setValue("Deploy");
    await dialogField(page, t("webhooks.url")).setValue(
      "https://deploy.example/hook",
    );
    await dialogField(
      page,
      t("webhooks.event.WEBHOOK_EVENT_TRANSLATIONS_APPROVED"),
    ).setValue(false);
    await submitDialog(page);

    expect(calls).toEqual([]);
    expect(page.wrapper.find("dialog[open] [role=alert]").text()).toBe(
      t("webhooks.eventsRequired"),
    );
  });

  it("keeps a saved secret unless it is replaced or removed", async () => {
    const { page, calls } = await openWebhooks(ALL_PERMISSIONS);
    const edit = () =>
      button(page, t("webhooks.editFor", { name: "CI build" }))!;

    await edit().trigger("click");
    await settle();
    expect(dialogField(page, t("webhooks.secret")).element).toHaveProperty(
      "value",
      "",
    );
    await submitDialog(page);

    expect(calls.at(-1)).toEqual({
      method: "UpdateWebhook",
      body: {
        id: "w1",
        name: "CI build",
        url: "https://ci.example/hooks/parlance",
        enabled: true,
        format: "WEBHOOK_FORMAT_JSON",
        schedule: "",
        events: {
          events: [
            "WEBHOOK_EVENT_TRANSLATIONS_APPROVED",
            "WEBHOOK_EVENT_TASK_RUN_FAILED",
          ],
        },
      },
    });

    await edit().trigger("click");
    await settle();
    await dialogField(page, t("webhooks.removeSecret")).setValue(true);
    await submitDialog(page);

    expect(calls.at(-1)?.body).toMatchObject({ id: "w1", secret: "" });
  });

  it("switches a webhook off", async () => {
    const { page, calls } = await openWebhooks(ALL_PERMISSIONS);

    await page.wrapper
      .find(
        `input[role="switch"][aria-label="${t("webhooks.enableFor", { name: "CI build" })}"]`,
      )
      .setValue(false);
    await settle();

    expect(calls).toEqual([
      { method: "UpdateWebhook", body: { id: "w1", enabled: false } },
    ]);
  });

  it("sends a test and shows the result", async () => {
    const { page } = await openWebhooks(ALL_PERMISSIONS);
    const tests = page.wrapper
      .findAll("button")
      .filter((item) => item.text().trim() === t("webhooks.test"));

    await tests[0]!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain(
      t("webhooks.testOk", { status: 204, ms: 120 }),
    );

    await tests[1]!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain(
      t("webhooks.testFailed", { error: "connection refused" }),
    );
  });

  it("opens a delivery and sends it again", async () => {
    const { page, calls } = await openWebhooks(ALL_PERMISSIONS);

    await page.wrapper
      .findAll("button")
      .find((item) => item.text().trim() === t("webhooks.showDeliveries"))!
      .trigger("click");
    await settle();
    await page.wrapper
      .findAll("li button")
      .find((item) =>
        item.text().includes(t("webhooks.event.WEBHOOK_EVENT_PING")),
      )!
      .trigger("click");
    await settle();

    const dialog = () => page.wrapper.find("dialog[open]");

    // The body is shown indented, the response as it came.
    expect(dialog().text()).toContain('"event": "translations.approved"');
    expect(dialog().text()).toContain("upstream down");

    await button(page, t("webhooks.redeliver"))!.trigger("click");
    await settle();

    expect(calls).toEqual([
      { method: "RedeliverWebhookDelivery", body: { id: "d0" } },
    ]);
  });
});
