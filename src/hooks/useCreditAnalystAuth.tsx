import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface CreditAnalystData {
  id: string;
  user_id: string;
  role: "credit_analyst";
  created_at: string;
}

export const useCreditAnalystAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isCreditAnalyst, setIsCreditAnalyst] = useState(false);
  const [analystData, setAnalystData] = useState<CreditAnalystData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Safety net: never let the page hang on the spinner forever. If the auth
    // check hasn't resolved (e.g. Supabase slow/unreachable), stop loading so
    // the UI can react instead of spinning indefinitely.
    const watchdog = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const checkAuth = async () => {
      try {
        // getSession() reads the locally-stored session (no network round-trip),
        // so it can't hang the way getUser() can. Fall back to getUser only if a
        // session exists but we still want the verified user object.
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;

        if (!currentUser) {
          if (cancelled) return;
          setUser(null);
          setIsCreditAnalyst(false);
          setAnalystData(null);
          setLoading(false);
          return;
        }

        if (!cancelled) setUser(currentUser);

        // Check if user has credit analyst role
        const { data: analystRecord, error: analystError } = await supabase
          .from("user_roles")
          .select("id, user_id, role, created_at")
          .eq("user_id", currentUser.id)
          .eq("role", "credit_analyst")
          .maybeSingle();

        if (cancelled) return;

        if (analystError) {
          console.error("Error checking analyst status:", analystError);
          setIsCreditAnalyst(false);
          setAnalystData(null);
        } else if (analystRecord) {
          setIsCreditAnalyst(true);
          setAnalystData(analystRecord as CreditAnalystData);
        } else {
          setIsCreditAnalyst(false);
          setAnalystData(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (cancelled) return;
        setIsCreditAnalyst(false);
        setAnalystData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes. IMPORTANT: do NOT `await` other supabase
    // calls directly inside this callback — that can deadlock the auth client.
    // Defer to a microtask/next tick instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setTimeout(() => { if (!cancelled) checkAuth(); }, 0);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsCreditAnalyst(false);
        setAnalystData(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, []);

  return { 
    user, 
    isCreditAnalyst, 
    analystData,
    loading 
  };
};
