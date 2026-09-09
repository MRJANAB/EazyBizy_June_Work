import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSchemeRules } from "./rulesApi";

describe("fetchSchemeRules", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the rules object on a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scheme_id: "pmegp", rules: { dscr_benchmark: 1.25 } }),
    }));
    const rules = await fetchSchemeRules("pmegp");
    expect(rules).toEqual({ dscr_benchmark: 1.25 });
  });

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const rules = await fetchSchemeRules("not_a_scheme");
    expect(rules).toBeNull();
  });

  it("returns null on a network error, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const rules = await fetchSchemeRules("pmegp");
    expect(rules).toBeNull();
  });
});
