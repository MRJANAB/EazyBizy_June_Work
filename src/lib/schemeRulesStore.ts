/**
 * schemeRulesStore.ts — module-level cache of backend-resolved scheme
 * financing rules, keyed by scheme id.
 *
 * Why a plain store instead of threading a parameter through every call
 * site: loanRulesEngine.ts's PMEGP calculation functions are pure,
 * synchronous functions called from a dozen places across the wizard
 * (getFinancingPlan, ApplicationPreview, BankabilityBar, CMAReportStep,
 * ProjectRequirementsStep, ...). useSchemeRules() populates this store
 * once per scheme selection; those functions read from it synchronously
 * and fall back to their existing local constants if a scheme hasn't
 * been fetched yet (first render) or the fetch failed — so every call
 * site gets backend-resolved values automatically, with no changes.
 */

import type { SchemeFinancingRules } from "./rulesApi";

const store = new Map<string, SchemeFinancingRules>();

export function setSchemeRules(schemeId: string, rules: SchemeFinancingRules): void {
  store.set(schemeId, rules);
}

export function getSchemeRules(schemeId: string): SchemeFinancingRules | undefined {
  return store.get(schemeId);
}

export function clearSchemeRulesStore(): void {
  store.clear();
}
