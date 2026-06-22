export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      gtab_applications: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          ai_recommendation: string | null
          approval_notes: string | null
          bank_formatted_report: string | null
          business_description: string | null
          business_duration_months: number | null
          business_entity_name: string | null
          business_type:
            | Database["public"]["Enums"]["gtab_business_type"]
            | null
          city: string | null
          competitive_advantage: string | null
          computers_cost: number | null
          contact_email: string | null
          contact_mobile: string | null
          created_at: string
          current_step: number | null
          education: Database["public"]["Enums"]["gtab_education"]
          electricity_water_cost: number | null
          electrification_cost: number | null
          eligible_loan_amount: number | null
          employee_count: number | null
          expected_employment: number | null
          expected_monthly_revenue: number | null
          first_name: string
          furniture_cost: number | null
          gender: Database["public"]["Enums"]["gtab_gender"]
          id: string
          industry_other: string | null
          industry_type:
            | Database["public"]["Enums"]["gtab_industry_type"]
            | null
          land_cost: number | null
          last_name: string
          loan_purpose: Database["public"]["Enums"]["gtab_loan_purpose"] | null
          loan_scheme: Database["public"]["Enums"]["gtab_loan_scheme"] | null
          loan_scheme_other: string | null
          machinery_installation_cost: number | null
          margin_money: number | null
          marketing_cost: number | null
          middle_name: string | null
          miscellaneous_cost: number | null
          monthly_rent: number | null
          other_initial_expenditure: number | null
          pincode: string | null
          plant_machinery: Json | null
          project_report_inputs: Json
          products_services: string | null
          promoter_experience: string | null
          racks_storage_cost: number | null
          raw_material_cost: number | null
          registration_type:
            | Database["public"]["Enums"]["gtab_registration_type"]
            | null
          rejection_reason: string | null
          repair_maintenance_cost: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          salary_per_employee: number | null
          semi_skilled_workers_count: number | null
          semi_skilled_workers_salary: number | null
          shed_building_cost: number | null
          skilled_workers_count: number | null
          skilled_workers_salary: number | null
          social_category: Database["public"]["Enums"]["gtab_social_category"]
          state: string | null
          stationery_cost: number | null
          status: Database["public"]["Enums"]["gtab_application_status"] | null
          submitted_at: string | null
          target_market: string | null
          telephone_internet_cost: number | null
          total_monthly_expenses: number | null
          total_monthly_salary: number | null
          total_project_cost: number | null
          transport_cost: number | null
          transportation_cost: number | null
          type_of_business: string | null
          updated_at: string
          user_id: string
          working_capital_period: Database["public"]["Enums"]["gtab_working_capital_period"] | null
          working_capital_required: number | null
          wages_count: number | null
          wages_salary: number | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          ai_recommendation?: string | null
          approval_notes?: string | null
          bank_formatted_report?: string | null
          business_description?: string | null
          business_duration_months?: number | null
          business_entity_name?: string | null
          business_type?:
            | Database["public"]["Enums"]["gtab_business_type"]
            | null
          city?: string | null
          competitive_advantage?: string | null
          computers_cost?: number | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string
          current_step?: number | null
          education: Database["public"]["Enums"]["gtab_education"]
          electricity_water_cost?: number | null
          electrification_cost?: number | null
          eligible_loan_amount?: number | null
          employee_count?: number | null
          expected_employment?: number | null
          expected_monthly_revenue?: number | null
          first_name: string
          furniture_cost?: number | null
          gender: Database["public"]["Enums"]["gtab_gender"]
          id?: string
          industry_other?: string | null
          industry_type?:
            | Database["public"]["Enums"]["gtab_industry_type"]
            | null
          land_cost?: number | null
          last_name: string
          loan_purpose?: Database["public"]["Enums"]["gtab_loan_purpose"] | null
          loan_scheme?: Database["public"]["Enums"]["gtab_loan_scheme"] | null
          loan_scheme_other?: string | null
          machinery_installation_cost?: number | null
          margin_money?: number | null
          marketing_cost?: number | null
          middle_name?: string | null
          miscellaneous_cost?: number | null
          monthly_rent?: number | null
          other_initial_expenditure?: number | null
          pincode?: string | null
          plant_machinery?: Json | null
          project_report_inputs?: Json
          products_services?: string | null
          promoter_experience?: string | null
          racks_storage_cost?: number | null
          raw_material_cost?: number | null
          registration_type?:
            | Database["public"]["Enums"]["gtab_registration_type"]
            | null
          rejection_reason?: string | null
          repair_maintenance_cost?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_per_employee?: number | null
          semi_skilled_workers_count?: number | null
          semi_skilled_workers_salary?: number | null
          shed_building_cost?: number | null
          skilled_workers_count?: number | null
          skilled_workers_salary?: number | null
          social_category: Database["public"]["Enums"]["gtab_social_category"]
          state?: string | null
          stationery_cost?: number | null
          status?: Database["public"]["Enums"]["gtab_application_status"] | null
          submitted_at?: string | null
          target_market?: string | null
          telephone_internet_cost?: number | null
          total_monthly_expenses?: number | null
          total_monthly_salary?: number | null
          total_project_cost?: number | null
          transport_cost?: number | null
          transportation_cost?: number | null
          type_of_business?: string | null
          updated_at?: string
          user_id: string
          working_capital_period?: Database["public"]["Enums"]["gtab_working_capital_period"] | null
          working_capital_required?: number | null
          wages_count?: number | null
          wages_salary?: number | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          ai_recommendation?: string | null
          approval_notes?: string | null
          bank_formatted_report?: string | null
          business_description?: string | null
          business_duration_months?: number | null
          business_entity_name?: string | null
          business_type?:
            | Database["public"]["Enums"]["gtab_business_type"]
            | null
          city?: string | null
          competitive_advantage?: string | null
          computers_cost?: number | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string
          current_step?: number | null
          education?: Database["public"]["Enums"]["gtab_education"]
          electricity_water_cost?: number | null
          electrification_cost?: number | null
          eligible_loan_amount?: number | null
          employee_count?: number | null
          expected_employment?: number | null
          expected_monthly_revenue?: number | null
          first_name?: string
          furniture_cost?: number | null
          gender?: Database["public"]["Enums"]["gtab_gender"]
          id?: string
          industry_other?: string | null
          industry_type?:
            | Database["public"]["Enums"]["gtab_industry_type"]
            | null
          land_cost?: number | null
          last_name?: string
          loan_purpose?: Database["public"]["Enums"]["gtab_loan_purpose"] | null
          loan_scheme?: Database["public"]["Enums"]["gtab_loan_scheme"] | null
          loan_scheme_other?: string | null
          machinery_installation_cost?: number | null
          margin_money?: number | null
          marketing_cost?: number | null
          middle_name?: string | null
          miscellaneous_cost?: number | null
          monthly_rent?: number | null
          other_initial_expenditure?: number | null
          pincode?: string | null
          plant_machinery?: Json | null
          project_report_inputs?: Json
          products_services?: string | null
          promoter_experience?: string | null
          racks_storage_cost?: number | null
          raw_material_cost?: number | null
          registration_type?:
            | Database["public"]["Enums"]["gtab_registration_type"]
            | null
          rejection_reason?: string | null
          repair_maintenance_cost?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_per_employee?: number | null
          semi_skilled_workers_count?: number | null
          semi_skilled_workers_salary?: number | null
          shed_building_cost?: number | null
          skilled_workers_count?: number | null
          skilled_workers_salary?: number | null
          social_category?: Database["public"]["Enums"]["gtab_social_category"]
          state?: string | null
          stationery_cost?: number | null
          status?: Database["public"]["Enums"]["gtab_application_status"] | null
          submitted_at?: string | null
          target_market?: string | null
          telephone_internet_cost?: number | null
          total_monthly_expenses?: number | null
          total_monthly_salary?: number | null
          total_project_cost?: number | null
          transport_cost?: number | null
          transportation_cost?: number | null
          type_of_business?: string | null
          updated_at?: string
          user_id?: string
          working_capital_period?: Database["public"]["Enums"]["gtab_working_capital_period"] | null
          working_capital_required?: number | null
          wages_count?: number | null
          wages_salary?: number | null
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          ai_recommendation: string | null
          amount: number
          approval_notes: string | null
          bank_formatted_report: string | null
          created_at: string
          credit_score: number | null
          decision_status:
            | Database["public"]["Enums"]["application_decision"]
            | null
          id: string
          loan_type_id: string
          address_line_1: string | null
          address_line_2: string | null
          business_description: string | null
          business_duration_months: number | null
          business_entity_name: string | null
          business_type:
            | Database["public"]["Enums"]["gtab_business_type"]
            | null
          city: string | null
          competitive_advantage: string | null
          computers_cost: number | null
          contact_email: string | null
          contact_mobile: string | null
          current_step: number | null
          education: Database["public"]["Enums"]["gtab_education"] | null
          electricity_water_cost: number | null
          electrification_cost: number | null
          eligible_loan_amount: number | null
          employee_count: number | null
          expected_employment: number | null
          expected_monthly_revenue: number | null
          first_name: string | null
          furniture_cost: number | null
          gender: Database["public"]["Enums"]["gtab_gender"] | null
          industry_other: string | null
          industry_type:
            | Database["public"]["Enums"]["gtab_industry_type"]
            | null
          land_cost: number | null
          last_name: string | null
          loan_purpose: Database["public"]["Enums"]["gtab_loan_purpose"] | null
          loan_scheme: Database["public"]["Enums"]["gtab_loan_scheme"] | null
          loan_scheme_other: string | null
          machinery_installation_cost: number | null
          margin_money: number | null
          marketing_cost: number | null
          middle_name: string | null
          miscellaneous_cost: number | null
          monthly_rent: number | null
          other_initial_expenditure: number | null
          pincode: string | null
          plant_machinery: Json | null
          products_services: string | null
          promoter_experience: string | null
          racks_storage_cost: number | null
          raw_material_cost: number | null
          registration_type:
            | Database["public"]["Enums"]["gtab_registration_type"]
            | null
          repair_maintenance_cost: number | null
          salary_per_employee: number | null
          semi_skilled_workers_count: number | null
          semi_skilled_workers_salary: number | null
          shed_building_cost: number | null
          skilled_workers_count: number | null
          skilled_workers_salary: number | null
          social_category: Database["public"]["Enums"]["gtab_social_category"] | null
          state: string | null
          stationery_cost: number | null
          submitted_at: string | null
          target_market: string | null
          telephone_internet_cost: number | null
          total_monthly_expenses: number | null
          total_monthly_salary: number | null
          total_project_cost: number | null
          transport_cost: number | null
          transportation_cost: number | null
          type_of_business: string | null
          wages_count: number | null
          wages_salary: number | null
          working_capital_period:
            | Database["public"]["Enums"]["gtab_working_capital_period"]
            | null
          working_capital_required: number | null
          project_report_inputs: Json
          dpr_api_payload: Json | null
          dpr_calculation_result: Json | null
          dpr_report_id: string | null
          dpr_download_url: string | null
          dpr_generated_at: string | null
          area_type: string | null
          implementing_agency: string | null
          is_second_loan: boolean | null
          preferred_bank: string | null
          district: string | null
          introduction_text: string | null
          market_aspects_text: string | null
          management_aspects_text: string | null
          technical_aspects_text: string | null
          financial_aspects_text: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_assessment: string | null
          status: string
          tenure_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          amount: number
          approval_notes?: string | null
          bank_formatted_report?: string | null
          created_at?: string
          credit_score?: number | null
          decision_status?:
            | Database["public"]["Enums"]["application_decision"]
            | null
          id?: string
          loan_type_id: string
          address_line_1?: string | null
          address_line_2?: string | null
          business_description?: string | null
          business_duration_months?: number | null
          business_entity_name?: string | null
          business_type?:
            | Database["public"]["Enums"]["gtab_business_type"]
            | null
          city?: string | null
          competitive_advantage?: string | null
          computers_cost?: number | null
          contact_email?: string | null
          contact_mobile?: string | null
          current_step?: number | null
          education?: Database["public"]["Enums"]["gtab_education"] | null
          electricity_water_cost?: number | null
          electrification_cost?: number | null
          eligible_loan_amount?: number | null
          employee_count?: number | null
          expected_employment?: number | null
          expected_monthly_revenue?: number | null
          first_name?: string | null
          furniture_cost?: number | null
          gender?: Database["public"]["Enums"]["gtab_gender"] | null
          industry_other?: string | null
          industry_type?:
            | Database["public"]["Enums"]["gtab_industry_type"]
            | null
          land_cost?: number | null
          last_name?: string | null
          loan_purpose?: Database["public"]["Enums"]["gtab_loan_purpose"] | null
          loan_scheme?: Database["public"]["Enums"]["gtab_loan_scheme"] | null
          loan_scheme_other?: string | null
          machinery_installation_cost?: number | null
          margin_money?: number | null
          marketing_cost?: number | null
          middle_name?: string | null
          miscellaneous_cost?: number | null
          monthly_rent?: number | null
          other_initial_expenditure?: number | null
          pincode?: string | null
          plant_machinery?: Json | null
          products_services?: string | null
          promoter_experience?: string | null
          racks_storage_cost?: number | null
          raw_material_cost?: number | null
          registration_type?:
            | Database["public"]["Enums"]["gtab_registration_type"]
            | null
          repair_maintenance_cost?: number | null
          salary_per_employee?: number | null
          semi_skilled_workers_count?: number | null
          semi_skilled_workers_salary?: number | null
          shed_building_cost?: number | null
          skilled_workers_count?: number | null
          skilled_workers_salary?: number | null
          social_category?:
            | Database["public"]["Enums"]["gtab_social_category"]
            | null
          state?: string | null
          stationery_cost?: number | null
          submitted_at?: string | null
          target_market?: string | null
          telephone_internet_cost?: number | null
          total_monthly_expenses?: number | null
          total_monthly_salary?: number | null
          total_project_cost?: number | null
          transport_cost?: number | null
          transportation_cost?: number | null
          type_of_business?: string | null
          wages_count?: number | null
          wages_salary?: number | null
          working_capital_period?:
            | Database["public"]["Enums"]["gtab_working_capital_period"]
            | null
          working_capital_required?: number | null
          project_report_inputs?: Json
          dpr_api_payload?: Json | null
          dpr_calculation_result?: Json | null
          dpr_report_id?: string | null
          dpr_download_url?: string | null
          dpr_generated_at?: string | null
          area_type?: string | null
          implementing_agency?: string | null
          is_second_loan?: boolean | null
          preferred_bank?: string | null
          district?: string | null
          introduction_text?: string | null
          market_aspects_text?: string | null
          management_aspects_text?: string | null
          technical_aspects_text?: string | null
          financial_aspects_text?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_assessment?: string | null
          status?: string
          tenure_months: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_recommendation?: string | null
          amount?: number
          approval_notes?: string | null
          bank_formatted_report?: string | null
          created_at?: string
          credit_score?: number | null
          decision_status?:
            | Database["public"]["Enums"]["application_decision"]
            | null
          id?: string
          loan_type_id?: string
          address_line_1?: string | null
          address_line_2?: string | null
          business_description?: string | null
          business_duration_months?: number | null
          business_entity_name?: string | null
          business_type?:
            | Database["public"]["Enums"]["gtab_business_type"]
            | null
          city?: string | null
          competitive_advantage?: string | null
          computers_cost?: number | null
          contact_email?: string | null
          contact_mobile?: string | null
          current_step?: number | null
          education?: Database["public"]["Enums"]["gtab_education"] | null
          electricity_water_cost?: number | null
          electrification_cost?: number | null
          eligible_loan_amount?: number | null
          employee_count?: number | null
          expected_employment?: number | null
          expected_monthly_revenue?: number | null
          first_name?: string | null
          furniture_cost?: number | null
          gender?: Database["public"]["Enums"]["gtab_gender"] | null
          industry_other?: string | null
          industry_type?:
            | Database["public"]["Enums"]["gtab_industry_type"]
            | null
          land_cost?: number | null
          last_name?: string | null
          loan_purpose?: Database["public"]["Enums"]["gtab_loan_purpose"] | null
          loan_scheme?: Database["public"]["Enums"]["gtab_loan_scheme"] | null
          loan_scheme_other?: string | null
          machinery_installation_cost?: number | null
          margin_money?: number | null
          marketing_cost?: number | null
          middle_name?: string | null
          miscellaneous_cost?: number | null
          monthly_rent?: number | null
          other_initial_expenditure?: number | null
          pincode?: string | null
          plant_machinery?: Json | null
          products_services?: string | null
          promoter_experience?: string | null
          racks_storage_cost?: number | null
          raw_material_cost?: number | null
          registration_type?:
            | Database["public"]["Enums"]["gtab_registration_type"]
            | null
          repair_maintenance_cost?: number | null
          salary_per_employee?: number | null
          semi_skilled_workers_count?: number | null
          semi_skilled_workers_salary?: number | null
          shed_building_cost?: number | null
          skilled_workers_count?: number | null
          skilled_workers_salary?: number | null
          social_category?:
            | Database["public"]["Enums"]["gtab_social_category"]
            | null
          state?: string | null
          stationery_cost?: number | null
          submitted_at?: string | null
          target_market?: string | null
          telephone_internet_cost?: number | null
          total_monthly_expenses?: number | null
          total_monthly_salary?: number | null
          total_project_cost?: number | null
          transport_cost?: number | null
          transportation_cost?: number | null
          type_of_business?: string | null
          wages_count?: number | null
          wages_salary?: number | null
          working_capital_period?:
            | Database["public"]["Enums"]["gtab_working_capital_period"]
            | null
          working_capital_required?: number | null
          project_report_inputs?: Json
          dpr_api_payload?: Json | null
          dpr_calculation_result?: Json | null
          dpr_report_id?: string | null
          dpr_download_url?: string | null
          dpr_generated_at?: string | null
          area_type?: string | null
          implementing_agency?: string | null
          is_second_loan?: boolean | null
          preferred_bank?: string | null
          district?: string | null
          introduction_text?: string | null
          market_aspects_text?: string | null
          management_aspects_text?: string | null
          technical_aspects_text?: string | null
          financial_aspects_text?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_assessment?: string | null
          status?: string
          tenure_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_type_documents: {
        Row: {
          created_at: string
          description: string | null
          document_name: string
          document_type: Database["public"]["Enums"]["loan_document_type"]
          id: string
          is_mandatory: boolean | null
          loan_type_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_name: string
          document_type: Database["public"]["Enums"]["loan_document_type"]
          id?: string
          is_mandatory?: boolean | null
          loan_type_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: Database["public"]["Enums"]["loan_document_type"]
          id?: string
          is_mandatory?: boolean | null
          loan_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_type_documents_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_types: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          interest_rate: number
          max_amount: number
          min_amount: number
          name: string
          tenure_months_max: number
          tenure_months_min: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          interest_rate?: number
          max_amount?: number
          min_amount?: number
          name: string
          tenure_months_max?: number
          tenure_months_min?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          interest_rate?: number
          max_amount?: number
          min_amount?: number
          name?: string
          tenure_months_max?: number
          tenure_months_min?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          business_type: string | null
          client_id: string | null
          collateral_details: string | null
          created_at: string
          document_url: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          client_id?: string | null
          collateral_details?: string | null
          created_at?: string
          document_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_type?: string | null
          client_id?: string | null
          collateral_details?: string | null
          created_at?: string
          document_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_loan_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: Database["public"]["Enums"]["loan_document_type"]
          file_size: number | null
          file_url: string
          id: string
          loan_application_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: Database["public"]["Enums"]["loan_document_type"]
          file_size?: number | null
          file_url: string
          id?: string
          loan_application_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: Database["public"]["Enums"]["loan_document_type"]
          file_size?: number | null
          file_url?: string
          id?: string
          loan_application_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_loan_documents_loan_application_id_fkey"
            columns: ["loan_application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      upsert_user_role_from_metadata: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "credit_analyst" | "consultant"
      application_decision:
        | "pending"
        | "under_review"
        | "documents_required"
        | "approved"
        | "rejected"
        | "disbursed"
      document_status: "pending" | "verified" | "rejected" | "reupload_required"
      gtab_application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "disbursed"
      gtab_business_type: "new_business" | "existing_business"
      gtab_education: "post_graduate" | "graduate" | "plus_two" | "tenth"
      gtab_gender: "male" | "female" | "undisclosed"
      gtab_industry_type:
        | "manufacturing"
        | "service"
        | "trading"
        | "agriculture"
        | "others"
      gtab_loan_purpose:
        | "term_loan"
        | "working_capital"
        | "term_and_working_capital"
      gtab_loan_scheme: "mudra" | "mudra_shishu" | "mudra_kishor" | "mudra_tarun" | "mudra_tarunplus" | "pmegp" | "cgtmse" | "normal_msme" | "other_scheme"
      gtab_registration_type:
        | "proprietorship"
        | "partnership"
        | "llp"
        | "private_limited"
        | "opc"
        | "huf"
        | "cooperative"
        | "trust"
      gtab_social_category:
        | "general"
        | "obc"
        | "minority"
        | "sc"
        | "st"
        | "undisclosed"
        | "women"
        | "ex_serviceman"
        | "pwd"
      gtab_working_capital_period: "monthly" | "annual"
      loan_document_type:
        | "pan_card"
        | "aadhaar_card"
        | "voter_id"
        | "passport"
        | "driving_license"
        | "salary_slip"
        | "bank_statement"
        | "itr"
        | "form_16"
        | "business_registration"
        | "gst_certificate"
        | "balance_sheet"
        | "property_documents"
        | "land_records"
        | "gold_valuation"
        | "vehicle_rc"
        | "employment_letter"
        | "address_proof"
        | "photo"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "credit_analyst", "consultant"],
      application_decision: [
        "pending",
        "under_review",
        "documents_required",
        "approved",
        "rejected",
        "disbursed",
      ],
      document_status: ["pending", "verified", "rejected", "reupload_required"],
      gtab_application_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "disbursed",
      ],
      gtab_business_type: ["new_business", "existing_business"],
      gtab_education: ["post_graduate", "graduate", "plus_two", "tenth"],
      gtab_gender: ["male", "female", "undisclosed"],
      gtab_industry_type: [
        "manufacturing",
        "service",
        "trading",
        "agriculture",
        "others",
      ],
      gtab_loan_purpose: [
        "term_loan",
        "working_capital",
        "term_and_working_capital",
      ],
      gtab_loan_scheme: ["mudra", "mudra_shishu", "mudra_kishor", "mudra_tarun", "mudra_tarunplus", "pmegp", "cgtmse", "normal_msme", "other_scheme"],
      gtab_registration_type: [
        "proprietorship",
        "partnership",
        "llp",
        "private_limited",
        "opc",
        "huf",
        "cooperative",
        "trust",
      ],
      gtab_social_category: [
        "general",
        "obc",
        "minority",
        "sc",
        "st",
        "undisclosed",
        "women",
        "ex_serviceman",
        "pwd",
      ],
      gtab_working_capital_period: ["monthly", "annual"],
      loan_document_type: [
        "pan_card",
        "aadhaar_card",
        "voter_id",
        "passport",
        "driving_license",
        "salary_slip",
        "bank_statement",
        "itr",
        "form_16",
        "business_registration",
        "gst_certificate",
        "balance_sheet",
        "property_documents",
        "land_records",
        "gold_valuation",
        "vehicle_rc",
        "employment_letter",
        "address_proof",
        "photo",
        "other",
      ],
    },
  },
} as const
