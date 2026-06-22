import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  GraduationCap,
  Headphones,
  Landmark,
  Linkedin,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type LearningAccessGateProps = {
  redirectTo: string;
};

type LoginFormState = {
  email: string;
  password: string;
};

type SignupFormState = {
  confirmPassword: string;
  email: string;
  fullName: string;
  password: string;
};

const learningHighlights = [
  {
    description: "Learn from the best in the industry",
    icon: BookOpen,
    title: "Expert Courses",
  },
  {
    description: "Specialized content for banking careers",
    icon: Landmark,
    title: "Banking Focused",
  },
  {
    description: "Real-world skills you can apply",
    icon: TrendingUp,
    title: "Practical Learning",
  },
  {
    description: "Certifications that set you apart",
    icon: GraduationCap,
    title: "Career Growth",
  },
];

const trustIndicators = [
  {
    icon: ShieldCheck,
    label: "Trusted by 10,000+ Students",
  },
  {
    icon: Landmark,
    label: "Industry Relevant Content",
  },
  {
    icon: BadgeCheck,
    label: "Recognized Certification",
  },
  {
    icon: Headphones,
    label: "Dedicated Support",
  },
];

const learningInputClass =
  "h-[52px] rounded-2xl border-[#d9def0] bg-white/72 !pl-12 !pr-12 text-[15px] font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] placeholder:text-slate-400 caret-[#6938ef] focus-visible:border-[#7c3aed] focus-visible:ring-[#8b5cf6]/25 [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.96)]";

const inputIconClass =
  "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500";

const passwordToggleClass =
  "absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-[#eef2ff] hover:text-[#6d28d9]";

