import { describe, expect, it } from "vitest";
import { isNewerVersion, parseVersion } from "../../app/lib/version";

describe("versions", () => {
  it("reads releases, with or without the tag's v", () => {
    expect(parseVersion("2.1.0")).toEqual([2, 1, 0]);
    expect(parseVersion("v10.0.3")).toEqual([10, 0, 3]);
  });

  it("reads nothing from builds that aren't releases", () => {
    for (const version of ["dev", "develop", "2.1", "2.1.0-rc.1", "", null]) {
      expect(parseVersion(version)).toBeUndefined();
    }
  });

  it("compares releases number by number", () => {
    expect(isNewerVersion("2.1.0", "2.0.9")).toBe(true);
    expect(isNewerVersion("2.10.0", "2.9.0")).toBe(true);
    expect(isNewerVersion("3.0.0", "2.99.99")).toBe(true);
    expect(isNewerVersion("2.0.0", "2.0.0")).toBe(false);
    expect(isNewerVersion("1.9.0", "2.0.0")).toBe(false);
  });

  it("never offers an update to a build that isn't a release", () => {
    expect(isNewerVersion("2.1.0", "dev")).toBe(false);
    expect(isNewerVersion(undefined, "2.0.0")).toBe(false);
  });
});
