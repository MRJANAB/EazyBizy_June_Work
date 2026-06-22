import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useConsultantAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isConsultant, setIsConsultant] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConsultantRole = async () => {
      if (!user) {
        setIsConsultant(false);
        setLoading(false);
        return;
      }

      try {
        await supabase.rpc("upsert_user_role_from_metadata");
      } catch (rpcError) {
        console.error("Error syncing user role:", rpcError);
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "consultant")
        .maybeSingle();

      if (error) {
        console.error("Error checking consultant role:", error);
        setIsConsultant(false);
      } else {
        setIsConsultant(!!data);
      }

      setLoading(false);
    };

    if (!authLoading) {
      checkConsultantRole();
    }
  }, [user, authLoading]);

  return { isConsultant, loading: loading || authLoading, user };
};
