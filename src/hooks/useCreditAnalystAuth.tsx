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
    const checkAuth = async () => {
      try {
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;

        if (!currentUser) {
          setUser(null);
          setIsCreditAnalyst(false);
          setAnalystData(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        // Check if user has credit analyst role
        const { data: analystRecord, error: analystError } = await supabase
          .from("user_roles")
          .select("id, user_id, role, created_at")
          .eq("user_id", currentUser.id)
          .eq("role", "credit_analyst")
          .maybeSingle();

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
        setIsCreditAnalyst(false);
        setAnalystData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await checkAuth();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsCreditAnalyst(false);
        setAnalystData(null);
        setLoading(false);
      }
    });

    return () => {
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
