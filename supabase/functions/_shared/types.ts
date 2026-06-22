/**
 * Shared type definitions for Supabase Edge Functions.
 * Matches frontend src/types/gtab.ts and database schema.
 */

export type GTABGender = "male" | "female" | "undisclosed";
export type GTABEducation = "post_graduate" | "graduate" | "plus_two" | "tenth";
export type GTABSocialCategory = "general" | "obc" | "minority" | "sc" | "st" | "undisclosed";
export type GTABRegistrationType = "proprietorship" | "partnership" | "llp" | "private_limited";
export type GTABBusinessType = "new_business" | "existing_business";
export type GTABIndustryType = "manufacturing" | "service" | "trading" | "agriculture" | "others";
export type GTABLoanScheme = "mudra" | "pmegp" | "normal_msme" | "other_scheme";
export type GTABLoanPurpose = "term_loan" | "working_capital" | "term_and_working_capital";
export type GTABApplicationStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "disbursed";
export type GTABWorkingCapitalPeriod = "monthly" | "annual";

export interface MachineryItem {
  id: string;
  machine_name: string;
  cost: number;
  quantity?: number;
  unit_cost?: number;
  supplier_name: string;
  supplier_city?: string;
  supplier_phone: string;
  supplier_email: string;
}

/** EazyBizy application row shape - stored in loan_applications */
export interface GTABApplicationRow {
  id: string;
  user_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: GTABGender;
  education: GTABEducation;
  social_category: GTABSocialCategory;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  registration_type: GTABRegistrationType | null;
  contact_mobile: string | null;
  contact_email: string | null;
  business_type: GTABBusinessType | null;
  business_duration_months: number | null;
  business_entity_name: string | null;
  type_of_business: string | null;
  industry_type: GTABIndustryType | null;
  industry_other: string | null;
  loan_scheme: GTABLoanScheme | null;
  loan_scheme_other: string | null;
  loan_purpose: GTABLoanPurpose | null;
  business_description: string | null;
  products_services: string | null;
  project_report_inputs: Record<string, unknown> | null;
  target_market: string | null;
  expected_monthly_revenue: number | null;
  expected_employment: number | null;
  competitive_advantage: string | null;
  promoter_experience: string | null;
  land_cost: number | null;
  shed_building_cost: number | null;
  plant_machinery: MachineryItem[] | null;
  computers_cost: number | null;
  furniture_cost: number | null;
  electrification_cost: number | null;
  racks_storage_cost: number | null;
  transportation_cost: number | null;
  machinery_installation_cost: number | null;
  other_initial_expenditure: number | null;
  total_project_cost: number | null;
  margin_money: number | null;
  eligible_loan_amount: number | null;
  monthly_rent: number | null;
  employee_count: number | null;
  salary_per_employee: number | null;
  total_monthly_salary: number | null;
  raw_material_cost: number | null;
  stationery_cost: number | null;
  electricity_water_cost: number | null;
  repair_maintenance_cost: number | null;
  transport_cost: number | null;
  telephone_internet_cost: number | null;
  marketing_cost: number | null;
  miscellaneous_cost: number | null;
  total_monthly_expenses: number | null;
  working_capital_required: number | null;
  working_capital_period: GTABWorkingCapitalPeriod | null;
  current_step: number | null;
  status: GTABApplicationStatus | null;
  ai_recommendation: string | null;
  bank_formatted_report: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Parse plant_machinery from JSON - returns empty array if invalid */
export function parsePlantMachinery(value: unknown): MachineryItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MachineryItem =>
      item != null &&
      typeof item === "object" &&
      "machine_name" in item &&
      "cost" in item
  );
}
