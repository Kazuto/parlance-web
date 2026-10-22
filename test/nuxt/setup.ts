import { afterEach, beforeEach, vi } from "vitest";
import { enableAutoUnmount } from "@vue/test-utils";
import { clearQueries, handleFetch, logout, resetRpcs } from "./helpers";

// Stubbed right away rather than per test: the auth middleware already fetches
// while the test app starts, and no test may reach the network.
vi.stubGlobal("fetch", vi.fn(handleFetch));

// Leaving a page with unsaved drafts asks first; happy-dom has no dialog, and the
// reset after each test must be able to leave.
vi.stubGlobal("confirm", () => true);

// Pages left mounted keep running their watchers and would leak into later tests.
enableAutoUnmount(afterEach);

beforeEach(() => {
  vi.mocked(fetch).mockClear();
});

afterEach(async () => {
  // The router outlives each test; a route left behind would leak its query.
  await useRouter().replace("/");
  logout();
  resetRpcs();
  clearQueries();
  // Remembered filters would leak into the next test.
  localStorage.clear();
});
