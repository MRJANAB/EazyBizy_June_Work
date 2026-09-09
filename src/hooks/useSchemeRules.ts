import { useEffect, useState } from "react";
import { fetchSchemeRules, type SchemeFinancingRules } from "@/lib/rulesApi";
import { setSchemeRules, getSchemeRules } from "@/lib/schemeRulesStore";

/**
 * Fetches resolved financing rules for the given scheme once (per scheme
 * id) from the backend's Rules & Rates engine, and writes them into the
 * shared schemeRulesStore so loanRulesEngine.ts's PMEGP calculation
 * functions pick them up automatically wherever they're called.
 *
 * Call this once near the top of the wizard, keyed on the user's
 * currently-selected loan scheme — not at every call site.
 */
export function useSchemeRules(schemeId: string | undefined | null) {
  const [rules, setRules] = useState<SchemeFinancingRules | undefined>(
    schemeId ? getSchemeRules(schemeId) : undefined,
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!schemeId) return;

    const cached = getSchemeRules(schemeId);
    if (cached) {
      setRules(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetchSchemeRules(schemeId).then((fetched) => {
      if (cancelled) return;
      setIsLoading(false);
      if (fetched) {
        setSchemeRules(schemeId, fetched);
        setRules(fetched);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [schemeId]);

  return { rules, isLoading };
}
