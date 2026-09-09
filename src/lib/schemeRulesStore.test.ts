import { describe, it, expect, beforeEach } from "vitest";
import { setSchemeRules, getSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";

describe("schemeRulesStore", () => {
  beforeEach(() => clearSchemeRulesStore());

  it("returns undefined for a scheme that was never set", () => {
    expect(getSchemeRules("pmegp")).toBeUndefined();
  });

  it("returns what was set for a given scheme id", () => {
    setSchemeRules("pmegp", { dscr_benchmark: 1.25 });
    expect(getSchemeRules("pmegp")).toEqual({ dscr_benchmark: 1.25 });
  });

  it("keeps different schemes independent", () => {
    setSchemeRules("pmegp", { dscr_benchmark: 1.25 });
    setSchemeRules("mudra_shishu", { dscr_benchmark: 1.10 });
    expect(getSchemeRules("pmegp")?.dscr_benchmark).toBe(1.25);
    expect(getSchemeRules("mudra_shishu")?.dscr_benchmark).toBe(1.10);
  });

  it("clearSchemeRulesStore wipes everything", () => {
    setSchemeRules("pmegp", { dscr_benchmark: 1.25 });
    clearSchemeRulesStore();
    expect(getSchemeRules("pmegp")).toBeUndefined();
  });
});
