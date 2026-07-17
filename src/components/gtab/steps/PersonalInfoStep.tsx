import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { User, GraduationCap, ShieldCheck } from "lucide-react";
import AIAssistBadge from "@/components/AIAssistPanel";
import {
  GTABFormData,
  GENDER_OPTIONS,
  EDUCATION_OPTIONS,
  SOCIAL_CATEGORY_OPTIONS,
} from "@/types/gtab";

interface PersonalInfoStepProps {
  formData: GTABFormData;
  updateFormData: (updates: Partial<GTABFormData>) => void;
}

const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3 sm:gap-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#00C2D1]/12 text-[#37DED6] sm:h-12 sm:w-12">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <h3 className="text-[1.05rem] font-bold leading-tight text-slate-100 sm:text-lg">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-slate-400">{subtitle}</p>
    </div>
  </div>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-sm font-semibold text-slate-100">
    {children}{required && <span className="ml-1 text-red-400">*</span>}
  </Label>
);

const fieldCls = "h-12 rounded-[0.9rem] border-white/15 bg-[#080d17] px-4 text-base text-slate-100 placeholder:text-slate-500 focus-visible:ring-0 transition-none";

const PersonalInfoStep = ({ formData, updateFormData }: PersonalInfoStepProps) => {
  const pri = formData.project_report_inputs;

  const updatePromoter = (updates: Partial<typeof pri.promoter>) => {
    updateFormData({
      project_report_inputs: {
        ...pri,
        promoter: { ...pri.promoter, ...updates },
      },
    });
  };

  return (
    <div className="mx-auto max-w-none space-y-4 sm:space-y-6">

      {/* ── Owner Name Card ────────────────────────────────────────────────── */}
      <Card className="gtab-card-dark overflow-hidden rounded-[1rem] border border-[#163149] bg-[#111827] text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:rounded-2xl">
        <CardContent className="space-y-7 p-5 sm:space-y-8 sm:p-8">

          <SectionTitle icon={User} title="Owner / Promoter Name" subtitle="Full legal name as per Aadhaar / PAN" />

          {/* Name row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <div className="space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <FieldLabel required>First Name</FieldLabel>
                <AIAssistBadge variant="inline" fieldLabel="First Name" tooltip="AI assistance" onApply={(t) => updateFormData({ first_name: t })} />
              </div>
              <Input
                className={fieldCls}
                value={formData.first_name}
                onChange={(e) => updateFormData({ first_name: e.target.value })}
                placeholder="First name"
              />
            </div>

            <div className="space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <FieldLabel>Middle Name</FieldLabel>
                <AIAssistBadge variant="inline" fieldLabel="Middle Name" tooltip="Optional" onApply={(t) => updateFormData({ middle_name: t })} />
              </div>
              <Input
                className={fieldCls}
                value={formData.middle_name}
                onChange={(e) => updateFormData({ middle_name: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <FieldLabel required>Last Name</FieldLabel>
                <AIAssistBadge variant="inline" fieldLabel="Last Name" tooltip="AI assistance" onApply={(t) => updateFormData({ last_name: t })} />
              </div>
              <Input
                className={fieldCls}
                value={formData.last_name}
                onChange={(e) => updateFormData({ last_name: e.target.value })}
                placeholder="Last name"
              />
            </div>
          </div>

          {/* Father's Name + DOB */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              <FieldLabel required>Father's / Husband's Name</FieldLabel>
              <Input
                className={fieldCls}
                value={pri?.promoter?.fathers_name || ""}
                onChange={(e) => updatePromoter({ fathers_name: e.target.value })}
                placeholder="Ramesh Kumar"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel required>Date of Birth</FieldLabel>
              <Input
                type="date"
                className={fieldCls}
                value={pri?.promoter?.date_of_birth || ""}
                onChange={(e) => updatePromoter({ date_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-[#1c3a42]" />

          {/* Gender / Education / Social Category */}
          <SectionTitle icon={GraduationCap} title="Personal Details" subtitle="Demographic and educational information" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <div className="space-y-2">
              <FieldLabel required>Gender</FieldLabel>
              <Select value={formData.gender} onValueChange={(v: any) => updateFormData({ gender: v })}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel required>Educational Qualification</FieldLabel>
              <Select value={formData.education} onValueChange={(v: any) => updateFormData({ education: v })}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Select qualification" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel required>Social Category</FieldLabel>
              <Select value={formData.social_category} onValueChange={(v: any) => updateFormData({ social_category: v })}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Years of experience */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              <FieldLabel>Years of Industry Experience</FieldLabel>
              <Input
                type="number"
                className={fieldCls}
                value={pri?.promoter?.years_experience ?? ""}
                onChange={(e) => updatePromoter({ years_experience: Number(e.target.value) || 0 })}
                placeholder="5"
                min={0}
                max={50}
              />
              <p className="text-xs text-slate-500">Relevant experience in this business / industry</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── KYC Card ──────────────────────────────────────────────────────── */}
      <Card className="gtab-card-dark overflow-hidden rounded-[1rem] border border-[#163149] bg-[#111827] text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:rounded-2xl">
        <CardContent className="space-y-7 p-5 sm:space-y-8 sm:p-8">

          <SectionTitle
            icon={ShieldCheck}
            title="KYC & Identity Documents"
            subtitle="PAN and Aadhaar are mandatory for Section A of the bank loan report"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* PAN */}
            <div className="space-y-2">
              <FieldLabel required>PAN Number</FieldLabel>
              <Input
                className={`${fieldCls} tracking-widest uppercase`}
                value={pri?.promoter?.pan_number || ""}
                onChange={(e) => updatePromoter({ pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              {pri?.promoter?.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pri.promoter.pan_number) && (
                <p className="text-xs text-amber-400">Format: 5 letters · 4 digits · 1 letter — e.g. ABCDE1234F</p>
              )}
            </div>

            {/* Aadhaar */}
            <div className="space-y-2">
              <FieldLabel required>Aadhaar Number</FieldLabel>
              <Input
                className={fieldCls}
                value={pri?.promoter?.aadhar_number || ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                  updatePromoter({ aadhar_number: digits });
                }}
                placeholder="12-digit Aadhaar"
                maxLength={12}
              />
              {pri?.promoter?.aadhar_number && pri.promoter.aadhar_number.length > 0 && pri.promoter.aadhar_number.length !== 12 && (
                <p className="text-xs text-amber-400">Aadhaar must be exactly 12 digits (entered: {pri.promoter.aadhar_number.length})</p>
              )}
            </div>
          </div>

          <div className="rounded-[0.8rem] border border-[#00C2D1]/20 bg-[#00C2D1]/8 px-4 py-3">
            <p className="text-xs leading-5 text-slate-300">
              <span className="font-semibold text-[#7BE7F0]">Demo data pre-filled.</span>{" "}
              Replace PAN and Aadhaar with your actual details before submitting to the bank.
              These fields auto-populate Section A of your project report.
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
};

export default PersonalInfoStep;