const socialButtonClass =
  "h-[50px] w-full rounded-2xl border border-[#dfe4f3] bg-white/76 text-[15px] font-semibold text-slate-700 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const LearningAccessGate = ({ redirectTo }: LearningAccessGateProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const safeRedirectTo = redirectTo.startsWith("/learning") ? redirectTo : "/learning";
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}${safeRedirectTo}` : undefined;

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    confirmPassword: "",
    email: "",
    fullName: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const syncUserRole = async () => {
    try {
      await supabase.rpc("upsert_user_role_from_metadata");
    } catch (error) {
      console.error("Unable to sync user role for learning access:", error);
    }
  };

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleSignupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSignupForm((current) => ({ ...current, [name]: value }));
  };

  const handleSocialLogin = (provider: "Google" | "LinkedIn") => {
    toast({
      title: `${provider} login coming soon`,
      description: "Please use email and password to access EazyBizy Learning for now.",
    });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      toast({
        variant: "destructive",
        title: "Missing details",
        description: "Enter your email address and password to continue.",
      });
      return;
    }

    setLoginLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      if (error) {
        throw error;
      }

      await syncUserRole();

      toast({
        title: "Welcome back",
        description: "Opening your EazyBizy Learning workspace now.",
      });
      navigate(safeRedirectTo, { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: getErrorMessage(error, "We could not sign you in right now."),
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!signupForm.fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Full name required",
        description: "Enter your full name before creating your learning account.",
      });
      return;
    }

    if (!signupForm.email.trim()) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Enter your email address to create your learning account.",
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Use at least 6 characters for your password.",
      });
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Re-enter the same password in both password fields.",
      });
      return;
    }

    setSignupLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email.trim(),
        password: signupForm.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: signupForm.fullName.trim(),
            role: "user",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        await syncUserRole();
        toast({
          title: "Account created",
          description: "Your learning account is ready. Opening the learning page now.",
        });
        navigate(safeRedirectTo, { replace: true });
      } else {
        setActiveTab("login");
        setLoginForm((current) => ({
          ...current,
          email: signupForm.email.trim(),
        }));
        toast({
          title: "Account created",
          description:
            "Check your email to verify your account, then sign in to continue to learning.",
        });
      }

      setSignupForm({
        confirmPassword: "",
        email: "",
        fullName: "",
        password: "",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: getErrorMessage(error, "We could not create your learning account right now."),
      });
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8f4ff_0%,#eef7ff_39%,#ffffff_62%,#efe7ff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-14 h-[31rem] w-[31rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.18)_0%,rgba(124,58,237,0.04)_58%,transparent_72%)] blur-2xl" />
        <div className="absolute right-[-8rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(91,77,255,0.28)_0%,rgba(91,77,255,0.08)_54%,transparent_72%)] blur-2xl" />
        <div className="absolute bottom-[-12rem] left-[34%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.18)_0%,rgba(37,99,235,0.05)_62%,transparent_75%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(109,40,217,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.1)_1px,transparent_1px)] [background-size:58px_58px]" />
        <div className="absolute left-[42%] top-0 h-full w-px bg-gradient-to-b from-transparent via-white/80 to-transparent" />
      </div>

      <main className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <section className="relative flex min-h-screen flex-col overflow-hidden px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-24 h-44 w-44 rounded-full bg-white/62 blur-3xl" />
            <div className="absolute bottom-28 right-10 h-56 w-56 rounded-[42%_58%_64%_36%] bg-[#dce7ff]/58 blur-2xl" />
            <div className="absolute bottom-[36%] left-[12%] h-24 w-24 rounded-[35%_65%_55%_45%] bg-white/24 blur-xl rotate-12" />
            <div className="absolute right-[12%] top-[18%] h-44 w-44 rounded-[58%_42%_52%_48%] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.16)_0%,rgba(219,234,254,0.18)_52%,transparent_76%)] blur-2xl -rotate-12" />
          </div>

          <div className="relative z-10">
            <Button
              variant="outline"
              asChild
              className="h-11 rounded-full border-white/80 bg-white/78 px-5 text-slate-700 shadow-[0_18px_42px_-30px_rgba(91,77,255,0.44)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Back to EazyBizy
              </Link>
            </Button>

            <div className="mt-7 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/90 bg-white/80 shadow-[0_26px_58px_-38px_rgba(91,77,255,0.52)] backdrop-blur-xl">
                <img src="/logo.png" alt="EazyBizy logo" className="h-14 w-14 object-contain" />
              </div>
              <div>
                <p className="text-[0.92rem] font-bold lowercase tracking-tight text-[#070b24] sm:text-[1.8rem]">
                  eazy<span className="text-[#5b4dff]">bizy</span>
                </p>
                <p className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.48em] text-[#070b24]/72">
                  Learning
                </p>
              </div>
            </div>

            <div className="mt-8 max-w-2xl">
              <h1 className="text-[3rem] font-black leading-[0.98] tracking-[-0.06em] text-[#090d2f] sm:text-[4rem] xl:text-[4.8rem]">
                Learn Smarter.
                <span className="block bg-[linear-gradient(100deg,#7c3aed_0%,#2563eb_56%,#1d4ed8_100%)] bg-clip-text text-transparent">
                  Achieve More.
                </span>
              </h1>
              <p className="mt-6 max-w-[36rem] text-[1.05rem] leading-8 text-slate-700 sm:text-[1.18rem]">
                Expert-led courses in Banking, Finance and more to build your skills, boost
                your career and shape your future.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {learningHighlights.map(({ description, icon: Icon, title }) => (
              <div key={title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ede7ff] text-[#6d28d9] shadow-[0_18px_38px_-28px_rgba(109,40,217,0.7)]">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-3 text-[0.95rem] font-bold leading-5 text-[#101334]">
                  {title}
                </h3>
                <p className="mx-auto mt-1 max-w-[9rem] text-[0.78rem] leading-5 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-8 flex min-h-[330px] flex-1 items-end">
            <div className="relative mx-auto h-[330px] w-full max-w-[720px]">
              <div className="absolute bottom-2 left-[11%] h-28 w-48 rounded-[22px] border border-white/70 bg-[linear-gradient(145deg,#7c5be7_0%,#4930a4_100%)] p-4 text-white shadow-[0_28px_60px_-34px_rgba(63,33,142,0.72)] rotate-[-4deg]">
                <CreditCard className="h-6 w-6 text-[#ffe28a]" />
                <div className="mt-5 flex gap-2 text-[0.72rem] tracking-[0.18em] text-white/88">
                  <span>1234</span>
                  <span>5678</span>
                  <span>9012</span>
                </div>
                <p className="mt-4 text-[0.72rem] text-white/78">12 / 28</p>
              </div>

              <div className="absolute bottom-4 left-[26%] flex items-end gap-1.5">
                {[58, 76, 94, 112].map((height) => (
                  <div key={height} className="w-12 rounded-t-full bg-[linear-gradient(180deg,#ffd86b_0%,#f59e0b_100%)] shadow-[inset_0_3px_0_rgba(255,255,255,0.35)]" style={{ height }} />
                ))}
              </div>

              <div className="absolute bottom-12 left-[28%] h-40 w-[23rem] rounded-t-[32px] border border-[#7c5be7]/25 bg-[linear-gradient(180deg,#d9c6ff_0%,#9d7ff4_50%,#5b3bb6_100%)] shadow-[0_34px_70px_-38px_rgba(91,59,182,0.72)]">
                <div className="absolute -top-16 left-1/2 h-24 w-72 -translate-x-1/2 bg-[linear-gradient(145deg,#f2eaff_0%,#8b6ef0_100%)] shadow-[0_24px_44px_-28px_rgba(91,59,182,0.8)] [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl font-black tracking-[0.18em] text-white drop-shadow">
                  BANK
                </div>
                <div className="absolute inset-x-10 top-9 grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((pillar) => (
                    <div key={pillar} className="h-24 rounded-t-full bg-[linear-gradient(180deg,#f8f3ff_0%,#8269e6_100%)] shadow-[inset_8px_0_18px_rgba(255,255,255,0.35)]" />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-9 rounded-t-2xl bg-[linear-gradient(180deg,#7d63dd_0%,#4930a4_100%)]" />
              </div>

              <div className="absolute bottom-10 right-[12%] h-72 w-36 rounded-[28px] border-[6px] border-[#30245f] bg-[#171139] p-2 shadow-[0_36px_70px_-34px_rgba(23,17,57,0.78)] rotate-[4deg]">
                <div className="mx-auto mb-2 h-2 w-12 rounded-full bg-white/18" />
                <div className="h-full rounded-[20px] bg-[linear-gradient(180deg,#f4ecff_0%,#d8c8ff_100%)] p-3">
                  <p className="text-[0.58rem] font-semibold text-[#171139]/70">Account Balance</p>
                  <p className="mt-1 text-[0.94rem] font-black text-[#171139]">₹ 2,45,678</p>
                  <svg viewBox="0 0 120 58" className="mt-4 h-16 w-full overflow-visible">
                    <path d="M2 48 L18 33 L33 42 L47 23 L62 36 L78 18 L92 26 L118 6" fill="none" stroke="#6d28d9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 52 L18 37 L33 46 L47 27 L62 40 L78 22 L92 30 L118 10 L118 58 L2 58 Z" fill="rgba(124,58,237,0.16)" />
                  </svg>
                  <div className="mt-4 space-y-2">
                    {["Fund Transfer", "Bill Payment", "Account Statement"].map((item) => (
                      <div key={item} className="rounded-xl bg-white/70 px-2 py-1.5 text-[0.56rem] font-semibold text-[#171139]/72">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-24 right-[27%] flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(145deg,#8b5cf6_0%,#5b3bb6_100%)] text-white shadow-[0_22px_44px_-26px_rgba(91,59,182,0.75)]">
                <ShieldCheck className="h-10 w-10" />
              </div>

              <div className="absolute bottom-2 right-[8%] h-32 w-44">
                <div className="absolute bottom-0 left-0 h-5 w-full rounded-full bg-white/60 blur-lg" />
                <TrendingUp className="absolute bottom-7 right-6 h-24 w-24 text-white drop-shadow-[0_14px_20px_rgba(91,77,255,0.4)]" strokeWidth={3} />
                <div className="absolute bottom-2 left-8 flex items-end gap-2">
                  {[32, 48, 62, 82].map((height) => (
                    <div key={height} className="w-5 rounded-t-lg bg-[linear-gradient(180deg,#8b5cf6_0%,#4f46e5_100%)]" style={{ height }} />
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 left-[5%] flex items-center gap-3 rounded-[18px] border border-white/80 bg-white/86 px-5 py-4 text-[#101334] shadow-[0_24px_50px_-34px_rgba(91,77,255,0.5)] backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#2563eb_100%)] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="max-w-[17rem] text-[0.98rem] font-medium leading-5">
                  Your future in banking starts with the right learning.
                </p>
              </div>

              <Coins className="absolute bottom-28 left-[18%] h-9 w-9 text-[#f59e0b]" />
              <Building2 className="absolute bottom-44 left-[35%] h-7 w-7 text-white/76" />
              <Smartphone className="absolute bottom-48 right-[8%] h-8 w-8 text-[#7c3aed]/45" />
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0.5),transparent)]" />
            <div className="absolute right-[-18%] top-[4%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.24)_0%,rgba(124,58,237,0.05)_58%,transparent_76%)] blur-2xl" />
            <div className="absolute bottom-[8%] left-[18%] h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.16)_0%,rgba(37,99,235,0)_70%)] blur-xl" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[600px] flex-col gap-5">
            <div className="rounded-[34px] border border-white/70 bg-white/72 p-5 shadow-[0_34px_95px_-48px_rgba(91,77,255,0.42)] backdrop-blur-2xl sm:p-7 xl:p-8">
              <div className="text-center">
                <h2 className="text-[2rem] font-black tracking-[-0.04em] text-[#090d2f] sm:text-[2.35rem]">
                  Welcome Back!
                </h2>
                <p className="mt-2 text-[0.98rem] leading-6 text-slate-600">
                  {activeTab === "login"
                    ? "Login to continue your learning journey"
                    : "Create your account to start your learning journey"}
                </p>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "login" | "signup")}
                className="mt-7"
              >
                <TabsList className="grid h-auto grid-cols-2 rounded-none border-b border-slate-200 bg-transparent p-0">
                  <TabsTrigger
                    value="login"
                    className="rounded-none border-b-2 border-transparent bg-transparent pb-3 pt-0 text-base font-semibold text-slate-500 shadow-none transition data-[state=active]:border-[#7c3aed] data-[state=active]:bg-transparent data-[state=active]:text-[#5b21b6] data-[state=active]:shadow-none"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-none border-b-2 border-transparent bg-transparent pb-3 pt-0 text-base font-semibold text-slate-500 shadow-none transition data-[state=active]:border-[#7c3aed] data-[state=active]:bg-transparent data-[state=active]:text-[#5b21b6] data-[state=active]:shadow-none"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="learning-login-email" className="text-sm font-semibold text-slate-700">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className={inputIconClass} />
                        <Input
                          id="learning-login-email"
                          name="email"
                          type="email"
                          value={loginForm.email}
                          onChange={handleLoginChange}
                          placeholder="Email Address"
                          autoComplete="email"
                          className={learningInputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="learning-login-password" className="text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className={inputIconClass} />
                        <Input
                          id="learning-login-password"
                          name="password"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginForm.password}
                          onChange={handleLoginChange}
                          placeholder="Password"
                          autoComplete="current-password"
                          className={learningInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((current) => !current)}
                          className={passwordToggleClass}
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        >
                          {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <label className="inline-flex items-center gap-3">
                        <Checkbox
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                          className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:border-[#7c3aed] data-[state=checked]:bg-[#7c3aed] data-[state=checked]:text-white"
                        />
                        Remember Me
                      </label>
                      <Link to="/forgot-password" className="font-semibold text-[#6d28d9] transition hover:text-[#4c1d95]">
                        Forgot Password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      disabled={loginLoading}
                      className="h-[54px] w-full rounded-2xl bg-[linear-gradient(135deg,#7c3aed_0%,#2563eb_100%)] text-base font-semibold text-white shadow-[0_24px_48px_-28px_rgba(91,77,255,0.72)] transition hover:-translate-y-0.5 hover:brightness-105"
                    >
                      {loginLoading ? "Signing in..." : "Login to Learning"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form onSubmit={handleSignup} className="space-y-3.5">
                    <div className="space-y-2">
                      <label htmlFor="learning-signup-name" className="text-sm font-semibold text-slate-700">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className={inputIconClass} />
                        <Input
                          id="learning-signup-name"
                          name="fullName"
                          type="text"
                          value={signupForm.fullName}
                          onChange={handleSignupChange}
                          placeholder="Full Name"
                          autoComplete="name"
                          className={learningInputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="learning-signup-email" className="text-sm font-semibold text-slate-700">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className={inputIconClass} />
                        <Input
                          id="learning-signup-email"
                          name="email"
                          type="email"
                          value={signupForm.email}
                          onChange={handleSignupChange}
                          placeholder="Email Address"
                          autoComplete="email"
                          className={learningInputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="learning-signup-password" className="text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className={inputIconClass} />
                        <Input
                          id="learning-signup-password"
                          name="password"
                          type={showSignupPassword ? "text" : "password"}
                          value={signupForm.password}
                          onChange={handleSignupChange}
                          placeholder="Password"
                          autoComplete="new-password"
                          className={learningInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((current) => !current)}
                          className={passwordToggleClass}
                          aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="learning-signup-confirm-password" className="text-sm font-semibold text-slate-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className={inputIconClass} />
                        <Input
                          id="learning-signup-confirm-password"
                          name="confirmPassword"
                          type={showSignupConfirmPassword ? "text" : "password"}
                          value={signupForm.confirmPassword}
                          onChange={handleSignupChange}
                          placeholder="Confirm Password"
                          autoComplete="new-password"
                          className={learningInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirmPassword((current) => !current)}
                          className={passwordToggleClass}
                          aria-label={showSignupConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={signupLoading}
                      className="h-[54px] w-full rounded-2xl bg-[linear-gradient(135deg,#7c3aed_0%,#2563eb_100%)] text-base font-semibold text-white shadow-[0_24px_48px_-28px_rgba(91,77,255,0.72)] transition hover:-translate-y-0.5 hover:brightness-105"
                    >
                      {signupLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-4 text-sm text-slate-500">
                <div className="h-px flex-1 bg-slate-200" />
                <span>or continue with</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid gap-3">
                <Button type="button" variant="outline" onClick={() => handleSocialLogin("Google")} className={socialButtonClass}>
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[1.15rem] font-black text-[#4285f4] shadow-[0_8px_18px_-12px_rgba(66,133,244,0.8)]">
                    G
                  </span>
                  Continue with Google
                </Button>
                <Button type="button" variant="outline" onClick={() => handleSocialLogin("LinkedIn")} className={socialButtonClass}>
                  <Linkedin className="mr-2 h-5 w-5 text-[#0a66c2]" />
                  Continue with LinkedIn
                </Button>
              </div>

              <p className="mt-5 text-center text-sm text-slate-600">
                {activeTab === "login" ? "Don\u2019t have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "login" ? "signup" : "login")}
                  className="ml-2 font-bold text-[#6d28d9] transition hover:text-[#4c1d95]"
                >
                  {activeTab === "login" ? "Sign Up" : "Login"}
                </button>
              </p>
            </div>

            <div className="rounded-[28px] border border-white/72 bg-white/68 px-3 py-4 shadow-[0_24px_68px_-42px_rgba(91,77,255,0.38)] backdrop-blur-2xl">
              <div className="grid grid-cols-2 divide-x-0 divide-y divide-slate-200/80 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                {trustIndicators.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex min-h-[82px] flex-col items-center justify-center gap-2 px-3 py-3 text-center">
                    <Icon className="h-6 w-6 text-[#6d28d9]" />
                    <p className="text-[0.86rem] font-semibold leading-5 text-[#101334]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LearningAccessGate;
