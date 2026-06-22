import { useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useConsultantAuth } from "@/hooks/useConsultantAuth";

const ConsultantDashboard = () => {
  const { isConsultant, loading, user } = useConsultantAuth();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isConsultant) {
      navigate("/dashboard");
    }
  }, [loading, user, isConsultant, navigate]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out", description: "See you soon!" });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isConsultant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Consultant <span className="text-gradient-primary">Desk</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-foreground">
            Consultant Workspace
          </h1>
          <p className="text-muted-foreground">
            Your consultant dashboard is ready. Add the specific tools and views you need here.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default ConsultantDashboard;
