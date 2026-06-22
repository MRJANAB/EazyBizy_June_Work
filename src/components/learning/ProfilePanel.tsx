import { Camera, Sparkles, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { businessTypeOptions, dashboardShell, getDefaultTagline, primaryButton, type ProfileDraft } from "./dashboardData";

type ProfilePanelProps = {
  profile: ProfileDraft;
  avatarPreview: string | null;
  initials: string;
  isEditing: boolean;
  isSaving: boolean;
  onCancelEditing: () => void;
  onAdjustPhoto: () => void;
  onFieldChange: (field: keyof ProfileDraft, value: string) => void;
  onSave: () => void;
  onStartEditing: () => void;
  onUploadClick: () => void;
  onRemovePhoto: () => void;
};

const ProfilePanel = ({
  profile,
  avatarPreview,
  initials,
  isEditing,
  isSaving,
  onCancelEditing,
  onAdjustPhoto,
  onFieldChange,
  onSave,
  onStartEditing,
  onUploadClick,
  onRemovePhoto,
}: ProfilePanelProps) => {
  const resolvedTagline = profile.tagline.trim() || getDefaultTagline(profile.businessType);
  const profileDetailItems = [
    {
      label: "Email",
      value: profile.email || "Add your preferred email",
      className: "sm:col-span-2",
      valueClassName: "break-all",
    },
    { label: "Business Type", value: profile.businessType || "Set your business identity" },
    {
      label: "Role / Tagline",
      value: resolvedTagline || "Define how your learning profile should appear",
      className: "sm:col-span-2",
    },
  ];

  return (
    <div className={cn(dashboardShell, "relative overflow-hidden p-4 sm:p-4.5")}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.12),transparent_36%)]" />
      <div className="relative">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 sm:pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Profile Panel</p>
            <h3 className="mt-1 text-[1.3rem] font-semibold leading-[1.02] tracking-tight text-slate-950 sm:text-[1.44rem]">
              Build your profile
            </h3>
            <p className="mt-1 max-w-[18rem] text-[0.82rem] leading-5 text-slate-500">
              Update your details and refresh your profile photo in one clean panel.
            </p>
          </div>
          <div className="inline-flex self-start rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-[#1e40af] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)] sm:text-[9px]">
            Profile + Photo
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,251,255,0.94))] p-3 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.26)] sm:p-4">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="relative">
              <Avatar className="h-11 w-11 rounded-[16px] border border-white shadow-[0_18px_36px_-26px_rgba(15,23,42,0.26)] sm:h-12 sm:w-12 sm:rounded-[18px]">
                <AvatarImage src={avatarPreview ?? undefined} alt={profile.fullName || "Profile"} className="object-cover" />
                <AvatarFallback className="rounded-[16px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] text-sm font-semibold text-white sm:rounded-[18px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={avatarPreview ? onAdjustPhoto : onUploadClick}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-2xl border border-white bg-slate-950 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5"
                aria-label="Change profile picture"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.08rem] font-semibold leading-none tracking-tight text-slate-950 sm:text-[1.18rem]">
                {profile.fullName || "Learner"}
              </p>
              <p className="mt-0.5 text-[0.8rem] font-medium leading-[1.15rem] text-slate-600 sm:text-[0.84rem]">{resolvedTagline}</p>
              <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#1e40af] sm:text-[9px]">
                <Sparkles className="h-2.5 w-2.5" />
                <span className="truncate">{profile.businessType || "Business Learning Path"}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfcff_0%,#f6f8fc_100%)] p-3">
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              {avatarPreview ? (
                <Button
                  type="button"
                  onClick={onAdjustPhoto}
                  className="h-[1.875rem] w-full justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-2.5 text-[0.78rem] text-white shadow-[0_18px_30px_-24px_rgba(37,99,235,0.45)] hover:brightness-105 sm:h-8 sm:w-auto sm:px-3 sm:text-[0.82rem]"
                >
                  <Camera className="h-3 w-3" />
                  Crop & Align
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onUploadClick}
                  className="h-[1.875rem] w-full justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-2.5 text-[0.78rem] text-white shadow-[0_18px_30px_-24px_rgba(37,99,235,0.45)] hover:brightness-105 sm:h-8 sm:w-auto sm:px-3 sm:text-[0.82rem]"
                >
                  <Camera className="h-3 w-3" />
                  Upload Photo
                </Button>
              )}
              {avatarPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onUploadClick}
                  className="h-[1.875rem] w-full justify-center rounded-2xl border-slate-200 bg-white px-2.5 text-[0.78rem] text-slate-700 hover:bg-slate-50 sm:h-8 sm:w-auto sm:px-3 sm:text-[0.82rem]"
                >
                  Replace Photo
                </Button>
              ) : null}
              {avatarPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRemovePhoto}
                  className="h-[1.875rem] w-full justify-center rounded-2xl border-slate-200 bg-white px-2.5 text-[0.78rem] text-slate-700 hover:bg-slate-50 sm:h-8 sm:w-auto sm:px-3 sm:text-[0.82rem]"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Photo
                </Button>
              ) : null}
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-5 text-slate-500 sm:text-[0.84rem]">
              Upload, crop, and align your dashboard avatar.
            </p>
          </div>

          <div className="mt-3 rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfcff_0%,#f6f8fc_100%)] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Profile Details</p>
                <p className="mt-0.5 text-[0.78rem] leading-5 text-slate-500 sm:text-[0.82rem]">
                  Refine how your learning profile appears.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={isEditing ? onCancelEditing : onStartEditing}
                className="h-[1.875rem] w-full shrink-0 self-start rounded-2xl border-slate-200 bg-white px-2.5 text-[0.78rem] text-slate-700 hover:bg-slate-50 sm:h-8 sm:w-auto sm:px-3 sm:text-[0.82rem]"
              >
                {isEditing ? "Cancel" : "Edit Details"}
              </Button>
            </div>

            {isEditing ? (
              <div className="mt-2.5 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[0.82rem] font-medium text-slate-700">Name</span>
                    <Input
                      value={profile.fullName}
                      onChange={(event) => onFieldChange("fullName", event.target.value)}
                      placeholder="Your full name"
                      className="h-9 rounded-2xl border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-300"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[0.82rem] font-medium text-slate-700">Email</span>
                    <Input
                      value={profile.email}
                      onChange={(event) => onFieldChange("email", event.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      className="h-9 rounded-2xl border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-300"
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[0.82rem] font-medium text-slate-700">Business Type</span>
                    <select
                      value={profile.businessType}
                      onChange={(event) => onFieldChange("businessType", event.target.value)}
                      className="h-9 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1d4ed8]"
                    >
                      <option value="">Select business type</option>
                      {businessTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[0.82rem] font-medium text-slate-700">Role / Tagline</span>
                    <Input
                      value={profile.tagline}
                      onChange={(event) => onFieldChange("tagline", event.target.value)}
                      placeholder="Owner"
                      className="h-9 rounded-2xl border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-300"
                    />
                  </label>
                </div>

                <Button type="button" onClick={onSave} className={cn(primaryButton, "h-9 w-full")} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            ) : (
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {profileDetailItems.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.22)]",
                      item.className,
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className={cn("mt-1 text-[0.82rem] font-medium leading-5 text-slate-700", item.valueClassName)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
