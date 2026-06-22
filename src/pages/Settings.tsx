import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  MobileLoanManagementDrawer,
  MobileLoanManagementHeader,
} from "@/components/dashboard/MobileLoanManagementChrome";

const panelClass =
  "rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleBackNavigation = () =>
    navigate("/dashboard", { replace: true });
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const handleSaveProfile = () => {
    toast({
      title: "Profile saved",
      description: "Your settings have been updated successfully.",
    });
  };

  const handleSaveSecurity = () => {
    toast({
      title: "Security updated",
      description: "Your password and access preferences have been saved.",
    });
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#061421] px-3 pb-28 pt-4 text-slate-100 sm:px-6 sm:py-10">
      <MobileLoanManagementDrawer
        open={mobileMenuOpen}
        currentPath="/settings"
        onClose={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />
      <div className="mx-auto max-w-[1320px]">
        <MobileLoanManagementHeader
          menuOpen={mobileMenuOpen}
          onBack={handleBackNavigation}
          onMenuToggle={() => setMobileMenuOpen((open) => !open)}
          onSupport={() => navigate("/contact", { state: { from: "/settings" } })}
        />

        <div className="hidden gap-6 lg:grid lg:grid-cols-[1.5fr_0.7fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#061b34]/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
            <button
              type="button"
              onClick={handleBackNavigation}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0b2141] px-4 py-3 text-sm text-slate-100 transition hover:border-[#00C2D1] hover:bg-[#0d2853]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>

            <p className="mt-6 text-xs uppercase tracking-[0.32em] text-slate-400">
              Settings
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white">
              Account & Security
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Manage your account details, password, and notification
              preferences on this dedicated settings page.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#061b34]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
                  Navigation
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  Quick access
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b2141] px-4 py-3 text-sm text-slate-100">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00C2D1]" />
                Settings active
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/10 bg-[#0b2141] px-5 py-5 text-left text-sm text-slate-100 transition hover:border-[#00C2D1] hover:bg-[#0d2853]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#061421] border border-white/10">
                    <User className="h-5 w-5 text-[#00C2D1]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      Go to Profile
                    </span>
                    <span className="text-xs text-slate-400">
                      View and manage your profile details
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:mt-8 xl:grid-cols-3">
          <div className={`${panelClass} bg-[#0b2141]/90`}>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Profile Details
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              Personal information
            </h3>

            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">
                <span className="text-slate-400">First name</span>
                <input
                  value={profileFirstName}
                  onChange={(event) => setProfileFirstName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#061421] px-4 py-3 text-sm text-white outline-none focus:border-[#00C2D1] focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="text-slate-400">Last name</span>
                <input
                  value={profileLastName}
                  onChange={(event) => setProfileLastName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#061421] px-4 py-3 text-sm text-white outline-none focus:border-[#00C2D1] focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="text-slate-400">Email address</span>
                <input
                  value={emailAddress}
                  onChange={(event) => setEmailAddress(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#061421] px-4 py-3 text-sm text-white outline-none focus:border-[#00C2D1] focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#00C2D1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00adc4]"
            >
              Save profile
            </button>
          </div>

          <div className={`${panelClass} bg-[#0b2141]/90`}>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Security
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              Password & access
            </h3>

            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">
                <span className="text-slate-400">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#061421] px-4 py-3 text-sm text-white outline-none focus:border-[#00C2D1] focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="text-slate-400">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#061421] px-4 py-3 text-sm text-white outline-none focus:border-[#00C2D1] focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="text-slate-400">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#061421] px-4 py-3 text-sm text-white outline-none focus:border-[#00C2D1] focus:ring-2 focus:ring-[#00C2D1]/20"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveSecurity}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#00C2D1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00adc4]"
            >
              Save security
            </button>
          </div>

          <div className={`${panelClass} bg-[#0b2141]/90`}>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Notifications
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              Alerts and reminders
            </h3>

            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#061421] px-4 py-4 text-sm text-slate-300">
                <span>Two-factor authentication</span>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={() =>
                    setTwoFactorEnabled((current) => !current)
                  }
                  className="h-5 w-5 rounded border border-white/10 bg-[#061421] text-[#00C2D1]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#061421] px-4 py-4 text-sm text-slate-300">
                <span>Email notifications</span>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={() =>
                    setEmailNotifications((current) => !current)
                  }
                  className="h-5 w-5 rounded border border-white/10 bg-[#061421] text-[#00C2D1]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
