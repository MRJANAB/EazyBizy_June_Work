import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User, Mail, Phone, ArrowLeft, Save, MapPin, Briefcase,
  Shield, Upload, FileText, Pencil, X, CheckCircle2, Sparkles,
  Building2, BadgeCheck,
} from "lucide-react";
import AIAssistBadge from "@/components/AIAssistPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  MobileLoanManagementDrawer,
  MobileLoanManagementHeader,
} from "@/components/dashboard/MobileLoanManagementChrome";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessType: z.string().optional(),
  collateralDetails: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const businessTypes = [
  "Sole Proprietorship",
  "Partnership",
  "Private Limited Company",
  "Public Limited Company",
  "Limited Liability Partnership (LLP)",
  "Self-Employed Professional",
  "Salaried Individual",
  "Other",
];

type Tab = "personal" | "business" | "documents";

/* ── 3-D tilt card hook ── */
const useTilt = (max = 8) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 200, damping: 20 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onMouseLeave = () => { x.set(0); y.set(0); };

  return { rotateX, rotateY, onMouseMove, onMouseLeave };
};

const Profile = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [isEditing, setIsEditing]       = useState(false);
  const [clientId, setClientId]         = useState<string | null>(null);
  const [documentUrl, setDocumentUrl]   = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>("personal");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const { user, signOut } = useAuth();
  const heroTilt = useTilt(6);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", email: "", phone: "", address: "", businessType: "", collateralDetails: "" },
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setClientId(data.client_id);
        setDocumentUrl(data.document_url);
        form.reset({
          fullName: data.full_name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          address: data.address || "",
          businessType: data.business_type || "",
          collateralDetails: data.collateral_details || "",
        });
      } else {
        form.reset({ fullName: "", email: user.email || "", phone: "", address: "", businessType: "", collateralDetails: "" });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, navigate, form]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a PDF, JPG, or PNG file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Please upload a file smaller than 5MB." });
      return;
    }
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("profile-documents").upload(fileName, file);
    if (uploadError) {
      toast({ variant: "destructive", title: "Upload failed", description: "Failed to upload document. Please try again." });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("profile-documents").getPublicUrl(fileName);
    const { error: updateError } = await supabase.from("profiles").update({ document_url: urlData.publicUrl }).eq("user_id", user.id);
    setUploading(false);
    if (updateError) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save document reference." });
    } else {
      setDocumentUrl(urlData.publicUrl);
      toast({ title: "Document uploaded!", description: "Your document has been uploaded successfully." });
    }
  };

  const handleSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    const { error } = await supabase.from("profiles").update({
      full_name: data.fullName,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      business_type: data.businessType || null,
      collateral_details: data.collateralDetails || null,
    }).eq("user_id", user.id);
    setIsSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile. Please try again." });
    } else {
      setIsEditing(false);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    }
  };

  const handleCancel = () => { form.reset(); setIsEditing(false); };
  const handleLogout = async () => { setMobileMenuOpen(false); await signOut(); navigate("/"); };

  const initials = (form.watch("fullName") || user?.email || "U")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "personal",  label: "Personal",  icon: User      },
    { id: "business",  label: "Business",  icon: Building2 },
    { id: "documents", label: "Documents", icon: FileText  },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040d18] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#00C2D1]/20 border-t-[#00C2D1] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-[#00C2D1] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040d18] text-white overflow-x-hidden">

      {/* ── Ambient background ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#00C2D1]/[0.06] blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-[#47d68d]/[0.05] blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-[#7c3aed]/[0.05] blur-[100px]" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,194,209,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,194,209,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Mobile nav ── */}
      <MobileLoanManagementDrawer open={mobileMenuOpen} currentPath="/profile" onClose={() => setMobileMenuOpen(false)} onLogout={handleLogout} />
      <div className="relative z-10 px-3 pb-5 pt-4 lg:hidden">
        <MobileLoanManagementHeader
          label="MY PROFILE"
          title="Profile"
          menuOpen={mobileMenuOpen}
          onBack={() => navigate("/dashboard")}
          onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          onSupport={() => navigate("/contact", { state: { from: "/profile" } })}
        />
      </div>

      {/* ── Desktop header ── */}
      <header className="relative z-10 hidden lg:block border-b border-white/[0.06] bg-[#040d18]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-[#00C2D1]/40 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <img src="/logo.png" alt="EazyBizy" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold">Eazy<span className="text-[#00C2D1]">Bizy</span></span>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">

          {/* ══════════════════════════════
              LEFT — 3D Hero Profile Card
          ══════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col gap-5"
          >
            {/* Avatar card with 3D tilt */}
            <motion.div
              style={{ rotateX: heroTilt.rotateX, rotateY: heroTilt.rotateY, transformPerspective: 800 }}
              onMouseMove={heroTilt.onMouseMove}
              onMouseLeave={heroTilt.onMouseLeave}
              className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-[#081b34] via-[#06142a] to-[#040d18] p-8 shadow-[0_30px_80px_rgba(0,194,209,0.15)] cursor-default"
            >
              {/* top glow line */}
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#00C2D1]/60 to-transparent" />

              {/* floating orb behind avatar */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative mx-auto mb-6 w-fit"
              >
                {/* outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-[#00C2D1]/20 blur-xl scale-125" />
                {/* ring */}
                <div className="relative w-24 h-24 rounded-full border-2 border-[#00C2D1]/50 p-1 shadow-[0_0_30px_rgba(0,194,209,0.3)]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00C2D1] to-[#0891b2] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{initials}</span>
                  </div>
                </div>
                {/* verified badge */}
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#47d68d] shadow-[0_0_14px_rgba(71,214,141,0.6)]">
                  <BadgeCheck className="h-4 w-4 text-white" />
                </div>
              </motion.div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{form.watch("fullName") || "Your Name"}</h2>
                <p className="mt-1 text-sm text-slate-400">{form.watch("email") || user?.email}</p>
                {form.watch("businessType") && (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#00C2D1]/25 bg-[#00C2D1]/10 px-3 py-1 text-xs text-[#00C2D1]">
                    <Briefcase className="h-3 w-3" />
                    {form.watch("businessType")}
                  </span>
                )}
              </div>

              {/* bottom glow line */}
              <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </motion.div>

            {/* Client ID card */}
            {clientId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative rounded-[1.5rem] border border-[#D4AF37]/25 bg-gradient-to-br from-[#1a1200]/80 to-[#0a0d18]/80 p-5 shadow-[0_20px_50px_rgba(212,175,55,0.1)] backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#D4AF37]/10 blur-2xl" />
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                    <Shield className="h-5 w-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Client ID</p>
                    <p className="mt-0.5 text-lg font-bold text-[#F6DC7A]">{clientId}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick info pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: "Status",   value: "Active",   color: "#47d68d" },
                { label: "KYC",      value: "Verified", color: "#00C2D1" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center"
                >
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Edit / Save button (desktop shortcut) */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#00C2D1]/30 bg-gradient-to-r from-[#00C2D1]/15 to-[#0891b2]/10 py-3 text-sm font-semibold text-[#00C2D1] transition hover:border-[#00C2D1]/60 hover:from-[#00C2D1]/25 hover:shadow-[0_0_20px_rgba(0,194,209,0.2)]"
                >
                  <Pencil className="h-4 w-4" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C2D1] to-[#0891b2] py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,194,209,0.35)] transition hover:brightness-110 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" /> {isSubmitting ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* ══════════════════════════════
              RIGHT — Tabbed Form Card
          ══════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="rounded-[2rem] border border-white/[0.08] bg-[#061320]/90 shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden"
          >
            {/* top accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#00C2D1]/40 to-transparent" />

            {/* Tab bar + Edit/Save actions */}
            <div className="flex items-end justify-between border-b border-white/[0.06] px-6 pt-4 gap-1">
              <div className="flex gap-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative flex items-center gap-2 rounded-t-xl px-5 py-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === id
                      ? "text-[#00C2D1]"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {activeTab === id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-[#00C2D1] to-[#47d68d]"
                    />
                  )}
                </button>
              ))}
              </div>

              {/* Edit / Save / Cancel — always visible in top-right of form panel */}
              <div className="flex items-center gap-2 pb-2">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-xl border border-[#00C2D1]/40 bg-[#00C2D1]/10 px-4 py-2 text-sm font-semibold text-[#00C2D1] transition hover:bg-[#00C2D1]/20 hover:border-[#00C2D1]/70 hover:shadow-[0_0_16px_rgba(0,194,209,0.25)]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={form.handleSubmit(handleSubmit)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C2D1] to-[#0891b2] px-4 py-2 text-sm font-bold text-white shadow-[0_0_16px_rgba(0,194,209,0.3)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" /> {isSubmitting ? "Saving…" : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Editing mode banner */}
            {isEditing && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-[#00C2D1]/20 bg-[#00C2D1]/[0.07] px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-[#00C2D1] animate-pulse" />
                <p className="text-xs font-medium text-[#00C2D1]">Editing mode — make your changes and click Save</p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 lg:p-8">

                {/* ── PERSONAL TAB ── */}
                {activeTab === "personal" && (
                  <motion.div
                    key="personal"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#00C2D1]/20 bg-[#00C2D1]/10">
                        <User className="h-5 w-5 text-[#00C2D1]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Personal Information</h3>
                        <p className="text-xs text-slate-500">Your name, contact details and address</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400 text-xs uppercase tracking-wider">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#00C2D1] transition-colors" />
                              <Input
                                placeholder="John Doe"
                                disabled={!isEditing}
                                className="pl-11 h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus:border-[#00C2D1]/50 focus:ring-1 focus:ring-[#00C2D1]/20 disabled:opacity-60 transition-all"
                                {...field}
                              />
                              {isEditing && (
                                <div className="absolute inset-0 rounded-2xl bg-[#00C2D1]/5 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-400 text-xs uppercase tracking-wider">Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#00C2D1] transition-colors" />
                                <Input
                                  placeholder="you@example.com"
                                  disabled={!isEditing}
                                  className="pl-11 h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus:border-[#00C2D1]/50 focus:ring-1 focus:ring-[#00C2D1]/20 disabled:opacity-60 transition-all"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-400 text-xs uppercase tracking-wider">Phone</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#00C2D1] transition-colors" />
                                <Input
                                  placeholder="+91 98765 43210"
                                  disabled={!isEditing}
                                  className="pl-11 h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus:border-[#00C2D1]/50 focus:ring-1 focus:ring-[#00C2D1]/20 disabled:opacity-60 transition-all"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel className="text-slate-400 text-xs uppercase tracking-wider">Address</FormLabel>
                            <AIAssistBadge fieldLabel="Address" tooltip="AI can help format your address" onApply={(t) => field.onChange(t)} />
                          </div>
                          <FormControl>
                            <div className="relative group">
                              <MapPin className="absolute left-4 top-4 h-4 w-4 text-slate-500 group-focus-within:text-[#00C2D1] transition-colors" />
                              <Textarea
                                placeholder="Enter your full address"
                                disabled={!isEditing}
                                className="pl-11 min-h-[90px] rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus:border-[#00C2D1]/50 focus:ring-1 focus:ring-[#00C2D1]/20 disabled:opacity-60 transition-all resize-none"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* ── BUSINESS TAB ── */}
                {activeTab === "business" && (
                  <motion.div
                    key="business"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#47d68d]/20 bg-[#47d68d]/10">
                        <Building2 className="h-5 w-5 text-[#47d68d]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Business Information</h3>
                        <p className="text-xs text-slate-500">Your entity type and collateral details</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400 text-xs uppercase tracking-wider">Business Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white focus:border-[#00C2D1]/50 focus:ring-1 focus:ring-[#00C2D1]/20 disabled:opacity-60">
                                <div className="flex items-center gap-3">
                                  <Briefcase className="h-4 w-4 text-slate-500" />
                                  <SelectValue placeholder="Select your business type" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-white/10 bg-[#081b34]">
                              {businessTypes.map((type) => (
                                <SelectItem key={type} value={type} className="text-slate-300 focus:bg-[#00C2D1]/10 focus:text-white rounded-xl">
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="collateralDetails"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel className="text-slate-400 text-xs uppercase tracking-wider">Collateral Details</FormLabel>
                            <AIAssistBadge fieldLabel="Collateral Details" tooltip="AI can help describe your collateral accurately" onApply={(t) => field.onChange(t)} />
                          </div>
                          <FormControl>
                            <div className="relative group">
                              <Shield className="absolute left-4 top-4 h-4 w-4 text-slate-500 group-focus-within:text-[#47d68d] transition-colors" />
                              <Textarea
                                placeholder="Describe any collateral you can provide (property, vehicle, fixed deposits, etc.)"
                                disabled={!isEditing}
                                className="pl-11 min-h-[120px] rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 focus:border-[#47d68d]/50 focus:ring-1 focus:ring-[#47d68d]/20 disabled:opacity-60 transition-all resize-none"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* ── DOCUMENTS TAB ── */}
                {activeTab === "documents" && (
                  <motion.div
                    key="documents"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                        <FileText className="h-5 w-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Documents</h3>
                        <p className="text-xs text-slate-500">Upload your ID proof or income statement</p>
                      </div>
                    </div>

                    <div
                      onClick={() => isEditing && fileInputRef.current?.click()}
                      className={`relative group rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
                        isEditing
                          ? "border-[#00C2D1]/30 hover:border-[#00C2D1]/60 cursor-pointer hover:bg-[#00C2D1]/[0.03]"
                          : "border-white/10 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {/* corner accents */}
                      {isEditing && (
                        <>
                          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#00C2D1]/50 rounded-tl-lg" />
                          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#00C2D1]/50 rounded-tr-lg" />
                          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#00C2D1]/50 rounded-bl-lg" />
                          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#00C2D1]/50 rounded-br-lg" />
                        </>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={!isEditing || uploading}
                      />

                      {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-[#00C2D1]/10" />
                            <div className="w-full h-full rounded-full border-2 border-[#00C2D1]/20 border-t-[#00C2D1] animate-spin" />
                          </div>
                          <p className="text-sm text-slate-400">Uploading your document…</p>
                        </div>
                      ) : documentUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative w-16 h-16 rounded-2xl bg-[#47d68d]/10 flex items-center justify-center shadow-[0_0_30px_rgba(71,214,141,0.2)]">
                            <CheckCircle2 className="h-8 w-8 text-[#47d68d]" />
                          </div>
                          <p className="text-sm font-semibold text-white">Document uploaded</p>
                          <p className="text-xs text-slate-500">{isEditing ? "Click to replace the file" : "Your document is on file"}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            animate={isEditing ? { y: [0, -6, 0] } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
                          >
                            <Upload className="h-7 w-7 text-slate-400" />
                          </motion.div>
                          <p className="text-sm font-semibold text-white">
                            {isEditing ? "Click to upload document" : "No document uploaded yet"}
                          </p>
                          <p className="text-xs text-slate-500">PDF, JPG, PNG — max 5 MB</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── Action buttons (inside form, mobile-visible) ── */}
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 flex gap-3 lg:hidden"
                  >
                    <Button type="button" variant="outline" className="flex-1 rounded-2xl border-white/10 text-slate-300" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl bg-gradient-to-r from-[#00C2D1] to-[#0891b2] text-white font-bold shadow-[0_0_20px_rgba(0,194,209,0.35)]" disabled={isSubmitting}>
                      <Save className="mr-2 h-4 w-4" /> {isSubmitting ? "Saving…" : "Save Changes"}
                    </Button>
                  </motion.div>
                )}
              </form>
            </Form>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
