import { describe, it, expect, afterEach } from "vitest";
import { getStep6Tips, getStep9Tips } from "./caGuidance";
import { setSchemeRules, clearSchemeRulesStore } from "./schemeRulesStore";

describe("caGuidance DSCR tips are scheme-specific, not stale hardcoded text", () => {
  afterEach(() => clearSchemeRulesStore());

  it("getStep6Tips falls back to 1.25 when no rules are fetched", () => {
    const tips = getStep6Tips({ industry: "manufacturing", scheme: "pmegp" });
    expect(tips.some((t) => t.includes("DSCR > 1.25"))).toBe(true);
  });

  it("getStep6Tips reflects Mudra Shishu's fetched 1.10 benchmark, not 1.25", () => {
    setSchemeRules("mudra_shishu", { benchmarks: { dscr_avg: 1.10 } as any });
    const tips = getStep6Tips({ industry: "manufacturing", scheme: "mudra_shishu" });
    expect(tips.some((t) => t.includes("DSCR > 1.1"))).toBe(true);
    expect(tips.some((t) => t.includes("DSCR > 1.25"))).toBe(false);
  });

  it("getStep9Tips PMEGP guidance uses the fetched benchmark, not a hardcoded 1.25", () => {
    setSchemeRules("pmegp", { benchmarks: { dscr_avg: 1.25 } as any });
    const tips = getStep9Tips({ industry: "manufacturing", scheme: "pmegp" });
    expect(tips.some((t) => t.includes("PMEGP DSCR: Minimum 1.25x"))).toBe(true);
  });

  it("getStep9Tips CGTMSE guidance no longer claims a stale 1.5x when the real benchmark is 1.25", () => {
    setSchemeRules("cgtmse", { benchmarks: { dscr_avg: 1.25 } as any });
    const tips = getStep9Tips({ industry: "manufacturing", scheme: "cgtmse" });
    expect(tips.some((t) => t.includes("CGTMSE DSCR") && t.includes("1.25x"))).toBe(true);
    expect(tips.some((t) => t.includes("1.5x"))).toBe(false);
  });

  it("getStep9Tips Normal MSME guidance no longer claims a stale 1.33x when the real benchmark is 1.25", () => {
    setSchemeRules("normal_msme", { benchmarks: { dscr_avg: 1.25 } as any });
    const tips = getStep9Tips({ industry: "manufacturing", scheme: "normal_msme" });
    expect(tips.some((t) => t.includes("Normal MSME DSCR") && t.includes("1.25x"))).toBe(true);
    expect(tips.some((t) => t.includes("1.33x"))).toBe(false);
  });
});
