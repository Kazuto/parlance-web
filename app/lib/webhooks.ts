import type {
  WebhookDelivery,
  WebhookEvent,
  WebhookFormat,
} from "~/lib/api/schemas/parlance/v1/WebhookSchema";

/** The events a webhook can subscribe to, in the order the form lists them. */
export const WEBHOOK_EVENTS = [
  "WEBHOOK_EVENT_TRANSLATIONS_AWAITING_APPROVAL",
  "WEBHOOK_EVENT_TRANSLATIONS_APPROVED",
  "WEBHOOK_EVENT_TRANSLATIONS_REJECTED",
  "WEBHOOK_EVENT_ENTRIES_CREATED",
  "WEBHOOK_EVENT_TASK_RUN_SUCCEEDED",
  "WEBHOOK_EVENT_TASK_RUN_FAILED",
] as const satisfies readonly WebhookEvent[];

/** The formats a webhook can post in, in the order the form lists them. */
export const WEBHOOK_FORMATS = [
  "WEBHOOK_FORMAT_JSON",
  "WEBHOOK_FORMAT_SLACK",
  "WEBHOOK_FORMAT_DISCORD",
] as const satisfies readonly WebhookFormat[];

/**
 * The format a chat service's webhook address takes, for the services Parlance
 * knows: Discord, also through its Slack-compatible "/slack" endpoint, and Slack.
 */
export function formatForUrl(value: string): WebhookFormat | undefined {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (/(^|\.)discord(app)?\.com$/.test(url.hostname)) {
    return url.pathname.replace(/\/$/, "").endsWith("/slack")
      ? "WEBHOOK_FORMAT_SLACK"
      : "WEBHOOK_FORMAT_DISCORD";
  }

  return url.hostname === "hooks.slack.com"
    ? "WEBHOOK_FORMAT_SLACK"
    : undefined;
}

/**
 * Whether a delivery is being sent or about to be, so views showing it refresh.
 * Pending deliveries that wait longer for their next attempt don't count.
 */
export function isSendingSoon(delivery?: WebhookDelivery | null) {
  if (delivery?.status !== "WEBHOOK_DELIVERY_STATUS_PENDING") return false;
  if (!delivery.nextAttemptAt) return true;

  return new Date(delivery.nextAttemptAt).getTime() - Date.now() < 90_000;
}

/** A random signing secret: 32 bytes as hex. */
export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** Shows a JSON body indented, and anything else as it is. */
export function formatBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
