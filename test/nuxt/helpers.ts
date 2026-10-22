import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { useQueryClient } from "@tanstack/vue-query";
import type { Component } from "vue";
import type { RouteLocationRaw } from "vue-router";
import type { AppPageOptions } from "~/composables/usePage";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

export { ALL_PERMISSIONS, VIEWER } from "../permissions";

export function makeUser(
  permissions: readonly string[],
  overrides: Partial<User> = {},
): User {
  return {
    id: "user-1",
    email: "test@parlance.dev",
    name: "Test User",
    roles: [
      {
        id: "role-1",
        name: "test",
        permissions: permissions.map((name, index) => {
          const [action, ...resource] = name.split("_");
          return {
            id: `permission-${index}`,
            name,
            action,
            resource: resource.join("_"),
          };
        }),
      },
    ],
    ...overrides,
  };
}

// An unsigned JWT is enough: the app only decodes it to read the expiry.
function fakeToken() {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  return [
    encode({ alg: "none", typ: "JWT" }),
    encode({
      user_id: "user-1",
      email: "test@parlance.dev",
      iat: now,
      nbf: now,
      exp: now + 3600,
    }),
    "signature",
  ].join(".");
}

type RpcHandler = (body: Record<string, unknown>) => unknown;

// The setup file and the tests import this module separately, so the state the
// fetch stub reads lives on globalThis where both copies see it.
const state = ((globalThis as { __parlanceTest?: TestState }).__parlanceTest ??=
  { rpcHandlers: new Map(), currentUser: undefined });

type TestState = {
  rpcHandlers: Map<string, RpcHandler>;
  currentUser: User | undefined;
};

/** Signs in a user holding exactly these permissions. */
export function loginAs(permissions: readonly string[]) {
  state.currentUser = makeUser(permissions);
  const authStore = useAuthStore();
  authStore.setToken({ token: fakeToken(), refreshToken: fakeToken() });
  authStore.setUser(state.currentUser);
  return state.currentUser;
}

/** Swaps the signed-in user's permissions, as a reload from the server would. */
export function changePermissions(permissions: readonly string[]) {
  state.currentUser = makeUser(permissions);
  useAuthStore().setUser(state.currentUser);
}

export function logout() {
  state.currentUser = undefined;
  const authStore = useAuthStore();
  authStore.setUser(undefined);
  authStore.setToken();
}

/**
 * Answers an RPC such as "ScopeService/ListScopes", with a value or a promise of
 * one. Unregistered RPCs answer with an empty object, which every response schema
 * accepts.
 */
export function mockRpc(method: string, handler: RpcHandler | object) {
  state.rpcHandlers.set(
    method,
    typeof handler === "function" ? (handler as RpcHandler) : () => handler,
  );
}

export function resetRpcs() {
  state.rpcHandlers.clear();
}

export async function handleFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const match = new URL(request.url).pathname.match(/parlance\.v1\.(.+)$/);
  if (!match) return new Response("Not found", { status: 404 });

  const method = match[1]!;
  // The signed-in user, plus anything a test adds, e.g. translationEnabled.
  if (method === "AuthService/GetCurrentUser") {
    return Response.json({
      ...(state.rpcHandlers.get(method)?.({}) ?? {}),
      user: state.currentUser ?? null,
    });
  }

  const text = await request.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  // A handler may answer later, e.g. to check what shows while waiting.
  return Response.json((await state.rpcHandlers.get(method)?.(body)) ?? {});
}

/** Lets queries resolve and the DOM settle after mounting. */
export async function settle() {
  for (let i = 0; i < 5; i++) {
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Drops cached queries so each test fetches with its own fixtures. */
export function clearQueries() {
  useNuxtApp().vueApp.runWithContext(() => useQueryClient().clear());
}

export const pagination = (total: number) => ({
  page: 1,
  perPage: 20,
  total,
  totalPages: 1,
});

/** Translates a key the way the app does, so tests need not repeat English copy. */
export function t(key: string, params?: Record<string, unknown>) {
  return useNuxtApp().$i18n.t(key, params ?? {});
}

export type MountedPage = {
  wrapper: VueWrapper;
  /** What the page passed to usePage, which the layout turns into its header. */
  options: () => AppPageOptions;
  /** Labels of the header's primary and secondary actions. */
  headerActions: () => string[];
  /** Accessible names of the icon buttons, which carry no visible text. */
  iconButtons: () => string[];
  /** Visible text of the plain buttons. */
  buttons: () => string[];
  hasButton: (label: string) => boolean;
};

/** Mounts a page under a stand-in for the layout, which provides the page options. */
export async function mountPage(
  page: Component,
  options: { route?: RouteLocationRaw } = {},
): Promise<MountedPage> {
  let pageOptions: Ref<AppPageOptions> | undefined;
  const Host = defineComponent({
    setup() {
      pageOptions = usePageProvider();
      // The layout provides the toast stack the pages report through.
      provide("toastStack", ref(null));
      return () => h(page);
    },
  });

  const wrapper = await mountSuspended(Host, { route: options.route });
  await settle();

  // Closed dialogs stay in the DOM, so their buttons are not part of the page.
  // Buttons that navigate are links, so they count too.
  const buttons = () =>
    wrapper
      .findAll("button, a[aria-label]")
      .filter((button) => !button.element.closest("dialog:not([open])"));
  return {
    wrapper,
    options: () => pageOptions!.value,
    headerActions: () => {
      const { primaryAction, secondaryActions } = pageOptions!.value;
      return [primaryAction, ...(secondaryActions ?? [])]
        .filter((action) => !!action)
        .map((action) => String(action.content));
    },
    iconButtons: () =>
      buttons()
        .map((button) => button.attributes("aria-label"))
        .filter((label): label is string => !!label),
    buttons: () => buttons().map((button) => button.text().trim()),
    hasButton: (label) =>
      buttons().some(
        (button) =>
          button.attributes("aria-label") === label ||
          button.text().trim() === label,
      ),
  };
}

/**
 * Opens the action menu named `label` and returns its items, or none without the
 * menu. Each item's `label` leaves out its hint.
 */
export async function openActionMenu(page: MountedPage, label: string) {
  const trigger = page.wrapper.find(`button[aria-label="${label}"]`);
  if (!trigger.exists()) return [];
  if (trigger.attributes("aria-expanded") !== "true") {
    await trigger.trigger("click");
    await settle();
  }
  return page.wrapper.findAll('[role="menuitem"]').map((item) => ({
    item,
    label: item.find("span > span").text().trim(),
    hint: item.findAll("span > span")[1]?.text().trim(),
    disabled: item.attributes("aria-disabled") === "true",
  }));
}

/** The labels of the action menu named `label`. */
export async function actionMenuLabels(page: MountedPage, label: string) {
  return (await openActionMenu(page, label)).map((entry) => entry.label);
}
