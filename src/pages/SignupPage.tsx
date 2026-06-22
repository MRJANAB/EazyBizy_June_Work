import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ShieldCheck, Eye, EyeOff, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"user" | "analyst" | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
  };

  const validateForm = () => {
    if (!selectedRole) {
      toast({
        variant: "destructive",
        title: "Role Required",
        description: "Please select your role to continue.",
      });
      return false;
    }

    if (!formData.fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter your full name.",
      });
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
      });
      return false;
    }

    return true;
  };

  const generateClientId = () => {
    const prefix = selectedRole === "analyst" ? "CA" : "CL";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const clientId = generateClientId();

      // Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: selectedRole === "analyst" ? "credit_analyst" : "user",
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      // Create profile in the profiles table
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        client_id: clientId,
      });

      if (profileError) throw profileError;

      // Assign role in user_roles table
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: selectedRole === "analyst" ? "credit_analyst" : "user",
      });

      toast({
        title: "Account Created!",
        description: selectedRole === "analyst" 
          ? "Your credit analyst account has been created successfully."
          : "Your account has been created. Please check your email to verify.",
      });

      // Redirect based on role
      setTimeout(() => {
        if (selectedRole === "analyst") {
          navigate("/credit-analyst-dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl"
      >
        <Card className="glass-card shadow-2xl border-border">
          <CardHeader className="text-center pb-8 relative">
            <div className="absolute left-0 top-0 mt-4 ml-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-400"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              {selectedRole && (
                <button
                  type="button"
                  onClick={handleBackToRoleSelection}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-400"
                >
                  <Home className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 rounded-full overflow-hidden bg-white mx-auto mb-4 shadow-lg"
            >
              <img src="/logo.png" alt="EazyBizy" className="w-full h-full object-contain p-1" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Join EazyBizy
            </CardTitle>
            <CardDescription className="text-base">
              Why Work Harder When You Can Work Smarter?
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!selectedRole ? (
              // Role Selection Screen
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-center text-foreground mb-6">
                  Select Your Role
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Regular User Card */}
                  <motion.div
                    whileHover={{ scale: 1.03, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole("user")}
                    className="cursor-pointer"
                  >
                    <Card className="glass-card border-2 border-border hover:border-primary/50 transition-all duration-300 h-full hover:shadow-xl">
                      <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-primary/20 flex items-center justify-center"
                        >
                          <User className="h-10 w-10 text-primary" />
                        </motion.div>
                        <h4 className="text-2xl font-bold text-foreground">Loan Applicant</h4>
                        <p className="text-center text-muted-foreground">
                          Apply for loans, track applications, and manage your financial journey
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 mt-4 w-full">
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Submit loan applications
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Track application status in real-time
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            View credit score and eligibility
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Manage documents securely
                          </li>
                        </ul>
                        <Button className="mt-6 w-full gradient-primary" size="lg">
                          Sign Up as Applicant
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Credit Analyst Card */}
                  <motion.div
                    whileHover={{ scale: 1.03, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole("analyst")}
                    className="cursor-pointer"
                  >
                    <Card className="glass-card border-2 border-primary/30 hover:border-primary transition-all duration-300 h-full hover:shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
                      <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 relative">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
                        >
                          <ShieldCheck className="h-10 w-10 text-primary-foreground" />
                        </motion.div>
                        <div className="relative">
                          <h4 className="text-2xl font-bold text-foreground">Credit Analyst</h4>
                          <motion.div
                            animate={{ x: [0, 10, -10, 6, -6, 0], y: [0, -6, 6, -4, 4, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-2 -right-12 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full select-none"
                          >
                            Professional
                          </motion.div>
                        </div>
                        <p className="text-center text-muted-foreground">
                          Review and assess loan applications with advanced tools and insights
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-2 mt-4 w-full">
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Review loan applications
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Perform comprehensive risk assessments
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Generate detailed analytical reports
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Approve or reject loan requests
                          </li>
                        </ul>
                        <Button className="mt-6 w-full gradient-primary" size="lg">
                          Sign Up as Analyst
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div className="text-center mt-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      onClick={() => navigate("/auth")}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            ) : (
              // Signup Form
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedRole === "analyst" ? (
                      <>
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                          <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">Credit Analyst</h3>
                          <p className="text-sm text-muted-foreground">Professional Account</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">Loan Applicant</h3>
                          <p className="text-sm text-muted-foreground">Personal Account</p>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRole(null)}
                  >
                    Change Role
                  </Button>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        name="fullName"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email Address *</label>
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

                  {/* Phone (Optional) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        📱
                      </span>
                      <Input
                        type="tel"
                        name="phone"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Create a password"
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
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters long
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className={`w-full ${selectedRole === "analyst" ? "gradient-primary" : ""}`}
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Account...
                      </div>
                    ) : (
                      `Create ${selectedRole === "analyst" ? "Analyst" : "Applicant"} Account`
                    )}
                  </Button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      onClick={() => navigate("/auth")}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SignupPage;
