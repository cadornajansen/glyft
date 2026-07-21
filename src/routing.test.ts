import { describe, it, expect } from "vitest";
import { resolveAppRoute } from "./routing";

describe("resolveAppRoute", () => {
  it("should select landing page for /", () => {
    expect(resolveAppRoute("/")).toBe("landing");
  });

  it("should select editor for /editor", () => {
    expect(resolveAppRoute("/editor")).toBe("editor");
  });

  it("should select editor for /editor/ (trailing slash normalized)", () => {
    expect(resolveAppRoute("/editor/")).toBe("editor");
  });

  it("should select landing page for unknown paths", () => {
    expect(resolveAppRoute("/unknown")).toBe("landing");
    expect(resolveAppRoute("/some/other/path")).toBe("landing");
  });

  it("should handle root path variations deterministically", () => {
    expect(resolveAppRoute("")).toBe("landing");
    expect(resolveAppRoute("/index.html")).toBe("landing");
  });
});
