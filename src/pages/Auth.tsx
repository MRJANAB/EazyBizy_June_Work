import { useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const redirectTo =
    typeof (location.state as { from?: { pathname?: string } } | null)?.from?.pathname === "string"
      ? (location.state as { from: { pathname: string } }).from.pathname
      : null;
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please enter both email and password.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Login failed");
      }

      // Check if user has credit analyst role
      const { data: analystData } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("role", "credit_analyst")
        .maybeSingle();

      toast({
        title: "Welcome Back!",
        description: "You have successfully logged in.",
      });

      // Replace history so the browser back button does not return to the login screen.
      setTimeout(() => {
        if (redirectTo) {
          navigate(redirectTo, { replace: true });
        } else if (analystData) {
          navigate("/credit-analyst", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      }, 300);
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error?.message || "Invalid credentials. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Home button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-5 left-5"
      >
        <Link
          to="/"
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_28px_hsl(var(--primary)/0.55)] transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          <Home className="w-4 h-4 transition-transform duration-200" />
          Home
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card shadow-2xl border-border">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 rounded-full overflow-hidden bg-white mx-auto mb-4 shadow-lg"
            >
              <img src="/logo.png" alt="EazyBizy" className="w-full h-full object-contain p-1" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Sign in to EazyBizy Loan
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    toast({
                      title: "Password Reset",
                      description: "Password reset feature coming soon!",
                    });
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing In...
                  </div>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-primary hover:underline font-semibold"
                >
                  Create Account
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">New User?</span>
              </div>
            </div>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/signup")}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-all duration-300 text-center"
              >
                <div className="text-2xl mb-1">👤</div>
                <div className="text-xs font-medium text-foreground">Apply for Loan</div>
                <div className="text-xs text-muted-foreground mt-1">Sign up as User</div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/signup")}
                className="p-4 border border-primary/30 rounded-lg hover:border-primary transition-all duration-300 text-center bg-primary/5"
              >
                <div className="text-2xl mb-1">🛡️</div>
                <div className="text-xs font-medium text-foreground">Credit Analyst</div>
                <div className="text-xs text-muted-foreground mt-1">Professional Access</div>
              </motion.button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-muted-foreground">
            Secure authentication powered by Supabase
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
