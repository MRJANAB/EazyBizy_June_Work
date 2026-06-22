import { ReactNode, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ProtectedRouteProps = {
  children?: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Protected route auth check failed:", error);
      }

      setUser(data.user ?? null);
      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm font-medium text-muted-foreground">Checking your session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
